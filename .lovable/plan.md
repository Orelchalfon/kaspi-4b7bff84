## Add Child Savings — savings pot + goals

Build a new `/child/savings` route plus a parent-side savings % control. Keep transactions as the single source of truth for balance.

### 1. Database changes (migration)

**Extend `transaction_type` enum**
- Add values: `savings_credit` (rewards routed to savings), `goal_credit` (deposit into a goal). Keep existing `reward_credit` as the wallet credit.

**New table: `household_settings`**
- `household_id uuid PK references households`
- `savings_percentage int not null default 0 check (0..100)`
- `updated_at`, `updated_by`
- RLS: parents in household read/write; children in household read.

**New table: `goals`**
- `id`, `household_id`, `child_profile_id`, `title text`, `target_amount int >0`, `cycle_amount int >0`, `cycle_period text in ('day','week','month')`, `status text default 'active'`, `created_at`, `updated_at`
- RLS: household members read; child owner can insert/update own goals; parents can insert/update/delete in household.

**New columns on `transactions`**
- `goal_id uuid null references goals(id)` — for goal deposits.
- (savings amounts will be tagged via `type='savings_credit'`; no extra column needed.)

**Update `approve_task` RPC**
- After inserting the existing `reward_credit` row (full reward amount → wallet), look up the household's `savings_percentage`. If > 0, compute `savings = floor(reward * pct / 100)` and insert a second `transactions` row with `type='savings_credit'`, `amount = -savings` paired with… 

  Actually since wallet balance = sum of all tx, and savings is a separate pot, we need TWO ledgers. Simplest: keep one ledger and derive both balances by `type`:
  - `wallet_balance = sum(amount) where type in ('reward_credit','manual_adjustment','goal_credit')` — `goal_credit` is negative (debit from wallet).
  - `savings_balance = sum(amount) where type='savings_credit'` — positive credits, plus negative if ever spent.
  - To move % into savings on approval: insert one `savings_credit` row with positive `amount = floor(reward*pct/100)` AND adjust wallet by inserting a negative `reward_credit`? That changes existing semantics.

  Cleaner: introduce `wallet_debit` type for the savings-routing leg.
  - On approval: insert `reward_credit` (+full reward), then if pct>0 insert `wallet_debit` (-savings) and `savings_credit` (+savings). All three share `task_id` and use distinct `idempotency_key` suffixes (`reward:`, `save-debit:`, `save-credit:`).
  - Wallet balance = sum where type in ('reward_credit','manual_adjustment','wallet_debit','goal_credit').
  - Savings balance = sum where type='savings_credit'.
- Idempotency preserved by unique `idempotency_key`.

**New RPC: `deposit_to_goal(_goal_id uuid, _amount int)`**
- Auth: must be the child owner of the goal OR a parent in the household.
- Validates amount > 0, goal active, child has enough wallet balance (compute from ledger), and total deposited so far + amount ≤ target_amount.
- Inserts two rows sharing `goal_id` and `task_id=null`:
  - `wallet_debit` with `-amount` (idempotency_key = `goal-debit:<uuid>`)
  - `goal_credit` with `+amount` (idempotency_key = `goal-credit:<uuid>`)
- If new total reaches target, sets `goals.status='completed'`.

### 2. Parent UI — savings % control

In `src/routes/parent/dashboard.tsx` (or a new section on Children page), add a small "אחוז חיסכון אוטומטי" card:
- Slider/number input 0–100, "שמור" button → upsert into `household_settings`.
- Helper text: "כל אישור משימה יעביר X% מהתגמול לחיסכון של הילד".
- Toast on success.

### 3. Child UI — new `/child/savings` route

**Add nav link** in `src/routes/child.tsx` between ארנק and ראשי: "חיסכון".

**New file `src/routes/child/savings.tsx`** with three sections:

**A. Savings pot card** (top, mirrors wallet card style)
- Big balance: sum of `savings_credit` rows.
- Subtitle showing current household % ("מועבר אוטומטית: 30% מכל תגמול").
- Below: list of recent savings transactions (date + amount, +signed).

**B. Goals board**
- Header row: "המטרות שלי" + button "הוסף מטרה" (opens dialog).
- Grid of goal cards (responsive `sm:grid-cols-2`):
  - Title, target amount with coin icon.
  - `Progress` bar showing `deposited / target`.
  - "X מתוך Y" tabular-nums.
  - Cycle hint: "20 נקודות כל שבוע".
  - "הפקד עכשיו" button → calls `deposit_to_goal` with `cycle_amount`. Disabled if wallet insufficient or goal completed. Toast on success/error.
  - Completed goals show a check badge + muted styling.
- Empty state with `Target` lucide icon: "עדיין אין מטרות. הוסיפו אחת!"

**C. Add-goal dialog** (shadcn `Dialog`)
- Form fields with zod validation:
  - `title` (1–60 chars)
  - `target_amount` (positive int, ≤ 100000)
  - `cycle_amount` (positive int, ≤ target_amount)
  - `cycle_period` Select: יום / שבוע / חודש
- Inline error messages, submit button disabled while saving, toast on success, dialog closes and goals refresh.

### 4. Files to add/modify

```
NEW src/routes/child/savings.tsx
NEW supabase migration (enum + tables + RPC updates)
EDIT src/routes/child.tsx                  — add "חיסכון" nav link
EDIT src/routes/parent/dashboard.tsx       — add savings % control
EDIT src/routes/child/wallet.tsx           — filter wallet balance by tx types
EDIT src/routes/child/dashboard.tsx        — same balance filter
EDIT src/routes/parent/dashboard.tsx       — balances calculation uses wallet types only
EDIT src/routes/parent/transactions.tsx    — show new tx types with friendly labels
```

Wallet balance everywhere becomes: `sum(amount) where type in ('reward_credit','manual_adjustment','wallet_debit','goal_credit')`.

### 5. RLS summary

- `household_settings`: SELECT for household members; INSERT/UPDATE for parents only.
- `goals`: SELECT for household members; INSERT for child owner (own profile) or parent in household; UPDATE/DELETE for parent in household, plus child can update own goal title before any deposits.
- `transactions`: existing select policy still works; inserts only happen via security-definer RPCs.

### 6. Out of scope (confirm before adding)

- Withdrawing from savings back to wallet.
- Editing goal target after deposits exist.
- Notifications when goal completed.
- Scheduled cycle deposits (your answer "auto from main balance" is interpreted as: a "deposit cycle amount" button on the card — not a true scheduler, since pg_cron setup wasn't requested).

If you want true scheduled auto-deposits (e.g., every Monday at 9am 20pt is pulled), say so and I'll add a pg_cron + `/api/public/cron/goal-deposits` endpoint.
