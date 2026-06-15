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
 * Verifies every task status transition is persisted correctly end-to-end:
 *   assigned → submitted → approved   (happy path, via approve_task_and_pay)
 *   assigned → submitted → rejected   (parent rejects a submission)
 *
 * For each transition we re-read the row from the DB (admin client, bypassing
 * RLS) and assert both the `status` column AND the matching timestamp column
 * (submitted_at / reviewed_at) reflect reality.
 */

let parent: AdHocUser;
let child: ChildUser;
let householdId: string;

async function readTask(taskId: string) {
  const { data, error } = await admin
    .from("tasks")
    .select("status, submitted_at, reviewed_at")
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
      child_id: child.childProfileId,
      title: "משימת בדיקה",
      reward_amount: 5,
      created_by_parent_id: parent.userId,
    })
    .select("id")
    .single();
  expect(error).toBeNull();
  return data!.id;
}

async function submitTask(taskId: string): Promise<void> {
  const { error } = await userClient(child.accessToken)
    .from("tasks")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", taskId);
  expect(error).toBeNull();
}

beforeAll(async () => {
  parent = await createAdHocUser("e2e-status-parent");
  householdId = await householdOf(parent.userId);
  child = await createChildUser("e2e-status", householdId);
});

afterAll(async () => {
  if (child?.userId) await deleteUser(child.userId);
  if (parent?.userId) await deleteUser(parent.userId);
  if (householdId) await purgeHousehold(householdId);
});

describe("Task status transitions persist correctly", () => {
  it("new task starts at 'assigned' with no submitted/reviewed timestamps", async () => {
    const taskId = await createTask();
    const t = await readTask(taskId);
    expect(t.status).toBe("assigned");
    expect(t.submitted_at).toBeNull();
    expect(t.reviewed_at).toBeNull();
  });

  it("assigned → submitted: status + submitted_at persist for child action", async () => {
    const taskId = await createTask();
    await submitTask(taskId);

    const t = await readTask(taskId);
    expect(t.status).toBe("submitted");
    expect(t.submitted_at).not.toBeNull();
    expect(t.reviewed_at).toBeNull();
  });

  it("submitted → approved: approve_task_and_pay persists status + reviewed_at + transaction", async () => {
    const taskId = await createTask();
    await submitTask(taskId);

    const { data, error } = await userClient(parent.accessToken).rpc("approve_task_and_pay", {
      p_task_id: taskId,
    });
    expect(error).toBeNull();
    expect(data).toBe(true);

    const t = await readTask(taskId);
    expect(t.status).toBe("approved");
    expect(t.submitted_at).not.toBeNull();
    expect(t.reviewed_at).not.toBeNull();

    // Exactly one reward transaction (no household_settings row → no split)
    const { data: txs } = await admin
      .from("transactions")
      .select("id, amount, type")
      .eq("reference_task_id", taskId);
    expect(txs).toHaveLength(1);
    expect(txs![0].type).toBe("task_reward");
    expect(txs![0].amount).toBe(5);
  });

  it("submitted → rejected: parent update persists 'rejected' and creates NO transaction", async () => {
    const taskId = await createTask();
    await submitTask(taskId);

    const sb = userClient(parent.accessToken);
    const { error } = await sb
      .from("tasks")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", taskId);
    expect(error).toBeNull();

    const t = await readTask(taskId);
    expect(t.status).toBe("rejected");
    expect(t.submitted_at).not.toBeNull();
    expect(t.reviewed_at).not.toBeNull();

    const { data: txs } = await admin
      .from("transactions")
      .select("id")
      .eq("reference_task_id", taskId);
    expect(txs).toHaveLength(0);
  });

  it("approve_task_and_pay refuses a task that is still 'assigned'", async () => {
    const taskId = await createTask();

    const { error } = await userClient(parent.accessToken).rpc("approve_task_and_pay", {
      p_task_id: taskId,
    });
    // The RPC raises 'Task not found or not in submitted state'
    expect(error).not.toBeNull();

    const t = await readTask(taskId);
    expect(t.status).toBe("assigned");
    expect(t.reviewed_at).toBeNull();
  });

  it("full lifecycle on a single task: assigned → submitted → approved persists at each step", async () => {
    const taskId = await createTask();

    let t = await readTask(taskId);
    expect(t.status).toBe("assigned");

    await submitTask(taskId);
    t = await readTask(taskId);
    expect(t.status).toBe("submitted");
    expect(t.submitted_at).not.toBeNull();

    const { data } = await userClient(parent.accessToken).rpc("approve_task_and_pay", {
      p_task_id: taskId,
    });
    expect(data).toBe(true);

    t = await readTask(taskId);
    expect(t.status).toBe("approved");
    expect(t.reviewed_at).not.toBeNull();
    // review happened at-or-after submission
    expect(new Date(t.reviewed_at!).getTime()).toBeGreaterThanOrEqual(
      new Date(t.submitted_at!).getTime(),
    );
  });
});
