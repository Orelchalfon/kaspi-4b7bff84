-- Applied to project flxhxmrtdqegfsupvvus on 2026-05-25 via Supabase MCP.
-- Adds two RPCs that involve the savings pot, on top of the existing
-- approve_task_and_pay + deposit_to_goal RPCs:
--   * deposit_savings_to_goal — child or household-parent deposits from the
--     savings pot into a goal (savings_credit -amt + goal_credit +amt).
--   * deposit_to_savings — child moves money from wallet into the savings pot
--     (wallet_debit -amt + savings_credit +amt).
-- Savings debits are represented as negative 'savings_credit' rows so the pot
-- formula stays a one-liner: SUM(amount) WHERE type='savings_credit'.
-- No schema changes; the existing transactions_type_check already permits
-- negative amounts on savings_credit.

CREATE OR REPLACE FUNCTION public.deposit_savings_to_goal(_goal_id uuid, _amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_goal RECORD; v_user uuid := auth.uid();
  v_savings numeric := 0; v_deposited numeric := 0; v_ok boolean := false;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('error','Not authenticated'); END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('error','Amount must be positive');
  END IF;

  SELECT * INTO v_goal FROM public.goals WHERE id = _goal_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','Goal not found'); END IF;
  IF v_goal.status <> 'active' THEN
    RETURN jsonb_build_object('error','Goal is not active');
  END IF;

  IF EXISTS (SELECT 1 FROM public.child_profiles cp
             WHERE cp.id = v_goal.child_id AND cp.user_id = v_user) THEN
    v_ok := true;
  ELSIF EXISTS (SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = v_user
                  AND ur.role = 'parent'
                  AND ur.household_id = v_goal.household_id) THEN
    v_ok := true;
  END IF;
  IF NOT v_ok THEN
    RETURN jsonb_build_object('error','Not authorized for this goal');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_savings
  FROM public.transactions
  WHERE child_id = v_goal.child_id AND type = 'savings_credit';
  IF v_savings < _amount THEN
    RETURN jsonb_build_object('error','Insufficient savings balance');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_deposited
  FROM public.transactions
  WHERE goal_id = _goal_id AND type = 'goal_credit';
  IF v_deposited + _amount > v_goal.target_amount THEN
    RETURN jsonb_build_object('error','Deposit would exceed goal target');
  END IF;

  INSERT INTO public.transactions (household_id, child_id, type, amount, goal_id)
  VALUES (v_goal.household_id, v_goal.child_id, 'savings_credit', -_amount, _goal_id);
  INSERT INTO public.transactions (household_id, child_id, type, amount, goal_id)
  VALUES (v_goal.household_id, v_goal.child_id, 'goal_credit', _amount, _goal_id);

  IF v_deposited + _amount >= v_goal.target_amount THEN
    UPDATE public.goals SET status = 'completed', updated_at = now() WHERE id = _goal_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deposited', v_deposited + _amount,
    'target', v_goal.target_amount,
    'savings_after', v_savings - _amount
  );
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
  WHERE child_id = v_cp.id AND type IN ('task_reward','manual_adjustment','wallet_debit');
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
