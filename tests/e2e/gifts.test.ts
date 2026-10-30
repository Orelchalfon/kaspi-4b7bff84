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
 * End-to-end coverage for QR-code gifts (supabase/migrations/20261019120000_qr_gifts.sql):
 *  - child_gift_token: household-parent-only, stable until rotated
 *  - get_gift_target: anon-callable, returns name/avatar only
 *  - submit_gift: pending only (no ledger rows), idempotent per request id, rejects
 *    children / rotated tokens / bad input, max 3 pending per sender per child
 *  - approve_gift_and_pay: household-parent-only, applies the savings split exactly like
 *    approve_task_and_pay, keeps current_balance == ledger, idempotent
 *  - reject_gift + RLS: senders can't see the household ledger; anon sees nothing
 *
 * The "email not confirmed" rejection is not covered here: createAdHocUser makes
 * confirmed users and an unconfirmed one can't reliably sign in. It was verified against
 * the live DB with a rolled-back SQL smoke test on 2026-10-19.
 */

const anon = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

let parent: AdHocUser;
let otherParent: AdHocUser;
let sender: AdHocUser;
let child: ChildUser;
let household: string;
let otherHousehold: string;
let senderHousehold: string;
let token: string;
let giftId: string;

type Payload = Record<string, unknown>;

async function giftTxCount(id: string): Promise<number> {
  const { data, error } = await admin.from("transactions").select("id").eq("reference_gift_id", id);
  expect(error).toBeNull();
  return (data ?? []).length;
}

beforeAll(async () => {
  parent = await createAdHocUser("gift-parent");
  otherParent = await createAdHocUser("gift-other");
  sender = await createAdHocUser("gift-sender");
  household = await householdOf(parent.userId);
  otherHousehold = await householdOf(otherParent.userId);
  senderHousehold = await householdOf(sender.userId);
  child = await createChildUser("gift-child", household);
  await admin
    .from("household_settings")
    .upsert({ household_id: household, savings_percentage: 10 }, { onConflict: "household_id" });
});

afterAll(async () => {
  if (child?.userId) await deleteUser(child.userId);
  for (const u of [parent, otherParent, sender]) {
    if (u?.userId) await deleteUser(u.userId);
  }
  for (const h of [household, otherHousehold, senderHousehold]) {
    if (h) await purgeHousehold(h);
  }
});

describe("gift link", () => {
  it("household parent gets a stable token; another parent is rejected", async () => {
    const { data, error } = await userClient(parent.accessToken).rpc("child_gift_token", {
      _child_id: child.childProfileId,
    });
    expect(error).toBeNull();
    token = (data as Payload).token as string;
    expect(token).toMatch(/^[0-9a-f]{32}$/);

    const again = await userClient(parent.accessToken).rpc("child_gift_token", {
      _child_id: child.childProfileId,
    });
    expect((again.data as Payload).token).toBe(token);

    const other = await userClient(otherParent.accessToken).rpc("child_gift_token", {
      _child_id: child.childProfileId,
    });
    expect((other.data as Payload).error).toBeTruthy();
  });

  it("anon resolves the token to name + avatar only, and can't read the tables", async () => {
    const { data, error } = await anon.rpc("get_gift_target", { _token: token });
    expect(error).toBeNull();
    expect(Object.keys(data as Payload).sort()).toEqual(["avatar", "display_name"]);

    const links = await anon.from("child_gift_links").select("token");
    expect(links.data ?? []).toHaveLength(0);
    const gifts = await anon.from("gifts").select("id");
    expect(gifts.data ?? []).toHaveLength(0);
  });
});

