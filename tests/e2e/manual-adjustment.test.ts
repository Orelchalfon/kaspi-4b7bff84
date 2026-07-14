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
 * End-to-end coverage for the manual_adjustment RPC:
 *  - parent-gated: household parent can credit/debit a child's wallet
 *  - negative adjustments are rejected if they would push the wallet negative
 *  - a parent from a different household cannot adjust another household's child
 *
 * Two households (mirrors the two-household pattern in child-birthdate.test.ts):
 * householdA owns childA; householdB exists only to prove cross-household
 * rejection.
 */

let parentA: AdHocUser;
let parentB: AdHocUser;
let childA: ChildUser;
let householdA: string;
let householdB: string;

async function manualAdjustmentTxCount(childId: string): Promise<number> {
  const { data, error } = await admin
    .from("transactions")
    .select("id")
    .eq("child_id", childId)
    .eq("type", "manual_adjustment");
  expect(error).toBeNull();
  return (data ?? []).length;
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
  parentA = await createAdHocUser("madj-parentA");
  parentB = await createAdHocUser("madj-parentB");
  householdA = await householdOf(parentA.userId);
  householdB = await householdOf(parentB.userId);
  childA = await createChildUser("madj-childA", householdA);
});

afterAll(async () => {
  if (childA?.userId) await deleteUser(childA.userId);
  for (const u of [parentA, parentB]) {
    if (u?.userId) await deleteUser(u.userId);
  }
  if (householdA) await purgeHousehold(householdA);
  if (householdB) await purgeHousehold(householdB);
});

describe("manual_adjustment", () => {
  it("positive adjustment: household parent credits the child's wallet", async () => {
    const sb = userClient(parentA.accessToken);
    const { data, error } = await sb.rpc("manual_adjustment", {
      _child_id: childA.childProfileId,
      _amount: 25,
    });
    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect(result.amount).toBe(25);

    expect(await manualAdjustmentTxCount(childA.childProfileId)).toBe(1);
    const { data: txs } = await admin
      .from("transactions")
      .select("amount")
      .eq("child_id", childA.childProfileId)
      .eq("type", "manual_adjustment");
    expect((txs ?? []).map((t) => t.amount)).toEqual([25]);

    expect(await currentBalance(childA.childProfileId)).toBe(25);
    await assertWalletInvariant(childA.childProfileId);
  });

  it("negative adjustment with sufficient balance: debits the child's wallet", async () => {
    const sb = userClient(parentA.accessToken);
    const { data, error } = await sb.rpc("manual_adjustment", {
      _child_id: childA.childProfileId,
      _amount: -10,
    });
    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect(result.amount).toBe(-10);

    expect(await manualAdjustmentTxCount(childA.childProfileId)).toBe(2);
    expect(await currentBalance(childA.childProfileId)).toBe(15);
    await assertWalletInvariant(childA.childProfileId);
  });

  it("negative adjustment that would overdraw the wallet is rejected", async () => {
    // Wallet is 15; -1000 would push it negative.
    const txCountBefore = await manualAdjustmentTxCount(childA.childProfileId);
    const balanceBefore = await currentBalance(childA.childProfileId);

    const sb = userClient(parentA.accessToken);
    const { data, error } = await sb.rpc("manual_adjustment", {
      _child_id: childA.childProfileId,
      _amount: -1000,
    });
    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.error).toBeTruthy();
    expect(result.success).toBeFalsy();

    expect(await manualAdjustmentTxCount(childA.childProfileId)).toBe(txCountBefore);
    expect(await currentBalance(childA.childProfileId)).toBe(balanceBefore);
  });

  it("a parent from another household cannot adjust this child's wallet", async () => {
    const txCountBefore = await manualAdjustmentTxCount(childA.childProfileId);
    const balanceBefore = await currentBalance(childA.childProfileId);

    const sb = userClient(parentB.accessToken);
    const { data, error } = await sb.rpc("manual_adjustment", {
      _child_id: childA.childProfileId,
      _amount: 10,
    });
    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.error).toBeTruthy();
    expect(result.success).toBeFalsy();

    expect(await manualAdjustmentTxCount(childA.childProfileId)).toBe(txCountBefore);
    expect(await currentBalance(childA.childProfileId)).toBe(balanceBefore);
  });

  it("the child itself cannot call manual_adjustment (parent-gated)", async () => {
    const txCountBefore = await manualAdjustmentTxCount(childA.childProfileId);
    const balanceBefore = await currentBalance(childA.childProfileId);

    const sb = userClient(childA.accessToken);
    const { data, error } = await sb.rpc("manual_adjustment", {
      _child_id: childA.childProfileId,
      _amount: 10,
    });
    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.error).toBeTruthy();
    expect(result.success).toBeFalsy();

    expect(await manualAdjustmentTxCount(childA.childProfileId)).toBe(txCountBefore);
    expect(await currentBalance(childA.childProfileId)).toBe(balanceBefore);
  });
});
