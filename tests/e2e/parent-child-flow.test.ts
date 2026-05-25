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
 * End-to-end integration tests for the core KidCoin loops, hitting the real
 * Supabase project with RLS enforced as each role.
 *
 * Coverage:
 *  - Parent signs up + creates household + parent role
 *  - Parent creates a child (admin-side, mirroring the createChild server fn)
 *  - Parent assigns a task to the child
 *  - Child submits the task
 *  - Parent approves the task → exactly ONE transaction is created
 *  - Re-calling approve_task is idempotent (no duplicate transaction, balance unchanged)
 */

let parent: AdHocUser;
let child: AdHocUser;
let householdId: string;
let childProfileId: string;
let taskId: string;

beforeAll(async () => {
  parent = await createAdHocUser("e2e-parent");
  child = await createAdHocUser("e2e-child");
});

afterAll(async () => {
  if (householdId) await purgeHousehold(householdId);
  if (parent?.userId) await deleteUser(parent.userId);
  if (child?.userId) await deleteUser(child.userId);
});

describe("Parent/Child core loop", () => {
  it("parent creates household + parent role under RLS", async () => {
    const sb = userClient(parent.accessToken);

    const { data: hh, error: hhErr } = await sb
      .from("households")
      .insert({ name: "E2E Family", created_by: parent.userId })
      .select("id")
      .single();
    expect(hhErr).toBeNull();
    expect(hh?.id).toBeTruthy();
    householdId = hh!.id;

    const { error: roleErr } = await sb.from("user_roles").insert({
      user_id: parent.userId,
      role: "parent",
      household_id: householdId,
    });
    expect(roleErr).toBeNull();
  });

  it("parent creates a child (admin path) and child role/profile", async () => {
    // Mirrors src/server/create-child.ts which uses admin to bypass RLS for the
    // child user creation step.
    const { error: roleErr } = await admin.from("user_roles").insert({
      user_id: child.userId,
      role: "child",
      household_id: householdId,
    });
    expect(roleErr).toBeNull();

    const { data: profile, error: profErr } = await admin
      .from("child_profiles")
      .insert({
        user_id: child.userId,
        household_id: householdId,
        display_name: "טסטי",
      })
      .select("id")
      .single();
    expect(profErr).toBeNull();
    expect(profile?.id).toBeTruthy();
    childProfileId = profile!.id;
  });

  it("parent assigns a task to the child under RLS", async () => {
    const sb = userClient(parent.accessToken);
    const { data: task, error } = await sb
      .from("tasks")
      .insert({
        household_id: householdId,
        child_profile_id: childProfileId,
        title: "לסדר את החדר",
        reward_amount: 7,
        created_by: parent.userId,
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

  it("parent approve_task creates exactly ONE transaction", async () => {
    const sb = userClient(parent.accessToken);
    const { data, error } = await sb.rpc("approve_task", { _task_id: taskId });
    expect(error).toBeNull();
    // RPC returns jsonb { success: true, transaction_id }
    expect((data as any)?.success).toBe(true);
    expect((data as any)?.transaction_id).toBeTruthy();

    // Verify exactly one transaction
    const { data: txs, error: txErr } = await admin
      .from("transactions")
      .select("id, amount, type, idempotency_key")
      .eq("task_id", taskId);
    expect(txErr).toBeNull();
    expect(txs).toHaveLength(1);
    expect(txs![0].amount).toBe(7);
    expect(txs![0].type).toBe("reward_credit");
    expect(txs![0].idempotency_key).toBe(`reward:${taskId}`);

    // Task moved to approved
    const { data: t } = await admin
      .from("tasks")
      .select("status, approved_at")
      .eq("id", taskId)
      .single();
    expect(t?.status).toBe("approved");
    expect(t?.approved_at).toBeTruthy();
  });

  it("re-calling approve_task is idempotent (no duplicate transaction)", async () => {
    const sb = userClient(parent.accessToken);
    const { data } = await sb.rpc("approve_task", { _task_id: taskId });
    // Second call should return an error inside the jsonb payload, not crash
    expect((data as any)?.error).toBeTruthy();

    const { data: txs } = await admin
      .from("transactions")
      .select("id, amount")
      .eq("task_id", taskId);
    expect(txs).toHaveLength(1);

    // Balance still equals single reward
    const { data: allTxs } = await admin
      .from("transactions")
      .select("amount")
      .eq("child_profile_id", childProfileId);
    const balance = (allTxs ?? []).reduce((s, t) => s + t.amount, 0);
    expect(balance).toBe(7);
  });
});
