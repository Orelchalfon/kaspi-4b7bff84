-- Replace permissive bootstrap policy with one that requires the user
-- to be the creator of the household they're claiming as parent.
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
    WHERE h.id = household_id
      AND h.created_by = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.household_id = household_id
      AND ur2.role = 'parent'::app_role
  )
);