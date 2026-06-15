import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  createAdHocUser,
  createChildUser,
  deleteUser,
  householdOf,
  purgeHousehold,
  userClient,
  type AdHocUser,
  type ChildUser,
} from "../helpers/supabase";

/**
 * Covers the birthdate flow added in 20260612120000_add_child_birthdate:
 *  - handle_new_user copies user_metadata.birthdate into child_profiles
 *  - malformed birthdate does NOT block signup (clamped to NULL)
 *  - set_child_birthdate: household parent only, range-validated
 */

const BIRTHDATE = "2018-03-15";

let parent: AdHocUser;
let otherParent: AdHocUser;
let child: ChildUser;
let householdId: string;
let otherHouseholdId: string;

beforeAll(async () => {
  parent = await createAdHocUser("bd-parent");
  otherParent = await createAdHocUser("bd-otherparent");
  householdId = await householdOf(parent.userId);
  otherHouseholdId = await householdOf(otherParent.userId);
  child = await createChildUser("bd", householdId, BIRTHDATE);
});

afterAll(async () => {
  if (child?.userId) await deleteUser(child.userId);
  for (const u of [parent, otherParent]) {
    if (u?.userId) await deleteUser(u.userId);
  }
  if (householdId) await purgeHousehold(householdId);
  if (otherHouseholdId) await purgeHousehold(otherHouseholdId);
});

describe("handle_new_user birthdate", () => {
  it("copies birthdate from user_metadata into child_profiles", async () => {
    const { data } = await admin
      .from("child_profiles")
      .select("birthdate")
      .eq("id", child.childProfileId)
      .single();
    expect(data?.birthdate).toBe(BIRTHDATE);
  });

  it("does not block signup on malformed birthdate (clamped to NULL)", async () => {
    const malformed = await createChildUser("bd-malformed", householdId, "not-a-date");
    const { data } = await admin
      .from("child_profiles")
      .select("birthdate")
      .eq("id", malformed.childProfileId)
      .single();
    expect(data?.birthdate).toBeNull();
    await deleteUser(malformed.userId);
  });
});

describe("set_child_birthdate", () => {
  it("lets a household parent update the birthdate", async () => {
    const sb = userClient(parent.accessToken);
    const { data, error } = await sb.rpc("set_child_birthdate", {
      _child_id: child.childProfileId,
      _birthdate: "2013-09-01",
    });
    expect(error).toBeNull();
    expect((data as Record<string, unknown> | null)?.success).toBe(true);

    const { data: row } = await admin
      .from("child_profiles")
      .select("birthdate")
      .eq("id", child.childProfileId)
      .single();
    expect(row?.birthdate).toBe("2013-09-01");
  });

  it("rejects the child itself", async () => {
    const sb = userClient(child.accessToken);
    const { data } = await sb.rpc("set_child_birthdate", {
      _child_id: child.childProfileId,
      _birthdate: "2010-01-01",
    });
    expect((data as Record<string, unknown> | null)?.error).toBeTruthy();
  });

  it("rejects a parent from another household", async () => {
    const sb = userClient(otherParent.accessToken);
    const { data } = await sb.rpc("set_child_birthdate", {
      _child_id: child.childProfileId,
      _birthdate: "2010-01-01",
    });
    expect((data as Record<string, unknown> | null)?.error).toBeTruthy();
  });

  it("rejects out-of-range dates", async () => {
    const sb = userClient(parent.accessToken);
    const { data: tooOld } = await sb.rpc("set_child_birthdate", {
      _child_id: child.childProfileId,
      _birthdate: "1999-12-31",
    });
    expect((tooOld as Record<string, unknown> | null)?.error).toBeTruthy();

    const { data: future } = await sb.rpc("set_child_birthdate", {
      _child_id: child.childProfileId,
      _birthdate: "2030-01-01",
    });
    expect((future as Record<string, unknown> | null)?.error).toBeTruthy();

    // Unchanged after both rejections
    const { data: row } = await admin
      .from("child_profiles")
      .select("birthdate")
      .eq("id", child.childProfileId)
      .single();
    expect(row?.birthdate).toBe("2013-09-01");
  });
});
