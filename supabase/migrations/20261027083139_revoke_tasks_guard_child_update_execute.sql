-- Applied to project jlpvjxywfvijntsctvaq on 2026-10-27 via Supabase MCP (version 20261027083139).
-- Clears the advisor lint "anon/authenticated can execute SECURITY DEFINER function" for the
-- trigger added in 20261027070954_harden_child_write_policies.sql.
-- Trigger-only function: nothing should call it over /rest/v1/rpc. Triggers don't check
-- the invoking user's EXECUTE privilege, so tasks_guard_child_update keeps firing
-- (verified with a rolled-back probe: child reward edit still raises 42501, child submit and
-- parent edit still work).
revoke execute on function public.tasks_guard_child_update() from public, anon, authenticated;
