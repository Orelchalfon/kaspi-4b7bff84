# Checklist — Database / Supabase review

Supabase is the **only** backend (project `flxhxmrtdqegfsupvvus`), shared with the mobile app.

## Single-ledger model — derive, don't duplicate

`transactions` is the single source of truth. Compute balances by filtering on `type`:

```text
wallet_balance  = SUM(amount) WHERE child_id = X AND type IN ('task_reward','manual_adjustment','wallet_debit','quiz_reward')
savings_balance = SUM(amount) WHERE child_id = X AND type = 'savings_credit'
goal_deposited  = SUM(amount) WHERE goal_id = G AND type = 'goal_credit'
```

- Reuse the canonical allowlist **`WALLET_TX_TYPES` / `isWalletTx`** from
  `src/lib/transactions.ts`. Don't hardcode the type list per route.
- **Don't** add `goal_credit` to the wallet formula — a deposit writes both
  `wallet_debit (-amt)` and `goal_credit (+amt)`; counting both nets to zero.

## Cached balance

- `child_profiles.current_balance` is a **cached** mirror of the wallet balance, maintained
  only by `approve_task_and_pay`, `deposit_to_goal`, and `complete_quiz_and_pay`. Anything
  that mutates the wallet outside those RPCs must keep the cache in sync. Don't read it as
  authoritative when the ledger is available.

## Money mutations

- Go through SECURITY DEFINER RPCs only. **Never** insert into `transactions` from the
  client. (See `security-review.md`.)

## Query hygiene

- Centralize typed query helpers when the same select is repeated across routes (e.g. a
  `fetchChildTransactions(childId)` helper) — but don't over-engineer one-off reads.
- Avoid N+1: batch with `.in(...)` / embedded selects / a single RPC.
- Type results against the generated `src/integrations/supabase/types.ts`.

## Schema changes are gated

- **Never** modify schema, RLS, or RPCs as part of a refactor without an explicit ask +
  confirmation. If a change is approved, use the Supabase MCP `apply_migration`, then
  regenerate `src/integrations/supabase/types.ts` in the same turn so the app compiles.
- Note: most historical migration files were deleted; the live schema lives in Supabase's
  tracking table. Bootstrap with `supabase db pull` — don't assume local migration files
  reflect the DB.

## Testing note

- e2e tests (`tests/e2e/`) hit the **real** Supabase project and **fail from Claude's
  shell** (Windows TLS interception). Do not run `pnpm test:e2e` automatically — ask the
  user to run it and verify DB state via the Supabase MCP instead.
