import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { computeSavingsBalance, computeWalletBalance } from "@/lib/transactions";
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
 * End-to-end integration tests for the core KidCoin loops, hitting the real
 * Supabase project with RLS enforced as each role.
 *
 * Coverage (live schema):
 *  - signup trigger creates household + parent role for a metadata-less user
 *  - child created via admin metadata path (mirrors createChild server fn)
 *  - parent assigns a task (child_id / created_by_parent_id)
 *  - child submits the task
 *  - approve_task_and_pay → ONE task_reward transaction, status approved + reviewed_at
 *  - re-approval does not double-pay (RPC raises: task no longer 'submitted')
 *  - savings split: with savings_percentage set, approval writes
 *    task_reward / wallet_debit / savings_credit and keeps the cached balance in sync
 */

let parent: AdHocUser;
let child: ChildUser;
let householdId: string;
let taskId: string;

beforeAll(async () => {
  parent = await createAdHocUser("e2e-parent");
  householdId = await householdOf(parent.userId);
  child = await createChildUser("e2e", householdId);
});

afterAll(async () => {
  if (child?.userId) await deleteUser(child.userId);
  if (parent?.userId) await deleteUser(parent.userId);
  if (householdId) await purgeHousehold(householdId);
});

describe("Parent/Child core loop", () => {
  it("signup trigger created a household + parent role", async () => {
    const sb = userClient(parent.accessToken);
    const { data: roles, error } = await sb
      .from("user_roles")
      .select("role, household_id")
      .eq("user_id", parent.userId);
    expect(error).toBeNull();
    expect(roles).toHaveLength(1);
    expect(roles![0].role).toBe("parent");
    expect(roles![0].household_id).toBe(householdId);

    // Parent can read their own household row under RLS
    const { data: hh } = await sb.from("households").select("id").eq("id", householdId);
    expect(hh).toHaveLength(1);
  });

  it("child trigger created role + profile; child can read own profile under RLS", async () => {
    const sb = userClient(child.accessToken);
    const { data: profile, error } = await sb
      .from("child_profiles")
      .select("id, household_id, display_name, current_balance")
      .eq("user_id", child.userId)
      .single();
    expect(error).toBeNull();
    expect(profile?.id).toBe(child.childProfileId);
    expect(profile?.household_id).toBe(householdId);
    expect(profile?.current_balance).toBe(0);
  });

  it("parent assigns a task to the child under RLS", async () => {
    const sb = userClient(parent.accessToken);
    const { data: task, error } = await sb
      .from("tasks")
      .insert({
        household_id: householdId,
        child_id: child.childProfileId,
        title: "לסדר את החדר",
        reward_amount: 7,
        created_by_parent_id: parent.userId,
      })
      .select("id, status")
      .single();
    expect(error).toBeNull();
    expect(task?.status).toBe("assigned");
    taskId = task!.id;
  });

  it("child submits the task under RLS", async () => {
    const sb = userClient(child.accessToken);
    const { data, error } = await sb
      .from("tasks")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", taskId)
      .select("status")
      .single();
    expect(error).toBeNull();
    expect(data?.status).toBe("submitted");
  });

  it("approve_task_and_pay creates exactly ONE task_reward transaction (no savings settings)", async () => {
    const sb = userClient(parent.accessToken);
    const { data, error } = await sb.rpc("approve_task_and_pay", { p_task_id: taskId });
    expect(error).toBeNull();
    expect(data).toBe(true);

    // No household_settings row yet → no savings split → exactly one tx
    const { data: txs, error: txErr } = await admin
      .from("transactions")
      .select("id, amount, type")
      .eq("reference_task_id", taskId);
    expect(txErr).toBeNull();
    expect(txs).toHaveLength(1);
    expect(txs![0].amount).toBe(7);
    expect(txs![0].type).toBe("task_reward");

    // Task moved to approved with reviewed_at stamped
    const { data: t } = await admin
      .from("tasks")
      .select("status, reviewed_at")
      .eq("id", taskId)
      .single();
    expect(t?.status).toBe("approved");
    expect(t?.reviewed_at).toBeTruthy();

    // Cached wallet balance mirrors the ledger
    const { data: profile } = await admin
      .from("child_profiles")
      .select("current_balance")
      .eq("id", child.childProfileId)
      .single();
    expect(profile?.current_balance).toBe(7);
  });

  it("re-approving does not double-pay (task is no longer 'submitted')", async () => {
    const sb = userClient(parent.accessToken);
    const { error } = await sb.rpc("approve_task_and_pay", { p_task_id: taskId });
    // The RPC raises 'Task not found or not in submitted state'
    expect(error).not.toBeNull();

    const { data: txs } = await admin
      .from("transactions")
      .select("id")
      .eq("reference_task_id", taskId);
    expect(txs).toHaveLength(1);

    const { data: profile } = await admin
      .from("child_profiles")
      .select("current_balance")
      .eq("id", child.childProfileId)
      .single();
    expect(profile?.current_balance).toBe(7);
  });

  it("approval applies the savings split when savings_percentage is set", async () => {
    // Parent sets a 20% savings rate (household_settings RLS: own household)
    const sb = userClient(parent.accessToken);
    const { error: settingsErr } = await sb
      .from("household_settings")
      .upsert(
        { household_id: householdId, savings_percentage: 20 },
        { onConflict: "household_id" },
      );
    expect(settingsErr).toBeNull();

    // New task worth 10 → expected split: floor(10 * 20%) = 2
    const { data: task, error: taskErr } = await sb
      .from("tasks")
      .insert({
        household_id: householdId,
        child_id: child.childProfileId,
        title: "להוציא את הזבל",
        reward_amount: 10,
        created_by_parent_id: parent.userId,
      })
      .select("id")
      .single();
    expect(taskErr).toBeNull();
    const savingsTaskId = task!.id;

    await userClient(child.accessToken)
      .from("tasks")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", savingsTaskId);

    const { data: approved, error: rpcErr } = await sb.rpc("approve_task_and_pay", {
      p_task_id: savingsTaskId,
    });
    expect(rpcErr).toBeNull();
    expect(approved).toBe(true);

    // Three ledger rows for this task: +10 reward, -2 wallet_debit, +2 savings_credit
    const { data: txs } = await admin
      .from("transactions")
      .select("amount, type")
      .eq("reference_task_id", savingsTaskId);
    expect(txs).toHaveLength(3);
    const byType = Object.fromEntries((txs ?? []).map((t) => [t.type, t.amount]));
    expect(byType.task_reward).toBe(10);
    expect(byType.wallet_debit).toBe(-2);
    expect(byType.savings_credit).toBe(2);

    // Derived balances across the whole ledger: wallet 7 + 10 - 2 = 15, savings 2
    const { data: allTxs } = await admin
      .from("transactions")
      .select("amount, type")
      .eq("child_id", child.childProfileId);
    expect(computeWalletBalance(allTxs ?? [])).toBe(15);
    expect(computeSavingsBalance(allTxs ?? [])).toBe(2);

    // Cached balance stays in sync with the derived wallet balance
    const { data: profile } = await admin
      .from("child_profiles")
      .select("current_balance")
      .eq("id", child.childProfileId)
      .single();
    expect(profile?.current_balance).toBe(15);
  });
});
