import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
 * End-to-end coverage for the goal/savings RPCs added on top of the core
 * wallet ledger, hitting the real Supabase project with RLS enforced as
 * each role:
 *
 *  - deposit_to_goal: happy path, insufficient-wallet, exceeds-target,
 *    exact-target completion
 *  - deposit_to_savings: happy path, insufficient-wallet
 *  - deposit_savings_to_goal: happy path (wallet untouched), insufficient
 *    savings, exceeds-target
 *  - regression: a child funded ONLY via quiz_reward can deposit into a
 *    goal/savings (the wallet-balance formula in deposit_to_goal /
 *    deposit_to_savings used to omit quiz_reward from its type IN (...)
 *    check, producing a false "Insufficient wallet balance")
 *
 * No household_settings row is created in this file, so approve_task_and_pay
 * never applies a savings split — every approved task's reward_amount lands
 * in the wallet in full, keeping the funding math simple.
 */

let parent: AdHocUser;
let child: ChildUser;
let quizChild: ChildUser;
let householdId: string;

/** Fund `c`'s wallet by reward_amount via the proven assign/submit/approve loop. */
async function fundWallet(c: ChildUser, rewardAmount: number): Promise<void> {
  const parentSb = userClient(parent.accessToken);
  const { data: task, error: taskErr } = await parentSb
    .from("tasks")
    .insert({
      household_id: householdId,
      child_id: c.childProfileId,
      title: "מימון לבדיקה",
      reward_amount: rewardAmount,
      created_by_parent_id: parent.userId,
    })
    .select("id")
    .single();
  expect(taskErr).toBeNull();
  const taskId = task!.id;

  const { error: submitErr } = await userClient(c.accessToken)
    .from("tasks")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", taskId);
  expect(submitErr).toBeNull();

  const { data: approved, error: approveErr } = await parentSb.rpc("approve_task_and_pay", {
    p_task_id: taskId,
  });
  expect(approveErr).toBeNull();
  expect(approved).toBe(true);
}

interface GoalRow {
  id: string;
  status: string;
}

async function createGoal(
  c: ChildUser,
  title: string,
  targetAmount: number,
  cycleAmount: number,
): Promise<GoalRow> {
  const { data, error } = await userClient(parent.accessToken)
    .from("goals")
    .insert({
      household_id: householdId,
      child_id: c.childProfileId,
      title,
      target_amount: targetAmount,
      cycle_amount: cycleAmount,
      cycle_period: "week",
      created_by: parent.userId,
    })
    .select("id, status")
    .single();
  expect(error).toBeNull();
  return data!;
}

async function goalRow(goalId: string): Promise<GoalRow> {
  const { data, error } = await admin.from("goals").select("id, status").eq("id", goalId).single();
  expect(error).toBeNull();
  return data!;
}

async function goalTaggedTxs(goalId: string) {
  const { data, error } = await admin
    .from("transactions")
    .select("amount, type, goal_id")
    .eq("goal_id", goalId);
  expect(error).toBeNull();
  return data ?? [];
}

async function currentBalance(childId: string): Promise<number> {
  const { data, error } = await admin
    .from("child_profiles")
    .select("current_balance")
    .eq("id", childId)
    .single();
  expect(error).toBeNull();
  return data!.current_balance ?? 0;
}

beforeAll(async () => {
  parent = await createAdHocUser("e2e-goals-parent");
  householdId = await householdOf(parent.userId);
  child = await createChildUser("e2e-goals-child", householdId);
  quizChild = await createChildUser("e2e-goals-quizchild", householdId);
});

afterAll(async () => {
  for (const u of [child, quizChild]) {
    if (u?.userId) await deleteUser(u.userId);
  }
  if (parent?.userId) await deleteUser(parent.userId);
  if (householdId) await purgeHousehold(householdId);
});

