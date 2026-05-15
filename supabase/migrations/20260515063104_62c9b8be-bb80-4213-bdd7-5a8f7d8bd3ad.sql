DROP POLICY IF EXISTS "Household members can upload task proofs" ON storage.objects;

CREATE POLICY "Assigned child can upload task proof"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-proofs'
  AND ((storage.foldername(name))[1])::uuid = public.get_user_household_id(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.child_profiles cp ON cp.id = t.child_profile_id
    WHERE t.id = ((storage.foldername(name))[2])::uuid
      AND cp.user_id = auth.uid()
      AND t.household_id = ((storage.foldername(name))[1])::uuid
      AND t.status = 'assigned'
  )
);