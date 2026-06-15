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
 * RLS isolation: a parent in household A must NOT be able to read or mutate
 * tasks/transactions belonging to household B, and a child in household B must
 * not see household A's data either.
 *
 * "Blocked by RLS" in PostgREST presents as one of:
 *  - SELECT  → empty rowset (no error, no rows)
 *  - INSERT  → error (RLS violation / 42501 / new row violates policy)
 *  - UPDATE  → no rows affected (zero-row update, no error)
 *
 * NOTE: approve_task_and_pay is SECURITY DEFINER and currently performs NO
 * caller authorization (any authenticated user who knows a submitted task's id
 * can trigger payment). That is a known gap in the DB function, not something
 * RLS can catch — tracked separately; no cross-household RPC assertion here
 * until the function validates the caller.
 */

let parentA: AdHocUser;
let parentB: AdHocUser;
let childA: ChildUser;
let childB: ChildUser;

let householdA: string;
let householdB: string;
let taskA: string; // belongs to household A
let taskB: string; // belongs to household B

async function createTask(parent: AdHocUser, householdId: string, childProfileId: string) {
  const sb = userClient(parent.accessToken);
  const { data, error } = await sb
    .from("tasks")
    .insert({
      household_id: householdId,
      child_id: childProfileId,
      title: `task in ${householdId.slice(0, 8)}`,
      reward_amount: 5,
      created_by_parent_id: parent.userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data!.id;
}

beforeAll(async () => {
  parentA = await createAdHocUser("rls-parentA");
  parentB = await createAdHocUser("rls-parentB");
  householdA = await householdOf(parentA.userId);
  householdB = await householdOf(parentB.userId);
  childA = await createChildUser("rls-childA", householdA);
  childB = await createChildUser("rls-childB", householdB);

  taskA = await createTask(parentA, householdA, childA.childProfileId);
  taskB = await createTask(parentB, householdB, childB.childProfileId);

  // Seed a transaction in household B (admin bypasses RLS, mirrors the RPCs)
  const { error: txErr } = await admin.from("transactions").insert({
    household_id: householdB,
    child_id: childB.childProfileId,
    reference_task_id: taskB,
    type: "task_reward",
    amount: 5,
  });
  if (txErr) throw txErr;
});

afterAll(async () => {
  for (const u of [childA, childB]) {
    if (u?.userId) await deleteUser(u.userId);
  }
  for (const u of [parentA, parentB]) {
    if (u?.userId) await deleteUser(u.userId);
  }
  if (householdA) await purgeHousehold(householdA);
  if (householdB) await purgeHousehold(householdB);
});

describe("RLS cross-household isolation", () => {
  it("parentA cannot SELECT tasks from householdB", async () => {
    const sb = userClient(parentA.accessToken);
    const { data, error } = await sb.from("tasks").select("id").eq("id", taskB);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("parentA cannot SELECT transactions from householdB", async () => {
    const sb = userClient(parentA.accessToken);
    const { data, error } = await sb
      .from("transactions")
      .select("id")
      .eq("household_id", householdB);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("parentA cannot SELECT child_profiles from householdB", async () => {
    const sb = userClient(parentA.accessToken);
    const { data, error } = await sb
      .from("child_profiles")
      .select("id")
      .eq("household_id", householdB);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("childA cannot SELECT tasks from householdB", async () => {
    const sb = userClient(childA.accessToken);
    const { data, error } = await sb.from("tasks").select("id").eq("id", taskB);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("childA can see own task but not the other household's", async () => {
    const sb = userClient(childA.accessToken);
    const { data } = await sb.from("tasks").select("id").in("id", [taskA, taskB]);
    expect((data ?? []).map((t) => t.id)).toEqual([taskA]);
  });

  it("parentA cannot UPDATE a task in householdB", async () => {
    const sb = userClient(parentA.accessToken);
    const { data, error } = await sb
      .from("tasks")
      .update({ title: "hacked by A" })
      .eq("id", taskB)
      .select("id");
    // RLS UPDATE silently affects zero rows
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);

    // Confirm the row is unchanged via admin
    const { data: row } = await admin.from("tasks").select("title").eq("id", taskB).single();
    expect(row?.title).not.toBe("hacked by A");
  });

  it("childA cannot UPDATE (submit) a task that belongs to childB", async () => {
    const sb = userClient(childA.accessToken);
    const { data, error } = await sb
      .from("tasks")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", taskB)
      .select("id, status");
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);

    const { data: row } = await admin.from("tasks").select("status").eq("id", taskB).single();
    expect(row?.status).toBe("assigned");
  });

  it("parentA cannot INSERT a task into householdB", async () => {
    const sb = userClient(parentA.accessToken);
    const { error } = await sb.from("tasks").insert({
      household_id: householdB,
      child_id: childB.childProfileId,
      title: "injected by A",
      reward_amount: 1,
      created_by_parent_id: parentA.userId,
    });
    // RLS INSERT raises an error (new row violates row-level security policy)
    expect(error).not.toBeNull();

    // Confirm no such task exists in B
    const { data: rows } = await admin
      .from("tasks")
      .select("id")
      .eq("household_id", householdB)
      .eq("title", "injected by A");
    expect(rows ?? []).toEqual([]);
  });

  it("parentA cannot INSERT a transaction directly (read-only ledger for clients)", async () => {
    const sb = userClient(parentA.accessToken);
    const { error } = await sb.from("transactions").insert({
      household_id: householdA,
      child_id: childA.childProfileId,
      type: "manual_adjustment",
      amount: 1000,
    });
    // transactions has no INSERT policy at all — even own-household inserts fail
    expect(error).not.toBeNull();
  });

  it("parentA cannot SELECT user_roles from householdB", async () => {
    const sb = userClient(parentA.accessToken);
    const { data, error } = await sb
      .from("user_roles")
      .select("user_id, role")
      .eq("household_id", householdB);
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });

  it("parentA cannot read or write householdB's settings", async () => {
    const sb = userClient(parentA.accessToken);
    const { data: settings, error: readErr } = await sb
      .from("household_settings")
      .select("id")
      .eq("household_id", householdB);
    expect(readErr).toBeNull();
    expect(settings ?? []).toEqual([]);

    const { error: writeErr } = await sb
      .from("household_settings")
      .upsert({ household_id: householdB, savings_percentage: 99 }, { onConflict: "household_id" });
    expect(writeErr).not.toBeNull();
  });
});
