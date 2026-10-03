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
 * Automatic recurring goal deposits (migration 20261004120000_goal_auto_deposit):
 *
 *  - goals_auto_schedule trigger: enabling auto as a client schedules one cycle
 *    out; clients can't move next_auto_deposit_on or forge last_auto_status.
 *  - run_goal_auto_deposits(): not callable by clients; deposits from the wallet
 *    (cache kept in sync) or savings (cache untouched); same-day re-run is a
 *    no-op; insufficient funds leaves the goal due; completes at target.
 *
 * Due dates are backdated with the service-role client (the trigger only locks
 * the schedule for anon/authenticated). Note: run_goal_auto_deposits() is
 * global — it also processes any other goal that is genuinely due today, exactly
 * as the daily cron would.
 */

let parent: AdHocUser;
let child: ChildUser;
let householdId: string;

const jerusalemToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());

async function fundWallet(c: ChildUser, rewardAmount: number): Promise<void> {
  const parentSb = userClient(parent.accessToken);
  const { data: task, error } = await parentSb
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
  expect(error).toBeNull();
  await userClient(c.accessToken)
    .from("tasks")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", task!.id);
  const { data: ok, error: aErr } = await parentSb.rpc("approve_task_and_pay", {
    p_task_id: task!.id,
  });
  expect(aErr).toBeNull();
  expect(ok).toBe(true);
}

async function createAutoGoal(
  source: "wallet" | "savings",
  target: number,
  cycle: number,
): Promise<string> {
  const { data, error } = await userClient(child.accessToken)
    .from("goals")
    .insert({
      household_id: householdId,
      child_id: child.childProfileId,
      title: `אוטומטי ${source}`,
      target_amount: target,
      cycle_amount: cycle,
      cycle_period: "week",
      created_by: child.userId,
      auto_deposit: true,
      auto_source: source,
    })
    .select("id")
    .single();
  expect(error).toBeNull();
  return data!.id;
}

async function goal(goalId: string) {
  const { data, error } = await admin
    .from("goals")
    .select("status, next_auto_deposit_on, last_auto_status")
    .eq("id", goalId)
    .single();
  expect(error).toBeNull();
  return data!;
}

async function deposited(goalId: string): Promise<number> {
  const { data } = await admin
    .from("transactions")
    .select("amount")
    .eq("goal_id", goalId)
    .eq("type", "goal_credit");
  return (data ?? []).reduce((s, t) => s + Number(t.amount), 0);
}

async function currentBalance(): Promise<number> {
  const { data } = await admin
    .from("child_profiles")
    .select("current_balance")
    .eq("id", child.childProfileId)
    .single();
  return Number(data!.current_balance ?? 0);
}

async function makeDue(goalId: string) {
  const { error } = await admin
    .from("goals")
    .update({ next_auto_deposit_on: jerusalemToday() })
    .eq("id", goalId);
  expect(error).toBeNull();
}

async function runAuto() {
  const { error } = await admin.rpc("run_goal_auto_deposits");
  expect(error).toBeNull();
}

beforeAll(async () => {
  parent = await createAdHocUser("e2e-auto-parent");
  householdId = await householdOf(parent.userId);
  child = await createChildUser("e2e-auto-child", householdId);
});

afterAll(async () => {
  if (child?.userId) await deleteUser(child.userId);
  if (parent?.userId) await deleteUser(parent.userId);
  if (householdId) await purgeHousehold(householdId);
});

describe("goal auto deposit", () => {
  let walletGoal: string;

  it("schedules the first deposit one cycle out and locks the schedule for clients", async () => {
    walletGoal = await createAutoGoal("wallet", 30, 10);
    const g = await goal(walletGoal);
    const expected = new Date(`${jerusalemToday()}T00:00:00Z`);
    expected.setUTCDate(expected.getUTCDate() + 7);
    expect(g.next_auto_deposit_on).toBe(expected.toISOString().slice(0, 10));

    await userClient(child.accessToken)
      .from("goals")
      .update({ next_auto_deposit_on: "2000-01-01", last_auto_status: "deposited" })
      .eq("id", walletGoal);
    const after = await goal(walletGoal);
    expect(after.next_auto_deposit_on).toBe(g.next_auto_deposit_on);
    expect(after.last_auto_status).toBeNull();
  });

  it("is not callable by a signed-in child", async () => {
    const { error } = await userClient(child.accessToken).rpc("run_goal_auto_deposits");
    expect(error).not.toBeNull();
  });

  it("insufficient wallet: marks the goal and keeps it due", async () => {
    await makeDue(walletGoal);
    await runAuto();
    const g = await goal(walletGoal);
    expect(g.last_auto_status).toBe("insufficient");
    expect(g.next_auto_deposit_on).toBe(jerusalemToday());
    expect(await deposited(walletGoal)).toBe(0);
  });

  it("deposits from the wallet once funded, keeping the cache in sync", async () => {
    await fundWallet(child, 25);
    await runAuto();
    const g = await goal(walletGoal);
    expect(g.last_auto_status).toBe("deposited");
    expect(g.next_auto_deposit_on).not.toBe(jerusalemToday());
    expect(await deposited(walletGoal)).toBe(10);
    expect(await currentBalance()).toBe(15);
    await assertWalletInvariant(child.childProfileId);
  });

  it("a second run the same day is a no-op", async () => {
    await runAuto();
    expect(await deposited(walletGoal)).toBe(10);
    expect(await currentBalance()).toBe(15);
  });

  it("caps the last deposit at the remaining target and completes the goal", async () => {
    await fundWallet(child, 30);
    await makeDue(walletGoal);
    await runAuto(); // 20 deposited
    await makeDue(walletGoal);
    await runAuto(); // 30 deposited → completed
    expect(await deposited(walletGoal)).toBe(30);
    expect((await goal(walletGoal)).status).toBe("completed");
    await assertWalletInvariant(child.childProfileId);
  });

  it("savings source: moves savings into the goal without touching the wallet cache", async () => {
    const { data, error } = await userClient(child.accessToken).rpc("deposit_to_savings", {
      _amount: 10,
    });
    expect(error).toBeNull();
    expect((data as Record<string, unknown>).success).toBe(true);

    const savingsGoal = await createAutoGoal("savings", 100, 5);
    const before = await currentBalance();
    await makeDue(savingsGoal);
    await runAuto();
    expect(await deposited(savingsGoal)).toBe(5);
    expect(await currentBalance()).toBe(before);
    await assertWalletInvariant(child.childProfileId);
  });
});
