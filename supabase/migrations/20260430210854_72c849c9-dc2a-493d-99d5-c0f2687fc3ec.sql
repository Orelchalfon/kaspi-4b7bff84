
-- 1. Extend transaction_type enum
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'savings_credit';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'wallet_debit';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'goal_credit';

-- 2. household_settings
CREATE TABLE public.household_settings (
  household_id UUID PRIMARY KEY REFERENCES public.households(id) ON DELETE CASCADE,
  savings_percentage INTEGER NOT NULL DEFAULT 0 CHECK (savings_percentage >= 0 AND savings_percentage <= 100),
  updated_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.household_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view settings"
ON public.household_settings FOR SELECT TO authenticated
USING (household_id = public.get_user_household_id(auth.uid()));

CREATE POLICY "Parents can insert settings"
ON public.household_settings FOR INSERT TO authenticated
WITH CHECK (household_id = public.get_user_household_id(auth.uid()) AND public.has_role(auth.uid(), 'parent'));

CREATE POLICY "Parents can update settings"
ON public.household_settings FOR UPDATE TO authenticated
USING (household_id = public.get_user_household_id(auth.uid()) AND public.has_role(auth.uid(), 'parent'))
WITH CHECK (household_id = public.get_user_household_id(auth.uid()) AND public.has_role(auth.uid(), 'parent'));

-- 3. goals
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  child_profile_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 60),
  target_amount INTEGER NOT NULL CHECK (target_amount > 0 AND target_amount <= 100000),
  cycle_amount INTEGER NOT NULL CHECK (cycle_amount > 0),
  cycle_period TEXT NOT NULL CHECK (cycle_period IN ('day','week','month')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goals_child ON public.goals(child_profile_id);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view goals"
ON public.goals FOR SELECT TO authenticated
USING (household_id = public.get_user_household_id(auth.uid()));

CREATE POLICY "Child owner can create own goals"
ON public.goals FOR INSERT TO authenticated
WITH CHECK (
  household_id = public.get_user_household_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'parent')
    OR EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = goals.child_profile_id AND cp.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Parents can update goals"
ON public.goals FOR UPDATE TO authenticated
USING (household_id = public.get_user_household_id(auth.uid()) AND public.has_role(auth.uid(), 'parent'))
WITH CHECK (household_id = public.get_user_household_id(auth.uid()) AND public.has_role(auth.uid(), 'parent'));

CREATE POLICY "Child can update own goal title"
ON public.goals FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = goals.child_profile_id AND cp.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = goals.child_profile_id AND cp.user_id = auth.uid())
);

CREATE POLICY "Parents can delete goals"
ON public.goals FOR DELETE TO authenticated
USING (household_id = public.get_user_household_id(auth.uid()) AND public.has_role(auth.uid(), 'parent'));

CREATE TRIGGER update_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. transactions: add goal_id
ALTER TABLE public.transactions
ADD COLUMN goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;