describe("submit_gift", () => {
  it("creates a pending gift with no ledger rows, idempotent on request id", async () => {
    const requestId = crypto.randomUUID();
    const sb = userClient(sender.accessToken);
    const args = {
      _token: token,
      _amount: 50,
      _reason: "haircut",
      _sender_name: "דוד דני",
      _request_id: requestId,
    };
    const first = await sb.rpc("submit_gift", args);
    expect(first.error).toBeNull();
    expect((first.data as Payload).status).toBe("pending");
    giftId = (first.data as Payload).gift_id as string;

    const retry = await sb.rpc("submit_gift", args);
    expect((retry.data as Payload).gift_id).toBe(giftId);
    expect(await giftTxCount(giftId)).toBe(0);

    // Another user can't claim someone else's request id.
    const hijack = await userClient(otherParent.accessToken).rpc("submit_gift", args);
    expect((hijack.data as Payload).error).toBe("Duplicate request");
  });

  it("rejects children, bad amounts and bad reasons", async () => {
    const base = { _token: token, _sender_name: "x" };
    const asChild = await userClient(child.accessToken).rpc("submit_gift", {
      ...base,
      _amount: 10,
      _reason: "gift",
      _request_id: crypto.randomUUID(),
    });
    expect((asChild.data as Payload).error).toBe("Children cannot send gifts");

    const sb = userClient(sender.accessToken);
    const tooMuch = await sb.rpc("submit_gift", {
      ...base,
      _amount: 501,
      _reason: "gift",
      _request_id: crypto.randomUUID(),
    });
    expect((tooMuch.data as Payload).error).toBe("Invalid amount");
    const badReason = await sb.rpc("submit_gift", {
      ...base,
      _amount: 5,
      _reason: "casino",
      _request_id: crypto.randomUUID(),
    });
    expect((badReason.data as Payload).error).toBe("Invalid reason");
  });

  it("the sender sees their own gift but not the household ledger", async () => {
    const sb = userClient(sender.accessToken);
    const own = await sb.from("gifts").select("id").eq("id", giftId);
    expect(own.data ?? []).toHaveLength(1);
    const ledger = await sb.from("transactions").select("id").eq("child_id", child.childProfileId);
    expect(ledger.data ?? []).toHaveLength(0);
  });
});

describe("approve_gift_and_pay", () => {
  it("only a household parent can approve or reject", async () => {
    for (const u of [sender, otherParent]) {
      const a = await userClient(u.accessToken).rpc("approve_gift_and_pay", { _gift_id: giftId });
      expect((a.data as Payload).error).toBe("Not authorized");
      const r = await userClient(u.accessToken).rpc("reject_gift", { _gift_id: giftId });
      expect((r.data as Payload).error).toBe("Not authorized");
    }
    expect(await giftTxCount(giftId)).toBe(0);
  });

  it("posts ₪50 at 10% as +50 / −5 / +5 and keeps the cache in sync", async () => {
    const { data, error } = await userClient(parent.accessToken).rpc("approve_gift_and_pay", {
      _gift_id: giftId,
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ success: true, wallet_delta: 45, savings_delta: 5 });

    const { data: rows } = await admin
      .from("transactions")
      .select("type, amount")
      .eq("reference_gift_id", giftId);
    expect((rows ?? []).map((r) => `${r.type}:${r.amount}`).sort()).toEqual([
      "manual_adjustment:50",
      "savings_credit:5",
      "wallet_debit:-5",
    ]);
    await assertWalletInvariant(child.childProfileId);
  });

  it("approving twice is a no-op", async () => {
    const { data } = await userClient(parent.accessToken).rpc("approve_gift_and_pay", {
      _gift_id: giftId,
    });
    expect((data as Payload).already_approved).toBe(true);
    expect(await giftTxCount(giftId)).toBe(3);
    await assertWalletInvariant(child.childProfileId);
  });
});

describe("limits, rejection and rotation", () => {
  it("allows 3 pending gifts per sender per child, then refuses", async () => {
    const sb = userClient(sender.accessToken);
    const send = () =>
      sb.rpc("submit_gift", {
        _token: token,
        _amount: 10,
        _reason: "gift",
        _sender_name: "x",
        _request_id: crypto.randomUUID(),
      });
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const { data } = await send();
      ids.push((data as Payload).gift_id as string);
    }
    const fourth = await send();
    expect((fourth.data as Payload).error).toBe("Too many pending gifts");

    // Rejecting frees a slot and never touches the ledger.
    const { data } = await userClient(parent.accessToken).rpc("reject_gift", { _gift_id: ids[0] });
    expect((data as Payload).success).toBe(true);
    expect(await giftTxCount(ids[0])).toBe(0);
    const fifth = await send();
    expect((fifth.data as Payload).status).toBe("pending");
  });

  it("rotating the token kills the old one", async () => {
    const { data } = await userClient(parent.accessToken).rpc("child_gift_token", {
      _child_id: child.childProfileId,
      _rotate: true,
    });
    const newToken = (data as Payload).token as string;
    expect(newToken).not.toBe(token);

    const old = await anon.rpc("get_gift_target", { _token: token });
    expect((old.data as Payload).error).toBe("not_found");
    const submit = await userClient(sender.accessToken).rpc("submit_gift", {
      _token: token,
      _amount: 10,
      _reason: "gift",
      _sender_name: "x",
      _request_id: crypto.randomUUID(),
    });
    expect((submit.data as Payload).error).toBe("Gift link not found");
  });
});