describe("deposit_to_goal", () => {
  let goal: GoalRow;

  it("funds the child's wallet with 100 via approve_task_and_pay", async () => {
    await fundWallet(child, 100);
    expect(await currentBalance(child.childProfileId)).toBe(100);
    await assertWalletInvariant(child.childProfileId);
  });

  it("creates a goal with target 50 for the child", async () => {
    goal = await createGoal(child, "אופניים חדשים", 50, 10);
    expect(goal.status).toBe("active");
  });

  it("happy path: deposits 20 into the goal", async () => {
    const sb = userClient(child.accessToken);
    const { data, error } = await sb.rpc("deposit_to_goal", {
      _goal_id: goal.id,
      _amount: 20,
    });
    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect(result.deposited).toBe(20);
    expect(result.target).toBe(50);

    const txs = await goalTaggedTxs(goal.id);
    expect(txs).toHaveLength(2);
    const byType = Object.fromEntries(txs.map((t) => [t.type, t.amount]));
    expect(byType.wallet_debit).toBe(-20);
    expect(byType.goal_credit).toBe(20);

    expect(await currentBalance(child.childProfileId)).toBe(80);
    await assertWalletInvariant(child.childProfileId);
  });

  it("insufficient wallet balance: rejects a deposit larger than the wallet", async () => {
    const sb = userClient(child.accessToken);
    const { data, error } = await sb.rpc("deposit_to_goal", {
      _goal_id: goal.id,
      _amount: 1000,
    });
    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.error).toBeTruthy();
    expect(result.success).toBeFalsy();

    const txs = await goalTaggedTxs(goal.id);
    expect(txs).toHaveLength(2); // unchanged from the happy-path deposit
    expect(await currentBalance(child.childProfileId)).toBe(80);
  });

  it("exceeds target: rejects a deposit within the wallet but over the remaining target", async () => {
    // Remaining target room is 50 - 20 = 30; wallet is 80, so 40 is affordable
    // but would blow past the goal's target_amount.
    const sb = userClient(child.accessToken);
    const { data, error } = await sb.rpc("deposit_to_goal", {
      _goal_id: goal.id,
      _amount: 40,
    });
    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.error).toBeTruthy();
    expect(result.success).toBeFalsy();

    const txs = await goalTaggedTxs(goal.id);
    expect(txs).toHaveLength(2); // still unchanged
    expect(await currentBalance(child.childProfileId)).toBe(80);
  });

  it("exact-target deposit completes the goal", async () => {
    const sb = userClient(child.accessToken);
    const { data, error } = await sb.rpc("deposit_to_goal", {
      _goal_id: goal.id,
      _amount: 30, // 20 + 30 === target_amount (50)
    });
    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect(result.deposited).toBe(50);

    const row = await goalRow(goal.id);
    expect(row.status).toBe("completed");

    expect(await currentBalance(child.childProfileId)).toBe(50);
    await assertWalletInvariant(child.childProfileId);
  });
});

describe("deposit_to_savings", () => {
  it("happy path: deposits 20 from wallet into savings", async () => {
    // Wallet is 50 at this point (carried over from the deposit_to_goal block).
    const sb = userClient(child.accessToken);
    const { data, error } = await sb.rpc("deposit_to_savings", { _amount: 20 });
    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.success).toBe(true);

    const { data: txs, error: txErr } = await admin
      .from("transactions")
      .select("amount, type")
      .eq("child_id", child.childProfileId)
      .in("type", ["wallet_debit", "savings_credit"])
      .is("goal_id", null);
    expect(txErr).toBeNull();
    expect(txs).toHaveLength(2);
    const byType = Object.fromEntries((txs ?? []).map((t) => [t.type, t.amount]));
    expect(byType.wallet_debit).toBe(-20);
    expect(byType.savings_credit).toBe(20);

    expect(await currentBalance(child.childProfileId)).toBe(30);
    await assertWalletInvariant(child.childProfileId);
  });

  it("insufficient wallet balance: rejects a deposit larger than the wallet", async () => {
    const sb = userClient(child.accessToken);
    const { data, error } = await sb.rpc("deposit_to_savings", { _amount: 1000 });
    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.error).toBeTruthy();
    expect(result.success).toBeFalsy();

    expect(await currentBalance(child.childProfileId)).toBe(30);
  });
});

