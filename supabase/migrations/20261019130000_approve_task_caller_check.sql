-- Applied to project jlpvjxywfvijntsctvaq on 2026-10-19 via Supabase MCP.
-- Security fix: approve_task_and_pay (SECURITY DEFINER) performed no caller
-- authorization — any caller, including anon via /rest/v1/rpc, who knew a
-- submitted task's id could pay it out, and a child could submit their own task
-- and approve it themselves. Now only a parent of the task's household may
-- approve, and EXECUTE is revoked from anon.
--
-- Signature, return type (boolean), idempotency and the savings split are
-- unchanged (the mobile app calls this too). Unauthorized callers get an
-- exception (SQLSTATE 42501), matching the function's existing RAISE-on-error
-- style. A missing task id raises the same 'Not authorized' error so outsiders
-- can't probe which task ids exist.

CREATE OR REPLACE FUNCTION public.approve_task_and_pay(p_task_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_household_id uuid;
  v_task RECORD; v_pct integer := 0; v_save numeric := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT household_id INTO v_household_id FROM public.tasks WHERE id = p_task_id;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_user AND ur.role = 'parent' AND ur.household_id = v_household_id
  ) THEN
    RAISE EXCEPTION 'Not authorized for this task' USING ERRCODE = '42501';
  END IF;

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

REVOKE EXECUTE ON FUNCTION public.approve_task_and_pay(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_task_and_pay(uuid) TO authenticated;
