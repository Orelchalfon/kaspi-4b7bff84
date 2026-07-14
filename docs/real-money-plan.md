# Kaspi Real-Money Plan

**Status:** planning doc — nothing here is applied to the DB.
**Origin:** optimized rewrite of the "Kofi Family Bank" draft, which was written without codebase context. This version maps every idea onto the live schema (project `flxhxmrtdqegfsupvvus`) and the shipped feature set.

**Model (unchanged from draft):** white-label program manager. CAL is issuer of record; Kaspi owns brand, UX, ledger, and business logic. Real money lives in CAL's payment account, never in our DB — we mirror allocation (spendable / savings / goals).

---

## 1. The draft's biggest miss: Phase 0 is already built

The draft's "Phase 0 — closed-loop ledger MVP" describes, almost feature for feature, what kaspii-web ships today:

| Draft concept | Live equivalent |
|---|---|
| Skim engine (X% of every inflow → locked savings) | `household_settings.savings_percentage` + the savings split inside `approve_task_and_pay` and `complete_quiz_and_pay` |
| Goal buckets with auto-progress | `goals` + `deposit_to_goal` + `deposit_savings_to_goal` |
| Approval workflow with audit trail | Task lifecycle `assigned → submitted → approved/rejected` with `reviewed_at`; parent-gated RPCs |
| Multi-tenant RLS by family | `household_id` scoping, inline `user_roles` subqueries on every policy |
| Ledger as source of allocation truth | `transactions` single-table ledger; balances derived by `type` filters (`src/lib/transactions.ts`) |
| "Fake purchase" dev loop | Task rewards + quiz rewards *are* the simulated inflows |

So the real plan is not "build a ledger MVP" — it's **harden what exists, then bolt the money edge on**. The draft's greenfield schema (`families`, `profiles`, `ledger_accounts`, `ledger_entries`) must NOT be built: it forks tenancy and the ledger into parallel tables the mobile app doesn't know about.

**Schema mapping (draft → live). Never create the left column:**

| Draft table | Live table | Notes |
|---|---|---|
| `families` | `households` | add `cal_payment_account_id` here in Phase 2 |
| `profiles` (role enum) | `user_roles` + `child_profiles` | live roles are text CHECK incl. `admin`; no enums on this DB |
| `ledger_accounts` + `ledger_entries` | `transactions` | pots are expressed by `type`, not account rows (see §3) |
| `goals` | `goals` | already live, `target_amount int` |
| `approval_requests` | **new** (Phase 1) | good idea — generalizes task approval to goal-fund / savings-unlock / limit-raise |
| `virtual_cards` | **new** (Phase 2) | genuinely additive |
| `webhook_events` | **new** (Phase 2) | inbox + dead-letter pattern — keep as designed |

---

## 2. Corrections to the draft (technical)

