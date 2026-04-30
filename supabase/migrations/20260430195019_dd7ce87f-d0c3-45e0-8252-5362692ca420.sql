-- 1. households: parents can update their own household
CREATE POLICY "Parents can update own household"
ON public.households FOR UPDATE
TO authenticated
USING (id = public.get_user_household_id(auth.uid()) AND public.has_role(auth.uid(), 'parent'))
WITH CHECK (id = public.get_user_household_id(auth.uid()) AND public.has_role(auth.uid(), 'parent'));

-- 2. child_profiles: parents can update children in their household
CREATE POLICY "Parents can update children"
ON public.child_profiles FOR UPDATE
TO authenticated
USING (household_id = public.get_user_household_id(auth.uid()) AND public.has_role(auth.uid(), 'parent'))
WITH CHECK (household_id = public.get_user_household_id(auth.uid()) AND public.has_role(auth.uid(), 'parent'));

-- 3. tasks: parents can delete tasks in their household
CREATE POLICY "Parents can delete tasks"
ON public.tasks FOR DELETE
TO authenticated
USING (household_id = public.get_user_household_id(auth.uid()) AND public.has_role(auth.uid(), 'parent'));

-- 4. user_roles: parents can remove children (not themselves, only child role)
CREATE POLICY "Parents can remove children"
ON public.user_roles FOR DELETE
TO authenticated
USING (
  household_id = public.get_user_household_id(auth.uid())
  AND public.has_role(auth.uid(), 'parent')
  AND user_id <> auth.uid()
  AND role = 'child'::app_role
);

-- 5. Harden approve_task: require proof image
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

  -- NEW: require proof image
  IF _task.proof_image_path IS NULL OR length(_task.proof_image_path) = 0 THEN
    RETURN jsonb_build_object('error', 'Cannot approve task without proof image');
  END IF;

  INSERT INTO public.transactions (household_id, child_profile_id, task_id, type, amount, created_by, idempotency_key)
  VALUES (_task.household_id, _task.child_profile_id, _task_id, 'reward_credit', _task.reward_amount, _user_id, 'reward:' || _task_id::text)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO _tx_id;

  IF _tx_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Task already approved');
  END IF;

  UPDATE public.tasks SET status = 'approved', approved_at = now(), updated_at = now()
  WHERE id = _task_id;

  RETURN jsonb_build_object('success', true, 'transaction_id', _tx_id);
END;
$function$;