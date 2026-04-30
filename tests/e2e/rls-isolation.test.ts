import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  createAdHocUser,
  deleteUser,
  purgeHousehold,
  userClient,
  type AdHocUser,
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
 */

let parentA: AdHocUser;
let childA: AdHocUser;
let parentB: AdHocUser;
let childB: AdHocUser;

let householdA: string;
let householdB: string;
let childProfileA: string;
let childProfileB: string;
let taskA: string; // belongs to household A
let taskB: string; // belongs to household B

async function setupHousehold(
  parent: AdHocUser,
  child: AdHocUser,
  name: string,
) {
  const sb = userClient(parent.accessToken);
  const { data: hh, error: hhErr } = await sb
    .from("households")
    .insert({ name, created_by: parent.userId })
    .select("id")
    .single();
  if (hhErr) throw hhErr;
  const householdId = hh!.id;

  const { error: prErr } = await sb.from("user_roles").insert({
    user_id: parent.userId,
    role: "parent",
    household_id: householdId,
  });
  if (prErr) throw prErr;

  // Add child via admin (mirrors createChild server fn)
  const { error: crErr } = await admin.from("user_roles").insert({
    user_id: child.userId,
    role: "child",
    household_id: householdId,
  });
  if (crErr) throw crErr;

  const { data: profile, error: profErr } = await admin
    .from("child_profiles")
    .insert({
      user_id: child.userId,
      household_id: householdId,
      display_name: `child-${name}`,
    })
    .select("id")
    .single();
  if (profErr) throw profErr;

  // Assign one task as the parent
  const { data: task, error: taskErr } = await sb
    .from("tasks")
    .insert({
      household_id: householdId,
      child_profile_id: profile!.id,
      title: `task in ${name}`,
      reward_amount: 5,
      created_by: parent.userId,
    })
    .select("id")
    .single();
  if (taskErr) throw taskErr;

  return { householdId, childProfileId: profile!.id, taskId: task!.id };
}

beforeAll(async () => {
  parentA = await createAdHocUser("rls-parentA");
  childA = await createAdHocUser("rls-childA");
  parentB = await createAdHocUser("rls-parentB");
  childB = await createAdHocUser("rls-childB");

  const a = await setupHousehold(parentA, childA, "HouseA");
  householdA = a.householdId;
  childProfileA = a.childProfileId;
  taskA = a.taskId;

  const b = await setupHousehold(parentB, childB, "HouseB");
  householdB = b.householdId;
  childProfileB = b.childProfileId;
  taskB = b.taskId;

  // Seed a transaction in household B (admin bypasses RLS, mirrors approve_task)
  const { error: txErr } = await admin.from("transactions").insert({
    household_id: householdB,
    child_profile_id: childProfileB,
    task_id: taskB,
    type: "reward_credit",
    amount: 5,
    created_by: parentB.userId,
    idempotency_key: `seed:${taskB}`,
  });
  if (txErr) throw txErr;
});

afterAll(async () => {
  if (householdA) await purgeHousehold(householdA);
  if (householdB) await purgeHousehold(householdB);
  for (const u of [parentA, childA, parentB, childB]) {
    if (u?.userId) await deleteUser(u.userId);
  }
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

  it("childA cannot SELECT tasks from householdB", async () => {
    const sb = userClient(childA.accessToken);
    const { data, error } = await sb.from("tasks").select("id").eq("id", taskB);
    expect(error).toBeNull();
    expect(data).toEqual([]);
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
    const { data: row } = await admin
      .from("tasks")
      .select("title")
      .eq("id", taskB)
      .single();
    expect(row?.title).toBe("task in HouseB");
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

    const { data: row } = await admin
      .from("tasks")
      .select("status")
      .eq("id", taskB)
      .single();
    expect(row?.status).toBe("assigned");
  });

  it("parentA cannot INSERT a task into householdB", async () => {
    const sb = userClient(parentA.accessToken);
    const { error } = await sb.from("tasks").insert({
      household_id: householdB,
      child_profile_id: childProfileB,
      title: "injected by A",
      reward_amount: 1,
      created_by: parentA.userId,
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

  it("approve_task RPC is rejected when called by a parent from another household", async () => {
    // Move taskB to 'submitted' as childB so it would be approvable by *its* parent
    const childBSb = userClient(childB.accessToken);
    const { error: subErr } = await childBSb
      .from("tasks")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", taskB);
    expect(subErr).toBeNull();

    // parentA tries to approve taskB
    const sb = userClient(parentA.accessToken);
    const { data } = await sb.rpc("approve_task", { _task_id: taskB });
    expect((data as any)?.error).toBeTruthy();
    expect((data as any)?.success).toBeUndefined();

    // No transaction was created by parentA's call — only the seed remains
    const { data: txs } = await admin
      .from("transactions")
      .select("id, idempotency_key")
      .eq("task_id", taskB);
    expect(txs).toHaveLength(1);
    expect(txs![0].idempotency_key).toBe(`seed:${taskB}`);
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
});