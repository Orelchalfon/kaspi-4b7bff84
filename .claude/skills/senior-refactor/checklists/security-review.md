# Checklist — Security review (Supabase + client)

## Secrets & key exposure

- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` client-side. The service-role client
  (`src/integrations/supabase/client.server.ts`) may only be imported from `*.server.ts`
  files — `importProtection` in `vite.config.ts` enforces this; don't work around it.
- Only the **anon/publishable** key (`VITE_SUPABASE_PUBLISHABLE_KEY`) may ship to the browser.
- Grep the client bundle/source for secrets: service-role keys, tokens, private endpoints.
  No secret should appear outside `*.server.ts` / server env.

## RLS assumptions

- RLS is the real authorization boundary. Client-side checks are UX only — never rely on
  them for security.
- This DB has **no** `has_role()` / `get_user_household_id()` helpers; policies inline
  `SELECT household_id FROM user_roles WHERE user_id = auth.uid()`. Don't assume helpers exist.
- When a query "works" only because you used the service-role client, that's a red flag —
  confirm it would pass under RLS for the intended role.

## Money & ledger integrity

- All money mutations go through **SECURITY DEFINER RPCs**: `approve_task_and_pay`,
  `deposit_to_goal`, `complete_quiz_and_pay`. **Never** insert into `transactions` from the
  client, and never let `child_profiles.current_balance` drift from the wallet ledger.
- Don't add `goal_credit` to the wallet-balance formula (see `database-supabase-review.md`).

## Input validation

- Validate all user/form input with **zod** before use; don't trust client input server-side.
- Server functions use `requireSupabaseAuth` (`src/integrations/supabase/auth-middleware.ts`)
  to validate the `Authorization: Bearer` token — keep that gate on any new server fn.

## Risky client-side code

- No `dangerouslySetInnerHTML` with unsanitized content.
- No building SQL/URLs by string concat from user input.
- Don't log tokens, full user objects, or PII to the console in production paths.

## Do-not-touch without explicit ask

- Supabase **schema, RLS policies, and RPCs** are shared with the mobile app. Never modify
  them as part of a refactor without an explicit request + confirmation.