describe("deposit_savings_to_goal", () => {
  let goal2: GoalRow;

  it("creates a second goal with target 25 for the child", async () => {
    goal2 = await createGoal(child, "משחק חדש", 25, 5);
    expect(goal2.status).toBe("active");
  });

  it("happy path: deposits 15 from savings into the goal without touching the wallet", async () => {
    // Savings balance is 20 (from the deposit_to_savings block above).
    const balanceBefore = await currentBalance(child.childProfileId);

    const sb = userClient(child.accessToken);
    const { data, error } = await sb.rpc("deposit_savings_to_goal", {
      _goal_id: goal2.id,
      _amount: 15,
    });
    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect(result.deposited).toBe(15);

    const txs = await goalTaggedTxs(goal2.id);
    expect(txs).toHaveLength(2);
    const byType = Object.fromEntries(txs.map((t) => [t.type, t.amount]));
    expect(byType.savings_credit).toBe(-15);
    expect(byType.goal_credit).toBe(15);

    // deposit_savings_to_goal never touches child_profiles.current_balance.
    expect(await currentBalance(child.childProfileId)).toBe(balanceBefore);
    await assertWalletInvariant(child.childProfileId);
  });

  it("insufficient savings: rejects a deposit larger than the savings balance", async () => {
    // Savings balance is now 20 - 15 = 5.
    const balanceBefore = await currentBalance(child.childProfileId);
    const txsBefore = await goalTaggedTxs(goal2.id);

    const sb = userClient(child.accessToken);
    const { data, error } = await sb.rpc("deposit_savings_to_goal", {
      _goal_id: goal2.id,
      _amount: 1000,
    });
    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.error).toBeTruthy();
    expect(result.success).toBeFalsy();

    expect(await goalTaggedTxs(goal2.id)).toHaveLength(txsBefore.length);
    expect(await currentBalance(child.childProfileId)).toBe(balanceBefore);
  });

  it("exceeds target: rejects a savings deposit within savings but over the remaining target", async () => {
    // Top savings back up to 15 (wallet is 30, so this is affordable).
    const { data: topUp, error: topUpErr } = await userClient(child.accessToken).rpc(
      "deposit_to_savings",
      { _amount: 10 },
    );
    expect(topUpErr).toBeNull();
    expect((topUp as Record<string, unknown>).success).toBe(true);
    // Savings balance is now 5 + 10 = 15; goal2 remaining target is 25-15=10.
    const balanceBefore = await currentBalance(child.childProfileId);
    const txsBefore = await goalTaggedTxs(goal2.id);

    const sb = userClient(child.accessToken);
    const { data, error } = await sb.rpc("deposit_savings_to_goal", {
      _goal_id: goal2.id,
      _amount: 11, // affordable from savings (15) but exceeds remaining target (10)
    });
    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.error).toBeTruthy();
    expect(result.success).toBeFalsy();

    expect(await goalTaggedTxs(goal2.id)).toHaveLength(txsBefore.length);
    expect(await currentBalance(child.childProfileId)).toBe(balanceBefore);
  });
});

describe("quiz_reward wallet-balance regression", () => {
  it("a child funded ONLY via quiz_reward can deposit into a goal", async () => {
    // Seed a quiz_reward-only transaction directly (bypassing complete_quiz_and_pay,
    // which is out of scope here) and keep the cached balance in sync the same
    // way the RPC would.
    const REWARD = 50;
    const { error: insErr } = await admin.from("transactions").insert({
      household_id: householdId,
      child_id: quizChild.childProfileId,
      type: "quiz_reward",
      amount: REWARD,
    });
    expect(insErr).toBeNull();
    const { error: updErr } = await admin
      .from("child_profiles")
      .update({ current_balance: REWARD })
      .eq("id", quizChild.childProfileId);
    expect(updErr).toBeNull();
    await assertWalletInvariant(quizChild.childProfileId);

    const goal = await createGoal(quizChild, "מטרה ממומנת מחידון", 30, 5);

    // Before the fix, deposit_to_goal's wallet-balance formula omitted
    // quiz_reward, so this would incorrectly return "Insufficient wallet balance".
    const sb = userClient(quizChild.accessToken);
    const { data, error } = await sb.rpc("deposit_to_goal", {
      _goal_id: goal.id,
      _amount: 20,
    });
    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect(result.deposited).toBe(20);

    const txs = await goalTaggedTxs(goal.id);
    expect(txs).toHaveLength(2);
    const byType = Object.fromEntries(txs.map((t) => [t.type, t.amount]));
    expect(byType.wallet_debit).toBe(-20);
    expect(byType.goal_credit).toBe(20);

    expect(await currentBalance(quizChild.childProfileId)).toBe(30);
    await assertWalletInvariant(quizChild.childProfileId);
  });

  it("a child funded ONLY via quiz_reward can deposit into savings", async () => {
    // quizChild's wallet is now 30 (50 - 20 from the goal deposit above).
    const sb = userClient(quizChild.accessToken);
    const { data, error } = await sb.rpc("deposit_to_savings", { _amount: 10 });
    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.success).toBe(true);

    expect(await currentBalance(quizChild.childProfileId)).toBe(20);
    await assertWalletInvariant(quizChild.childProfileId);
  });
});
