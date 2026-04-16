
# KidCoin MVP — Task → Approval → Reward Ledger

## Stack
- **TanStack Start** (SSR, file-based routing, server functions)
- **Supabase Auth** (email/password, built-in)
- **Supabase Postgres** (RLS, RPC for financial operations)
- **Tailwind CSS** (RTL-first with `dir="rtl"`)
- **TanStack Query** (data fetching/caching)
- **Zod** (validation)
- **Hebrew + RTL** from day 1 (hardcoded Hebrew UI, RTL layout)

## Core Loop (MVP scope only)
1. Parent signs up → creates household
2. Parent creates child (child gets login credentials)
3. Parent creates task with reward amount
4. Child logs in → sees assigned tasks → submits task
5. Parent reviews → approves/rejects
6. Approval creates immutable transaction via RPC (never direct balance writes)
7. Child sees updated balance (derived from transaction ledger)

## Database Schema

**Tables:**
- `households` — id, name, created_by (user_id)
- `user_roles` — user_id, role (parent/child), household_id
- `child_profiles` — id, user_id, household_id, display_name
- `tasks` — id, household_id, child_profile_id, created_by, title, description, reward_amount, status (assigned/submitted/approved/rejected), submitted_at, approved_at
- `transactions` — id, household_id, child_profile_id, task_id, type (reward_credit), amount, created_at, created_by, idempotency_key (unique on task_id+type)

**Key rules:**
- RLS scoped by household on every table
- Balance = `SUM(amount) FROM transactions WHERE child_profile_id = X`
- Task approval via Supabase RPC (atomic: verify→insert transaction→update task status)
- Unique constraint on transactions(task_id, type) prevents double-credit

## Routes

```
(public)
  /                → Landing / redirect to dashboard
  /login           → Supabase Auth login
  /signup          → Supabase Auth signup

(parent — protected)
  /parent/dashboard    → Overview: children, pending tasks
  /parent/children     → List children
  /parent/children/new → Create child account
  /parent/tasks/new    → Create task with reward
  /parent/tasks/:id    → Review/approve/reject task
  /parent/transactions → View all transactions

(child — protected)
  /child/dashboard     → My tasks summary + balance
  /child/tasks/:id     → View task details, submit
  /child/wallet        → Transaction history + balance
```

## Key UX Details
- **RTL layout**: `<html lang="he" dir="rtl">`, all Tailwind utilities use logical properties (start/end instead of left/right)
- **Role-based routing**: `_parent` and `_child` layout routes with `beforeLoad` guards checking user role
- **Parent dashboard**: Shows children list, pending submissions count, quick actions
- **Child dashboard**: Shows assigned tasks, current balance (from ledger), recent activity
- **Task approval flow**: Parent sees submission → taps approve → RPC creates transaction atomically → UI updates
- **Empty states**: Meaningful Hebrew text for no children, no tasks, no transactions

## Build Phases

**Phase 1**: App shell — Supabase Auth (login/signup), role detection, RTL layout, route guards
**Phase 2**: Database schema + RLS + RPC for approval
**Phase 3**: Household + child creation flow (parent)
**Phase 4**: Task creation (parent) + task list/submission (child)
**Phase 5**: Approval flow + transaction ledger + balance view
**Phase 6**: Dashboard polish, loading/error/empty states

## NOT in this MVP
- Admin dashboard
- Quizzes / educational modules
- Notifications
- Savings goals
- Recurring tasks
- Card/payment integrations
- Analytics
