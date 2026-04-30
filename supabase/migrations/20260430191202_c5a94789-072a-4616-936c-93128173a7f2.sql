-- Add household-scoped has_role function
CREATE OR REPLACE FUNCTION public.has_role_in_household(_user_id uuid, _role app_role, _household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND household_id = _household_id
  )
$$;

-- Replace overly permissive INSERT policy on user_roles
DROP POLICY IF EXISTS "Users can insert own parent role or parent can add child" ON public.user_roles;

-- Only allow a user to bootstrap their OWN parent role (first role only).
-- Child roles are created exclusively via the server's service-role client
-- (see src/server/create-child.ts), which bypasses RLS by design.
CREATE POLICY "Users can bootstrap own parent role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'parent'::app_role
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
  )
);