1. **`CREATE RULE ... DO INSTEAD NOTHING` is a footgun.** It silently swallows UPDATE/DELETE — callers think they succeeded. Enforce append-only with a `BEFORE UPDATE OR DELETE` trigger that raises, plus `REVOKE UPDATE, DELETE` from `authenticated`/`anon`. (Service role bypasses RLS but not triggers — the trigger is the real guard.)
2. **`my_family_ids()` SECURITY DEFINER helper breaks a live convention.** This DB deliberately has *no* RLS helper functions; every policy inlines `SELECT household_id FROM user_roles WHERE user_id = auth.uid()`. Keep that convention (see the `tutors` policies for the current template). If a helper is ever added, it needs `SET search_path` — the draft's version omits it.
3. **"Balances are never stored" contradicts live design.** `child_profiles.current_balance` is a cached wallet mirror maintained by the RPCs, and the mobile app reads it. Policy going forward: **points wallet keeps the cache** (with a reconciliation check in tests); **real-money balances are always derived** and reconciled against CAL — no cached ₪ column, ever.
4. **`skim_pct numeric(5,4)` per card conflicts with live config.** Savings % is a household-level `int 0..100` (`household_settings.savings_percentage`). Keep it; a per-child override is a small nullable column on `child_profiles` later, not a per-card decimal.
5. **Draft ignores the earn side.** Its only money source is card spend. Kaspi's actual differentiator is that inflows come from *tasks and quizzes* — the skim already runs on earn, which is pedagogically stronger than skimming purchases (a child who earns 100 sees 90 spendable + 10 saved; skimming spend teaches "spending triggers saving", a weirder lesson). Keep skim-on-earn as primary; skim-on-spend becomes optional in Phase 2.
6. **Draft ignores platform reality.** App is TanStack Start on Cloudflare Workers (+ a React Native app on the same Supabase), not Expo-only. Server-side CAL calls: use **Supabase Edge Functions** so web and mobile share one integration point, secrets stay in Supabase, and webhooks have a stable URL independent of the web deploy. The existing `*.server.ts` importProtection pattern stays for web-only server code.
7. **Hebrew/RTL absent from the draft.** All new UI is Hebrew, logical-side Tailwind (`ms-`/`me-`), sonner toasts — per repo conventions.
8. **CAL "Issuing Platform API" is an assumption, not a fact.** CAL has no public issuing API; the whole Phase 2 depends on a bizdev deal (or a fallback issuer/BaaS). That's why the money phases are strictly gated behind Phase 1 outcomes.
9. **`numeric` vs float:** the draft's "never floats" rule is right, but live `transactions.amount` is `numeric` (exact) holding integer point values — that's fine for points. Real money gets `bigint` agorot in its own table (§3).

---

## 3. Key decision: separate real-money ledger, don't extend `transactions`

Two options were considered:

- **(a) Add `currency` column to `transactions`** — keeps "one ledger", but every existing `SUM` in web + mobile + RPCs would silently mix points and agorot unless all of them grow a currency filter. High blast radius, shared project, guaranteed bug.
- **(b) New `money_ledger` table, points ledger untouched** ✅ — real money gets money-grade discipline (bigint agorot, append-only trigger, double-entry groups, `cal_event_id` idempotency) without touching anything the mobile app reads. `transactions` stays exactly as-is.

Points and shekels are different products pedagogically too: points are earned (tasks/quizzes) and "spent" inside the app; shekels are loaded by parents and spent in the real world. Whether task rewards eventually pay real agorot is an **open product decision** (§8) — the split ledger supports either answer.

### Phase-2 schema (new tables only — nothing existing is altered except one column on `households`)

```sql
-- households: mirror of CAL account (Phase 2)
alter table public.households add column cal_payment_account_id text unique;

create table public.virtual_cards (
  id uuid primary key default extensions.uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_id uuid not null references public.child_profiles(id),
  cal_card_id text unique,
  last4 text,
  status text not null default 'pending_issue'
    check (status in ('pending_issue','active','frozen','closed')),  -- text CHECK, no enums (live convention)
  is_billable boolean not null default false,   -- 6th+ card
  daily_limit_agorot bigint,
  created_at timestamptz not null default now()
);

-- Double-entry money ledger. Pots follow the live pattern: a `pot` tag per row
-- instead of the draft's ledger_accounts table — same query ergonomics as
-- transactions.type, but every movement is a balanced group.
create table public.money_ledger (
  id uuid primary key default extensions.uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_id uuid references public.child_profiles(id),   -- null = household/external pot
  pot text not null check (pot in ('spendable','locked_savings','goal','external','parent_source')),
  goal_id uuid references public.goals(id),             -- set when pot='goal'
  amount_agorot bigint not null,                        -- +credit / -debit, integer agorot only
  tx_group uuid not null,                               -- balanced set sums to zero
  reason text not null check (reason in
    ('load','purchase','skim','goal_fund','savings_unlock','reversal','fee','interest')),
  cal_event_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.money_ledger (child_id, pot);
create index on public.money_ledger (tx_group);
create unique index money_ledger_cal_idempotency
  on public.money_ledger (cal_event_id, pot, child_id) where cal_event_id is not null;

-- Append-only: trigger, not CREATE RULE (rules swallow writes silently)
create or replace function public.forbid_ledger_mutation()
returns trigger language plpgsql set search_path to 'public' as $$
begin raise exception 'money_ledger is append-only; write a reversal group instead'; end $$;
create trigger money_ledger_append_only
  before update or delete on public.money_ledger
  for each row execute function public.forbid_ledger_mutation();
revoke update, delete on public.money_ledger from authenticated, anon;

-- Webhook inbox — keep the draft's design, it's correct
create table public.webhook_events (
  id uuid primary key default extensions.uuid_generate_v4(),
  cal_event_id text unique not null,
  event_type text not null,
  raw jsonb not null,
  status text not null default 'received' check (status in ('received','processed','failed')),
  attempts int not null default 0,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
```

