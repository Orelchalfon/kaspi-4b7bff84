
-- Allow users to SELECT households they created (needed during signup INSERT...RETURNING)
CREATE POLICY "Users can view households they created"
ON public.households
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Drop the old user_roles INSERT policy that requires an existing role (chicken-and-egg)
DROP POLICY IF EXISTS "Parents can insert roles in own household" ON public.user_roles;

-- Allow a user to insert their OWN parent role when they have no role yet (signup)
-- OR allow parents to insert child roles in their household
CREATE POLICY "Users can insert own parent role or parent can add child"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  (
    -- Self-assigning parent role when no role exists yet (signup flow)
    user_id = auth.uid()
    AND role = 'parent'
    AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
  )
  OR
  (
    -- Existing parent adding a child role in their household
    has_role(auth.uid(), 'parent')
    AND household_id = get_user_household_id(auth.uid())
  )
);
