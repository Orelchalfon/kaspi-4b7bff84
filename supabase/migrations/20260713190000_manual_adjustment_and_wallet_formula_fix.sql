-- Applied to project flxhxmrtdqegfsupvvus via Supabase MCP.
-- 1) New RPC: manual_adjustment — household-parent-only wallet adjustment
--    (give or take points). Inserts a single 'manual_adjustment' transaction
--    and keeps child_profiles.current_balance in sync. Rejects a negative
--    amount that would drive the wallet balance below zero.
-- 2) Bugfix: deposit_to_goal and deposit_to_savings computed their wallet-
--    balance guard as type IN ('task_reward','manual_adjustment','wallet_debit'),
--    omitting 'quiz_reward'. That contradicted the canonical wallet formula in
--    src/lib/transactions.ts (WALLET_TX_TYPES) and CLAUDE.md, and caused false
--    "insufficient balance" errors for children whose only income was quiz
--    rewards. Both are CREATE OR REPLACE with no signature change — just the
--    wallet SUM's type list gains 'quiz_reward'.

CREATE OR REPLACE FUNCTION public.manual_adjustment(_child_id uuid, _amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_cp RECORD;
  v_wallet numeric := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;
  IF _amount IS NULL OR _amount = 0 THEN
    RETURN jsonb_build_object('error', 'Amount must be non-zero');
  END IF;

  SELECT * INTO v_cp FROM public.child_profiles WHERE id = _child_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Child not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_user AND ur.role = 'parent' AND ur.household_id = v_cp.household_id
  ) THEN
    RETURN jsonb_build_object('error', 'Not authorized for this child');
  END IF;

  IF _amount < 0 THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_wallet
    FROM public.transactions
    WHERE child_id = _child_id
      AND type IN ('task_reward','manual_adjustment','wallet_debit','quiz_reward');
    IF v_wallet + _amount < 0 THEN
      RETURN jsonb_build_object('error', 'Adjustment would make wallet negative');
    END IF;
  END IF;

  INSERT INTO public.transactions (household_id, child_id, type, amount)
  VALUES (v_cp.household_id, _child_id, 'manual_adjustment', _amount);

  UPDATE public.child_profiles
    SET current_balance = current_balance + _amount
  WHERE id = _child_id;

  RETURN jsonb_build_object('success', true, 'amount', _amount);
END $$;


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
  WHERE child_id = v_goal.child_id AND type IN ('task_reward','manual_adjustment','wallet_debit','quiz_reward');
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


CREATE OR REPLACE FUNCTION public.deposit_to_savings(_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_cp RECORD;
  v_wallet numeric := 0;
  v_savings numeric := 0;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('error','Not authenticated'); END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('error','Amount must be positive');
  END IF;

  SELECT * INTO v_cp FROM public.child_profiles WHERE user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error','Only children can move money to savings');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_wallet
  FROM public.transactions
  WHERE child_id = v_cp.id AND type IN ('task_reward','manual_adjustment','wallet_debit','quiz_reward');
  IF v_wallet < _amount THEN
    RETURN jsonb_build_object('error','Insufficient wallet balance');
  END IF;

  INSERT INTO public.transactions (household_id, child_id, type, amount)
  VALUES (v_cp.household_id, v_cp.id, 'wallet_debit', -_amount);
  INSERT INTO public.transactions (household_id, child_id, type, amount)
  VALUES (v_cp.household_id, v_cp.id, 'savings_credit', _amount);

  UPDATE public.child_profiles
     SET current_balance = current_balance - _amount
   WHERE id = v_cp.id;

  SELECT COALESCE(SUM(amount), 0) INTO v_savings
  FROM public.transactions
  WHERE child_id = v_cp.id AND type = 'savings_credit';

  RETURN jsonb_build_object(
    'success', true,
    'wallet', v_wallet - _amount,
    'savings', v_savings
  );
END $$;