Balance formulas (derived, mirroring `src/lib/transactions.ts` style — add a `money.ts` sibling):

```text
spendable_agorot = SUM(amount_agorot) WHERE child_id = X AND pot = 'spendable'
locked_agorot    = SUM(amount_agorot) WHERE child_id = X AND pot = 'locked_savings'
goal_agorot      = SUM(amount_agorot) WHERE goal_id  = G AND pot = 'goal'
```

RLS follows the live template exactly (SELECT-only for clients; children see own `child_id` rows via `child_profiles.user_id = auth.uid()`, parents see household via inline `user_roles` subquery). **All writes go through SECURITY DEFINER RPCs / Edge Functions — clients never insert money rows**, same rule as `transactions` today.

---

## 4. Phases

### Phase 0 — Close the gaps in the shipped points app (now, no CAL)

Small, already-scoped work that also de-risks the money phases:

1. **e2e coverage for goals + savings RPCs** — `deposit_to_goal`, `deposit_to_savings`, `deposit_savings_to_goal`: happy path, insufficient balance, target exceeded, completion flip. (Known follow-up in CLAUDE.md; still open — `tests/e2e/` has no goal-deposit coverage.)
2. **Ledger invariant test** — assert `child_profiles.current_balance == computeWalletBalance(transactions)` after every mutating e2e flow. This is the reconciliation habit the money ledger will need.
3. **Manual adjustment RPC** — `manual_adjustment` tx type exists but has no write path. Build it as a parent-gated SECURITY DEFINER RPC (keeps the "no client inserts into transactions" rule, keeps the cache in sync). This is also the future "load money" UX in points form.

### Phase 1 — Approvals generalization + bizdev (parallel)

