import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/integrations/supabase/types";
import {
  admin,
  assertWalletInvariant,
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
 * Caller authorization for approve_task_and_pay
 * (supabase/migrations/20261019130000_approve_task_caller_check.sql).
 *
 * Before that fix the SECURITY DEFINER function paid any 'submitted' task for any
 * caller — including anon — so a child could submit their own task, raise its
 * reward via the broad `tasks: update own household` policy, and approve it.
 * Now only a parent of the task's household may approve; everyone else gets an
 * error and the ledger, task status and cached balance stay untouched. The reward
 * inflation itself is also closed off since 20261027070954_harden_child_write_policies
 * (a child may only move their own task assigned -> submitted), asserted below.
 */

const anon = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

let parent: AdHocUser;
let otherParent: AdHocUser;
let child: ChildUser;
let household: string;
let otherHousehold: string;
let taskId: string;

async function taskTxCount(): Promise<number> {
  const { data, error } = await admin
    .from("transactions")
    .select("id")
    .eq("reference_task_id", taskId);
  expect(error).toBeNull();
  return (data ?? []).length;
}

async function readTask() {
  const { data, error } = await admin
    .from("tasks")
    .select("status, reward_amount")
    .eq("id", taskId)
    .single();
  expect(error).toBeNull();
  return data!;
}

async function currentBalance(): Promise<number> {
  const { data, error } = await admin
    .from("child_profiles")
    .select("current_balance")
    .eq("id", child.childProfileId)
    .single();
  expect(error).toBeNull();
  return data!.current_balance ?? 0;
}

/** Every rejected attempt must leave no trace: no rows, still submitted, balance 0. */
async function expectUnpaid(): Promise<void> {
  expect(await taskTxCount()).toBe(0);
  expect((await readTask()).status).toBe("submitted");
  expect(await currentBalance()).toBe(0);
}

beforeAll(async () => {
  parent = await createAdHocUser("approve-auth-parent");
  otherParent = await createAdHocUser("approve-auth-other");
  household = await householdOf(parent.userId);
  otherHousehold = await householdOf(otherParent.userId);
  child = await createChildUser("approve-auth-child", household);

  const { data, error } = await userClient(parent.accessToken)
    .from("tasks")
    .insert({
      household_id: household,
      child_id: child.childProfileId,
      title: "סידור החדר",
      reward_amount: 5,
      created_by_parent_id: parent.userId,
    })
    .select("id")
    .single();
  expect(error).toBeNull();
  taskId = data!.id;
});

afterAll(async () => {
  if (child?.userId) await deleteUser(child.userId);
  for (const u of [parent, otherParent]) {
    if (u?.userId) await deleteUser(u.userId);
  }
  if (household) await purgeHousehold(household);
  if (otherHousehold) await purgeHousehold(otherHousehold);
});

describe("approve_task_and_pay caller authorization", () => {
  it("a child cannot approve their own submitted task, even after inflating the reward", async () => {
    const sb = userClient(child.accessToken);
    // The child cannot inflate the reward: the tasks_guard_child_update trigger rejects it…
    const { error: inflateErr } = await sb
      .from("tasks")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        reward_amount: 1000,
      })
      .eq("id", taskId);
    expect(inflateErr?.code).toBe("42501");
    expect((await readTask()).reward_amount).toBe(5);

    // …but can submit its own task (status only)…
    const { error: submitErr } = await sb
      .from("tasks")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", taskId);
    expect(submitErr).toBeNull();

    // …and still cannot pay it out.
    const { data, error } = await sb.rpc("approve_task_and_pay", { p_task_id: taskId });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
    await expectUnpaid();
  });

  it("a parent from another household cannot approve it", async () => {
    const { error } = await userClient(otherParent.accessToken).rpc("approve_task_and_pay", {
      p_task_id: taskId,
    });
    expect(error).not.toBeNull();
    await expectUnpaid();
  });

  it("an unauthenticated (anon) caller cannot execute it", async () => {
    const { error } = await anon.rpc("approve_task_and_pay", { p_task_id: taskId });
    expect(error).not.toBeNull();
    await expectUnpaid();
  });

  it("the household parent still approves and pays the (visible) reward", async () => {
    // Restore a sane reward first — the parent reviews the amount before approving.
    const { error: fixErr } = await userClient(parent.accessToken)
      .from("tasks")
      .update({ reward_amount: 5 })
      .eq("id", taskId);
    expect(fixErr).toBeNull();

    const { data, error } = await userClient(parent.accessToken).rpc("approve_task_and_pay", {
      p_task_id: taskId,
    });
    expect(error).toBeNull();
    expect(data).toBe(true);

    expect((await readTask()).status).toBe("approved");
    expect(await taskTxCount()).toBe(1); // no household_settings row → no savings split
    expect(await currentBalance()).toBe(5);
    await assertWalletInvariant(child.childProfileId);
  });
});
