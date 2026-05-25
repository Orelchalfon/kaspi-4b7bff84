-- Applied to project flxhxmrtdqegfsupvvus on 2026-05-18 via Supabase MCP.
-- Adds savings + goals on top of the existing schema. Additive only —
-- column names follow live conventions (child_id, reference_task_id).

-- 1) Extend transaction type CHECK with savings_credit, wallet_debit, goal_credit
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('task_reward','manual_adjustment','goal_allocation',
                  'savings_credit','wallet_debit','goal_credit'));

-- 2) goals table
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 60),
  target_amount integer NOT NULL CHECK (target_amount > 0 AND target_amount <= 100000),
  cycle_amount integer NOT NULL CHECK (cycle_amount > 0),
  cycle_period text NOT NULL CHECK (cycle_period IN ('day','week','month')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_goals_child ON public.goals(child_id);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals: read own household" ON public.goals FOR SELECT
USING (household_id IN (SELECT household_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "goals: insert by parent or child owner" ON public.goals FOR INSERT
WITH CHECK (
  household_id IN (SELECT household_id FROM public.user_roles WHERE user_id = auth.uid())
  AND (
    EXISTS (SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'parent' AND ur.household_id = goals.household_id)
    OR EXISTS (SELECT 1 FROM public.child_profiles cp
               WHERE cp.id = goals.child_id AND cp.user_id = auth.uid())
  )
);

CREATE POLICY "goals: update own household" ON public.goals FOR UPDATE
USING (household_id IN (SELECT household_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "goals: delete by parent" ON public.goals FOR DELETE
USING (EXISTS (SELECT 1 FROM public.user_roles ur
               WHERE ur.user_id = auth.uid() AND ur.role = 'parent' AND ur.household_id = goals.household_id));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS set_goals_updated_at ON public.goals;
CREATE TRIGGER set_goals_updated_at BEFORE UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) goal_id on transactions
ALTER TABLE public.transactions
  ADD COLUMN goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL;
CREATE INDEX idx_transactions_goal ON public.transactions(goal_id) WHERE goal_id IS NOT NULL;

-- 4) approve_task_and_pay: routes savings %, keeps signature/return type
CREATE OR REPLACE FUNCTION public.approve_task_and_pay(p_task_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_task RECORD; v_pct integer := 0; v_save numeric := 0;
BEGIN
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id AND status='submitted' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Task not found or not in submitted state'; END IF;
  IF EXISTS (SELECT 1 FROM public.transactions WHERE reference_task_id = p_task_id) THEN
    RETURN true;
  END IF;

  UPDATE public.tasks SET status='approved', reviewed_at = now() WHERE id = p_task_id;

  INSERT INTO public.transactions (household_id, child_id, type, amount, reference_task_id)
  VALUES (v_task.household_id, v_task.child_id, 'task_reward', v_task.reward_amount, p_task_id);

  SELECT savings_percentage INTO v_pct FROM public.household_settings WHERE household_id = v_task.household_id;
  IF v_pct IS NULL THEN v_pct := 0; END IF;

  IF v_pct > 0 THEN
    v_save := floor(v_task.reward_amount * v_pct / 100.0);
    IF v_save > 0 THEN
      INSERT INTO public.transactions (household_id, child_id, type, amount, reference_task_id)
      VALUES (v_task.household_id, v_task.child_id, 'wallet_debit', -v_save, p_task_id);
      INSERT INTO public.transactions (household_id, child_id, type, amount, reference_task_id)
      VALUES (v_task.household_id, v_task.child_id, 'savings_credit', v_save, p_task_id);
    END IF;
  END IF;

  UPDATE public.child_profiles
    SET current_balance = current_balance + v_task.reward_amount - v_save
  WHERE id = v_task.child_id;

  RETURN true;
END $$;

-- 5) deposit_to_goal RPC
CREATE OR REPLACE FUNCTION public.deposit_to_goal(_goal_id uuid, _amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_goal RECORD; v_user uuid := auth.uid();
  v_wallet numeric := 0; v_deposited numeric := 0; v_ok boolean := false;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('error','Not authenticated'); END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RETURN jsonb_build_object('error','Amount must be positive'); END IF;

  SELECT * INTO v_goal FROM public.goals WHERE id = _goal_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','Goal not found'); END IF;
  IF v_goal.status <> 'active' THEN RETURN jsonb_build_object('error','Goal is not active'); END IF;

  IF EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = v_goal.child_id AND cp.user_id = v_user) THEN
    v_ok := true;
  ELSIF EXISTS (SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = v_user AND ur.role='parent' AND ur.household_id = v_goal.household_id) THEN
    v_ok := true;
  END IF;
  IF NOT v_ok THEN RETURN jsonb_build_object('error','Not authorized for this goal'); END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_wallet FROM public.transactions
  WHERE child_id = v_goal.child_id AND type IN ('task_reward','manual_adjustment','wallet_debit');
  IF v_wallet < _amount THEN RETURN jsonb_build_object('error','Insufficient wallet balance'); END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_deposited FROM public.transactions
  WHERE goal_id = _goal_id AND type = 'goal_credit';
  IF v_deposited + _amount > v_goal.target_amount THEN
    RETURN jsonb_build_object('error','Deposit would exceed goal target');
  END IF;

  INSERT INTO public.transactions (household_id, child_id, type, amount, goal_id)
  VALUES (v_goal.household_id, v_goal.child_id, 'wallet_debit', -_amount, _goal_id);
  INSERT INTO public.transactions (household_id, child_id, type, amount, goal_id)
  VALUES (v_goal.household_id, v_goal.child_id, 'goal_credit', _amount, _goal_id);

  UPDATE public.child_profiles SET current_balance = current_balance - _amount WHERE id = v_goal.child_id;

  IF v_deposited + _amount >= v_goal.target_amount THEN
    UPDATE public.goals SET status='completed', updated_at = now() WHERE id = _goal_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'deposited', v_deposited + _amount, 'target', v_goal.target_amount);
END $$;