**Code:** add `approval_requests` (the draft's best new idea) on live tenancy:

```sql
create table public.approval_requests (
  id uuid primary key default extensions.uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_id uuid not null references public.child_profiles(id),
  kind text not null check (kind in ('savings_unlock','goal_fund','limit_raise','card_issue')),
  amount int not null check (amount > 0),
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','declined','expired')),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
```

First consumer in the points app: **savings unlock** — today nothing moves savings back to wallet; make it a child request → parent approval → new `withdraw_savings` RPC. That ships user value now *and* proves the approval loop the money phases require. RLS: child INSERT own pending rows; parent decides via RPC only (no broad UPDATE).

**Bizdev/legal (parallel, blocking Phase 2):** CAL Platform program-manager deal — confirm sub-cards under one parent account, Apple/Google Pay push provisioning, webhook capabilities, per-card spend controls, pricing. Israeli fintech lawyer validates parent=owner / child=user / CAL=issuer / Kaspi=program-manager. **If CAL says no, evaluate other Israeli issuers before writing any Phase-2 code — §3's schema is issuer-agnostic on purpose (rename `cal_*` fields at that point).**

### Phase 2 — Real money (gated on Phase 1 outcomes)

1. Apply §3 schema on a **Supabase branch** first (shared project with mobile — per repo convention, confirm before `apply_migration` to main, regenerate `types.ts` same turn).
2. Edge Functions: `cal-webhook` (signature-verify → inbox insert → process → mark processed/failed), `issue-card` (billing gate for card 6+ *before* the CAL call), `provision-wallet` (Apple/Google Pay push provisioning).
3. Processing runs as a Postgres RPC so purchase + optional skim is one atomic, idempotent transaction (the draft's TypeScript multi-statement version is not atomic — move it into SQL like `approve_task_and_pay`).
4. Dead-letter cron: re-drive `webhook_events` where `status='failed' and attempts < 5`, alert beyond that.
5. Locked savings enforcement: after each settle, set the CAL card's available limit to `spendable` (derived), so `locked_savings` is unspendable at the network level, not just in our ledger.
6. Skim-on-spend: **off by default**, per-household opt-in — skim-on-earn (load) is the default and matches the app's existing mental model.
7. Refund/chargeback: reversing group (`reason='reversal'`) that also unwinds proportional skim.
8. Parent UI: load money (bank → CAL via CAL's flow), per-child card tile (freeze, limit), real-money tx feed — extend `transaction-row.tsx`/`describeTx` pattern with a `describeMoneyTx` sibling, all Hebrew.

### Phase 3 — Moat

Savings interest paid to the *child* (PayBox pays the parent — lead with that in copy), gift links for relatives, allowance schedule (`pg_cron` load), converting task/quiz rewards to real agorot (see §8), financial-literacy content (quiz + tutors infrastructure already exists — the draft didn't know Kaspi already has a full quiz-bank with grade bands and AI voice tutors; that's the literacy moat, already shipped).

---

## 5. Failure & approval matrix (adapted)

| Scenario | Handling |
|---|---|
| Duplicate webhook | `webhook_events.cal_event_id` unique + `money_ledger` partial unique index → replay is a no-op |
| Webhook before card mirrored | Inbox row stays `received`; cron retries until `virtual_cards.cal_card_id` exists |
| Skim exceeds spendable | Skim = `floor(pct × amount)` and guarded `spendable ≥ skim` inside the RPC |
| CAL down on issue | Card stays `pending_issue`; cron retries; UI shows "בהנפקה…" |
| Refund/chargeback | Reversal group + proportional skim unwind |
| Ledger/CAL drift | Nightly reconciliation job: derived spendable vs CAL available; alert on mismatch (draft had no reconciliation — mandatory for real money) |
| **Parent approval required** | savings unlock, goal fund above threshold, limit raise, card 6+ (billing-gated), card unfreeze |

---

## 6. What was kept from the draft verbatim

Integer agorot as `bigint`; append-only ledger with reversal-only corrections; DB-enforced idempotency on external event ids; webhook inbox + dead-letter + cron; "app never talks to CAL directly"; CAL as source of truth for available funds / our ledger for allocation; billing gate before issuing card 6+; the phased "prove the ledger before spending a shekel on integration" instinct — except the ledger is already proven in production points.

## 7. Immediate next actions

1. Phase 0.1–0.3 (goal e2e tests → invariant test → manual-adjustment RPC) — pure code, no schema risk except one RPC.
2. `approval_requests` + savings-unlock flow on a Supabase branch.
3. In parallel: CAL BizDev email + fintech-law consult (the actual critical path).
4. Update `CLAUDE.md` when `approval_requests` lands (it already lags the repo: savings-transfer RPCs, tutors, and `describeTx`/`transaction-row.tsx` are live but undocumented there).

## 8. Open product decisions (decide before Phase 2 build)

1. **Do task/quiz rewards become real agorot?** If yes, parent pre-funds a reward pool at CAL and `approve_task_and_pay` grows a money leg. Recommendation: not in Phase 2 — ship load/spend/skim first, convert rewards in Phase 3 once flows are trusted.
2. **Points after money launches:** keep as gamification layer alongside ₪ (recommended — quiz/tutor rewards stay frictionless) vs migrate fully to ₪.
3. **Skim-on-spend default:** recommended off (skim-on-earn only) — confirm with early parents.
4. **Branding:** draft says "Kofi", repo says KidCoin/Kaspi — settle before CAL contracts name a program manager.
