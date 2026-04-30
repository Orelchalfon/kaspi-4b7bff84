
-- Add proof image column to tasks
ALTER TABLE public.tasks ADD COLUMN proof_image_path text;

-- Create private storage bucket for task proof images
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-proofs', 'task-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: household members can view proof images for their household
-- File path convention: {household_id}/{task_id}/{filename}
CREATE POLICY "Household members can view task proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-proofs'
  AND (storage.foldername(name))[1]::uuid = public.get_user_household_id(auth.uid())
);

CREATE POLICY "Household members can upload task proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-proofs'
  AND (storage.foldername(name))[1]::uuid = public.get_user_household_id(auth.uid())
);

CREATE POLICY "Household members can update task proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'task-proofs'
  AND (storage.foldername(name))[1]::uuid = public.get_user_household_id(auth.uid())
);
