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
 * AI tutors: parents create `tutors`, children start `tutor_sessions` with
 * them. No money is involved (no new transaction type), so these tests only
 * cover RLS-scoped CRUD and cross-household isolation.
 */

let parentA: AdHocUser;
let parentB: AdHocUser;
let childA: ChildUser;
let childB: ChildUser;

let householdA: string;
let householdB: string;
let tutorA: string; // belongs to household A

async function createTutor(parent: AdHocUser, householdId: string) {
  const sb = userClient(parent.accessToken);
  const { data, error } = await sb
    .from("tutors")
    .insert({
      household_id: householdId,
      created_by: parent.userId,
      name: `tutor in ${householdId.slice(0, 8)}`,
      subject: "אנגלית",
      topic: "שיחון יומיומי",
      personality: "friendly",
      voice_id: "test-voice-id",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data!.id;
}

beforeAll(async () => {
  parentA = await createAdHocUser("tutor-parentA");
  parentB = await createAdHocUser("tutor-parentB");
  householdA = await householdOf(parentA.userId);
  householdB = await householdOf(parentB.userId);
  childA = await createChildUser("tutor-childA", householdA);
  childB = await createChildUser("tutor-childB", householdB);

  tutorA = await createTutor(parentA, householdA);
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

describe("tutors: RLS", () => {
  it("a household parent can create a tutor", async () => {
    expect(tutorA).toBeTruthy();
  });

  it("a child in the same household can read the tutor", async () => {
    const sb = userClient(childA.accessToken);
    const { data, error } = await sb.from("tutors").select("id").eq("id", tutorA);
    expect(error).toBeNull();
    expect((data ?? []).map((t) => t.id)).toEqual([tutorA]);
  });

  it("a child cannot create a tutor", async () => {
    const sb = userClient(childA.accessToken);
    const { error } = await sb.from("tutors").insert({
      household_id: householdA,
      created_by: childA.userId,
      name: "child-made tutor",
      subject: "מתמטיקה",
      topic: "חיבור וחיסור",
      personality: "friendly",
      voice_id: "test-voice-id",
    });
    expect(error).not.toBeNull();
  });

  it("parentB cannot SELECT a tutor from householdA", async () => {
    const sb = userClient(parentB.accessToken);
    const { data, error } = await sb.from("tutors").select("id").eq("id", tutorA);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("childB cannot SELECT a tutor from householdA", async () => {
    const sb = userClient(childB.accessToken);
    const { data, error } = await sb.from("tutors").select("id").eq("id", tutorA);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("parentB cannot INSERT a tutor into householdA", async () => {
    const sb = userClient(parentB.accessToken);
    const { error } = await sb.from("tutors").insert({
      household_id: householdA,
      created_by: parentB.userId,
      name: "injected by B",
      subject: "מתמטיקה",
      topic: "חיבור וחיסור",
      personality: "friendly",
      voice_id: "test-voice-id",
    });
    expect(error).not.toBeNull();
  });

  it("parentA cannot UPDATE a tutor from householdB", async () => {
    const tutorB = await createTutor(parentB, householdB);
    const sb = userClient(parentA.accessToken);
    const { data, error } = await sb
      .from("tutors")
      .update({ name: "hacked by A" })
      .eq("id", tutorB)
      .select("id");
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);

    const { data: row } = await admin.from("tutors").select("name").eq("id", tutorB).single();
    expect(row?.name).not.toBe("hacked by A");
  });
});

describe("tutor_sessions: RLS", () => {
  it("childA can insert their own session", async () => {
    const sb = userClient(childA.accessToken);
    const { data, error } = await sb
      .from("tutor_sessions")
      .insert({
        household_id: householdA,
        tutor_id: tutorA,
        child_id: childA.childProfileId,
        status: "active",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
  });

  it("childA can update their own session (end it)", async () => {
    const sb = userClient(childA.accessToken);
    const { data: created } = await sb
      .from("tutor_sessions")
      .insert({
        household_id: householdA,
        tutor_id: tutorA,
        child_id: childA.childProfileId,
        status: "active",
      })
      .select("id")
      .single();

    const { data, error } = await sb
      .from("tutor_sessions")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        transcript: [{ role: "user", content: "hi" }],
        transcript_source: "client",
      })
      .eq("id", created!.id)
      .select("status");
    expect(error).toBeNull();
    expect(data?.[0]?.status).toBe("completed");
  });

  it("a parent can read sessions for their household's children", async () => {
    const sb = userClient(childA.accessToken);
    const { data: created } = await sb
      .from("tutor_sessions")
      .insert({
        household_id: householdA,
        tutor_id: tutorA,
        child_id: childA.childProfileId,
        status: "active",
      })
      .select("id")
      .single();

    const parentSb = userClient(parentA.accessToken);
    const { data, error } = await parentSb
      .from("tutor_sessions")
      .select("id")
      .eq("id", created!.id);
    expect(error).toBeNull();
    expect((data ?? []).map((s) => s.id)).toEqual([created!.id]);
  });

  it("a parent can insert a session for their own child (parent test-session flow)", async () => {
    const sb = userClient(parentA.accessToken);
    const { data, error } = await sb
      .from("tutor_sessions")
      .insert({
        household_id: householdA,
        tutor_id: tutorA,
        child_id: childA.childProfileId,
        status: "active",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
  });

  it("childB cannot read a session belonging to householdA", async () => {
    const sb = userClient(childA.accessToken);
    const { data: created } = await sb
      .from("tutor_sessions")
      .insert({
        household_id: householdA,
        tutor_id: tutorA,
        child_id: childA.childProfileId,
        status: "active",
      })
      .select("id")
      .single();

    const otherSb = userClient(childB.accessToken);
    const { data, error } = await otherSb.from("tutor_sessions").select("id").eq("id", created!.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("childB cannot insert a session into householdA", async () => {
    const sb = userClient(childB.accessToken);
    const { error } = await sb.from("tutor_sessions").insert({
      household_id: householdA,
      tutor_id: tutorA,
      child_id: childA.childProfileId,
      status: "active",
    });
    expect(error).not.toBeNull();
  });
});
