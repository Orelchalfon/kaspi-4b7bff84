-- Applied to project jlpvjxywfvijntsctvaq on 2026-10-27 via Supabase MCP (version 20261027070954).
-- Hardens child write access. Gaps closed (live policies as of 2026-10-19):
--  1. "tasks: update own household" (UPDATE, any household member, no WITH CHECK): a child
--     could change reward_amount / title / status of any household task, e.g. inflate the
--     reward of their submitted task right before the parent approves it.
--  2. "parent can manage own household settings" (ALL, any household member): despite its
--     name it let a CHILD write savings_percentage / quiz_reward_amount (up to 1000) and then
--     collect it through complete_quiz_and_pay.
--  3. "goals: update own household": a child could edit a sibling's goals.
--  4. "tasks: insert own household": a child could create tasks for themselves and submit them.
--  5. anon held EXECUTE on complete_quiz_and_pay and manual_adjustment (both check the caller
--     internally, so this is defense in depth).
--
-- Verified before applying with a dry run on prod inside an aborted transaction (nothing
-- persisted): every gap reproduced before and was blocked after, and these flows kept working:
-- parent create / edit / reject / approve_task_and_pay, child submit (assigned -> submitted),
-- child create/edit own goals, deposit_to_goal, deposit_to_savings, complete_quiz_and_pay,
-- parent household_settings update + upsert, manual_adjustment, anon get_gift_target.
-- After applying: kaspii-web pnpm test 97/97, kasp-mobile test:integration 14/14.
--
-- Not addressed here (needs a product decision): complete_quiz_and_pay trusts the
-- client-reported _correct/_total, so a modified client can always "pass". Fixing it means
-- server-side question delivery/grading.

-- ---------------------------------------------------------------- tasks ----

drop policy if exists "tasks: insert own household" on public.tasks;
create policy "tasks: insert by household parent" on public.tasks
  for insert
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'parent' and ur.household_id = tasks.household_id
    )
  );

drop policy if exists "tasks: update own household" on public.tasks;

create policy "tasks: update by household parent" on public.tasks
  for update
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'parent' and ur.household_id = tasks.household_id
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'parent' and ur.household_id = tasks.household_id
    )
  );

-- A child may only move their own task from assigned to submitted.
create policy "tasks: child submits own assigned task" on public.tasks
  for update
  using (
    status = 'assigned'
    and exists (select 1 from public.child_profiles cp where cp.id = tasks.child_id and cp.user_id = auth.uid())
  )
  with check (
    status = 'submitted'
    and exists (select 1 from public.child_profiles cp where cp.id = tasks.child_id and cp.user_id = auth.uid())
  );

-- RLS can't restrict columns, so freeze everything but status/submitted_at for children.
-- Runs before tasks_status_timestamps (trigger names fire alphabetically).
create or replace function public.tasks_guard_child_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from child_profiles cp where cp.id = old.child_id and cp.user_id = auth.uid()) then
    if new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.reward_amount is distinct from old.reward_amount
      or new.child_id is distinct from old.child_id
      or new.household_id is distinct from old.household_id
      or new.created_by_parent_id is distinct from old.created_by_parent_id
      or new.reviewed_at is distinct from old.reviewed_at
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Children can only submit their tasks' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_guard_child_update on public.tasks;
create trigger tasks_guard_child_update
  before update on public.tasks
  for each row execute function public.tasks_guard_child_update();

-- ---------------------------------------------------- household_settings ----

drop policy if exists "parent can manage own household settings" on public.household_settings;

create policy "household_settings: read own household" on public.household_settings
  for select
  using (household_id in (select ur.household_id from public.user_roles ur where ur.user_id = auth.uid()));

create policy "household_settings: write by household parent" on public.household_settings
  for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'parent' and ur.household_id = household_settings.household_id
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'parent' and ur.household_id = household_settings.household_id
    )
  );

-- ----------------------------------------------------------------- goals ----

drop policy if exists "goals: update own household" on public.goals;
create policy "goals: update by parent or child owner" on public.goals
  for update
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'parent' and ur.household_id = goals.household_id
    )
    or exists (select 1 from public.child_profiles cp where cp.id = goals.child_id and cp.user_id = auth.uid())
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'parent' and ur.household_id = goals.household_id
    )
    or exists (select 1 from public.child_profiles cp where cp.id = goals.child_id and cp.user_id = auth.uid())
  );

-- ------------------------------------------------------------- grants ----

-- Both carry a PUBLIC EXECUTE grant (=X/postgres) that anon inherits, so revoking from anon
-- alone is a no-op. authenticated and service_role keep their explicit grants.
revoke execute on function public.complete_quiz_and_pay(text, integer, integer) from public, anon;
revoke execute on function public.manual_adjustment(uuid, integer) from public, anon;

