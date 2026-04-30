
-- Fix 1: Child UPDATE on tasks — restrict columns via SECURITY DEFINER RPC and tighten RLS
DROP POLICY IF EXISTS "Children can update own tasks" ON public.tasks;

CREATE OR REPLACE FUNCTION public.submit_task(_task_id uuid, _proof_image_path text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _task RECORD;
  _user_id UUID;
  _child_profile_id UUID;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT id INTO _child_profile_id
  FROM public.child_profiles
  WHERE user_id = _user_id
  LIMIT 1;

  IF _child_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Only children can submit tasks');
  END IF;

  SELECT * INTO _task FROM public.tasks WHERE id = _task_id;
  IF _task IS NULL THEN
    RETURN jsonb_build_object('error', 'Task not found');
  END IF;

  IF _task.child_profile_id != _child_profile_id THEN
    RETURN jsonb_build_object('error', 'Not your task');
  END IF;

  IF _task.status != 'assigned' THEN
    RETURN jsonb_build_object('error', 'Task cannot be submitted in its current status');
  END IF;

  IF _proof_image_path IS NULL OR length(_proof_image_path) = 0 THEN
    RETURN jsonb_build_object('error', 'Proof image required');
  END IF;

  UPDATE public.tasks
  SET status = 'submitted',
      submitted_at = now(),
      proof_image_path = _proof_image_path,
      updated_at = now()
  WHERE id = _task_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_task(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_task(uuid, text) TO authenticated;

-- Fix 2: user_roles bootstrap policy — fix self-referential alias bug
DROP POLICY IF EXISTS "Users can bootstrap own parent role" ON public.user_roles;

CREATE POLICY "Users can bootstrap own parent role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'parent'::app_role
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.households h
    WHERE h.id = user_roles.household_id AND h.created_by = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.household_id = user_roles.household_id
      AND ur2.role = 'parent'::app_role
  )
);

-- Fix 3: storage task-proofs — scope UPDATE to child's own task & add DELETE policy for parents
DROP POLICY IF EXISTS "Household members can update task proofs" ON storage.objects;

CREATE POLICY "Children can update own task proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'task-proofs'
  AND ((storage.foldername(name))[1])::uuid = public.get_user_household_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.child_profiles cp ON cp.id = t.child_profile_id
    WHERE t.proof_image_path = storage.objects.name
      AND cp.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'task-proofs'
  AND ((storage.foldername(name))[1])::uuid = public.get_user_household_id(auth.uid())
);

CREATE POLICY "Parents can delete household task proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-proofs'
  AND ((storage.foldername(name))[1])::uuid = public.get_user_household_id(auth.uid())
  AND public.has_role(auth.uid(), 'parent'::app_role)
);

-- Fix 4: lock down SECURITY DEFINER function execution to authenticated only
REVOKE EXECUTE ON FUNCTION public.approve_task(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_task(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role_in_household(uuid, app_role, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role_in_household(uuid, app_role, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_household_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_household_id(uuid) TO authenticated;