-- 5. Update approve_task to also route savings %
CREATE OR REPLACE FUNCTION public.approve_task(_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _task RECORD;
  _user_id UUID;
  _tx_id UUID;
  _pct INTEGER := 0;
  _save_amount INTEGER := 0;
BEGIN
  _user_id := auth.uid();

  SELECT * INTO _task FROM public.tasks WHERE id = _task_id;

  IF _task IS NULL THEN
    RETURN jsonb_build_object('error', 'Task not found');
  END IF;

  IF NOT public.has_role(_user_id, 'parent') THEN
    RETURN jsonb_build_object('error', 'Only parents can approve tasks');
  END IF;

  IF public.get_user_household_id(_user_id) <> _task.household_id THEN
    RETURN jsonb_build_object('error', 'Task not in your household');
  END IF;

  IF _task.status <> 'submitted' THEN
    RETURN jsonb_build_object('error', 'Task must be in submitted status');
  END IF;

  IF _task.proof_image_path IS NULL OR length(_task.proof_image_path) = 0 THEN
    RETURN jsonb_build_object('error', 'Cannot approve task without proof image');
  END IF;

  -- Reward credit (full amount to wallet)
  INSERT INTO public.transactions (household_id, child_profile_id, task_id, type, amount, created_by, idempotency_key)
  VALUES (_task.household_id, _task.child_profile_id, _task_id, 'reward_credit', _task.reward_amount, _user_id, 'reward:' || _task_id::text)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO _tx_id;

  IF _tx_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Task already approved');
  END IF;

  -- Pull savings percentage
  SELECT savings_percentage INTO _pct
  FROM public.household_settings
  WHERE household_id = _task.household_id;

  IF _pct IS NULL THEN _pct := 0; END IF;

  IF _pct > 0 THEN
    _save_amount := floor(_task.reward_amount * _pct / 100.0)::int;
    IF _save_amount > 0 THEN
      INSERT INTO public.transactions (household_id, child_profile_id, task_id, type, amount, created_by, idempotency_key)
      VALUES (_task.household_id, _task.child_profile_id, _task_id, 'wallet_debit', -_save_amount, _user_id, 'save-debit:' || _task_id::text)
      ON CONFLICT (idempotency_key) DO NOTHING;

      INSERT INTO public.transactions (household_id, child_profile_id, task_id, type, amount, created_by, idempotency_key)
      VALUES (_task.household_id, _task.child_profile_id, _task_id, 'savings_credit', _save_amount, _user_id, 'save-credit:' || _task_id::text)
      ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
  END IF;

  UPDATE public.tasks SET status = 'approved', approved_at = now(), updated_at = now()
  WHERE id = _task_id;

  RETURN jsonb_build_object('success', true, 'transaction_id', _tx_id, 'savings_amount', _save_amount);
END;
$function$;

-- 6. deposit_to_goal RPC
CREATE OR REPLACE FUNCTION public.deposit_to_goal(_goal_id uuid, _amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _goal RECORD;
  _user_id UUID;
  _wallet_balance INTEGER := 0;
  _deposited INTEGER := 0;
  _key_suffix TEXT;
  _is_authorized BOOLEAN := FALSE;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('error', 'Amount must be positive');
  END IF;

  SELECT * INTO _goal FROM public.goals WHERE id = _goal_id;
  IF _goal IS NULL THEN
    RETURN jsonb_build_object('error', 'Goal not found');
  END IF;

  IF _goal.status <> 'active' THEN
    RETURN jsonb_build_object('error', 'Goal is not active');
  END IF;

  -- Authorize: child owner OR parent in household
  IF EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = _goal.child_profile_id AND cp.user_id = _user_id) THEN
    _is_authorized := TRUE;
  ELSIF public.has_role(_user_id, 'parent') AND public.get_user_household_id(_user_id) = _goal.household_id THEN
    _is_authorized := TRUE;
  END IF;

  IF NOT _is_authorized THEN
    RETURN jsonb_build_object('error', 'Not authorized for this goal');
  END IF;

  -- Wallet balance = sum of all wallet-affecting tx types
  SELECT COALESCE(SUM(amount), 0) INTO _wallet_balance
  FROM public.transactions
  WHERE child_profile_id = _goal.child_profile_id
    AND type IN ('reward_credit','manual_adjustment','wallet_debit','goal_credit');

  IF _wallet_balance < _amount THEN
    RETURN jsonb_build_object('error', 'Insufficient wallet balance');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO _deposited
  FROM public.transactions
  WHERE goal_id = _goal_id AND type = 'goal_credit';

  IF _deposited + _amount > _goal.target_amount THEN
    RETURN jsonb_build_object('error', 'Deposit would exceed goal target');
  END IF;

  _key_suffix := gen_random_uuid()::text;

  INSERT INTO public.transactions (household_id, child_profile_id, task_id, goal_id, type, amount, created_by, idempotency_key)
  VALUES (_goal.household_id, _goal.child_profile_id, NULL, _goal_id, 'wallet_debit', -_amount, _user_id, 'goal-debit:' || _key_suffix);

  INSERT INTO public.transactions (household_id, child_profile_id, task_id, goal_id, type, amount, created_by, idempotency_key)
  VALUES (_goal.household_id, _goal.child_profile_id, NULL, _goal_id, 'goal_credit', _amount, _user_id, 'goal-credit:' || _key_suffix);

  IF _deposited + _amount >= _goal.target_amount THEN
    UPDATE public.goals SET status = 'completed', updated_at = now() WHERE id = _goal_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'deposited', _deposited + _amount, 'target', _goal.target_amount);
END;
$function$;
