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
 * Verifies every task status transition is persisted correctly end-to-end:
 *   assigned → submitted → approved   (happy path, via approve_task RPC)
 *   assigned → submitted → rejected   (parent rejects a submission)
 *
 * For each transition we re-read the row from the DB (admin client, bypassing
 * RLS) and assert both the `status` column AND the matching timestamp column
 * (submitted_at / approved_at) reflect reality.
 */

let parent: AdHocUser;
let child: AdHocUser;
let householdId: string;
let childProfileId: string;

async function readTask(taskId: string) {
  const { data, error } = await admin
    .from("tasks")
    .select("status, submitted_at, approved_at, updated_at")
    .eq("id", taskId)
    .single();
  expect(error).toBeNull();
  return data!;
}

async function createTask(): Promise<string> {
  const sb = userClient(parent.accessToken);
  const { data, error } = await sb
    .from("tasks")
    .insert({
      household_id: householdId,
      child_profile_id: childProfileId,
      title: "משימת בדיקה",
      reward_amount: 5,
      created_by: parent.userId,
    })
    .select("id")
    .single();
  expect(error).toBeNull();
  return data!.id;
}

beforeAll(async () => {
  parent = await createAdHocUser("e2e-status-parent");
  child = await createAdHocUser("e2e-status-child");

  const sb = userClient(parent.accessToken);
  const { data: hh } = await sb
    .from("households")
    .insert({ name: "Status Family", created_by: parent.userId })
    .select("id")
    .single();
  householdId = hh!.id;

  await sb.from("user_roles").insert({
    user_id: parent.userId,
    role: "parent",
    household_id: householdId,
  });

  await admin.from("user_roles").insert({
    user_id: child.userId,
    role: "child",
    household_id: householdId,
  });
  const { data: profile } = await admin
    .from("child_profiles")
    .insert({
      user_id: child.userId,
      household_id: householdId,
      display_name: "ילד-סטטוס",
    })
    .select("id")
    .single();
  childProfileId = profile!.id;
});

afterAll(async () => {
  if (householdId) await purgeHousehold(householdId);
  if (parent?.userId) await deleteUser(parent.userId);
  if (child?.userId) await deleteUser(child.userId);
});

describe("Task status transitions persist correctly", () => {
  it("new task starts at 'assigned' with no submitted/approved timestamps", async () => {
    const taskId = await createTask();
    const t = await readTask(taskId);
    expect(t.status).toBe("assigned");
    expect(t.submitted_at).toBeNull();
    expect(t.approved_at).toBeNull();
  });

  it("assigned → submitted: status + submitted_at persist for child action", async () => {
    const taskId = await createTask();

    const sb = userClient(child.accessToken);
    const submittedAt = new Date().toISOString();
    const { error } = await sb
      .from("tasks")
      .update({ status: "submitted", submitted_at: submittedAt })
      .eq("id", taskId);
    expect(error).toBeNull();

    const t = await readTask(taskId);
    expect(t.status).toBe("submitted");
    expect(t.submitted_at).not.toBeNull();
    expect(t.approved_at).toBeNull();
  });

  it("submitted → approved: approve_task RPC persists status + approved_at + transaction", async () => {
    const taskId = await createTask();

    // Move to submitted (child)
    await userClient(child.accessToken)
      .from("tasks")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", taskId);

    // Approve (parent via RPC)
    const { data, error } = await userClient(parent.accessToken).rpc(
      "approve_task",
      { _task_id: taskId },
    );
    expect(error).toBeNull();
    expect((data as any)?.success).toBe(true);

    const t = await readTask(taskId);
    expect(t.status).toBe("approved");
    expect(t.submitted_at).not.toBeNull();
    expect(t.approved_at).not.toBeNull();

    // Exactly one reward transaction
    const { data: txs } = await admin
      .from("transactions")
      .select("id, amount, type")
      .eq("task_id", taskId);
    expect(txs).toHaveLength(1);
    expect(txs![0].type).toBe("reward_credit");
    expect(txs![0].amount).toBe(5);
  });

  it("submitted → rejected: parent update persists 'rejected' and creates NO transaction", async () => {
    const taskId = await createTask();

    await userClient(child.accessToken)
      .from("tasks")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", taskId);

    const sb = userClient(parent.accessToken);
    const { error } = await sb
      .from("tasks")
      .update({ status: "rejected" })
      .eq("id", taskId);
    expect(error).toBeNull();

    const t = await readTask(taskId);
    expect(t.status).toBe("rejected");
    expect(t.submitted_at).not.toBeNull();
    expect(t.approved_at).toBeNull();

    const { data: txs } = await admin
      .from("transactions")
      .select("id")
      .eq("task_id", taskId);
    expect(txs).toHaveLength(0);
  });

  it("approve_task refuses to transition a task that is still 'assigned'", async () => {
    const taskId = await createTask();

    const { data } = await userClient(parent.accessToken).rpc("approve_task", {
      _task_id: taskId,
    });
    expect((data as any)?.error).toBeTruthy();

    const t = await readTask(taskId);
    expect(t.status).toBe("assigned");
    expect(t.approved_at).toBeNull();
  });

  it("full lifecycle on a single task: assigned → submitted → approved persists at each step", async () => {
    const taskId = await createTask();

    let t = await readTask(taskId);
    expect(t.status).toBe("assigned");

    await userClient(child.accessToken)
      .from("tasks")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", taskId);
    t = await readTask(taskId);
    expect(t.status).toBe("submitted");
    expect(t.submitted_at).not.toBeNull();

    const { data } = await userClient(parent.accessToken).rpc("approve_task", {
      _task_id: taskId,
    });
    expect((data as any)?.success).toBe(true);

    t = await readTask(taskId);
    expect(t.status).toBe("approved");
    expect(t.approved_at).not.toBeNull();
    // updated_at advanced past submitted_at
    expect(new Date(t.updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(t.submitted_at!).getTime(),
    );
  });
});