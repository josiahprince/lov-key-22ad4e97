-- Make profile-photos bucket private for secure access
UPDATE storage.buckets 
SET public = false 
WHERE id = 'profile-photos';

-- Create RLS policy for profile-photos bucket to allow authenticated uploads/management
-- Drop existing policies first if they exist
DROP POLICY IF EXISTS "Users can upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own photos storage" ON storage.objects;

-- Create policies for users to manage their own photos
CREATE POLICY "Users can upload own photos" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'profile-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own photos" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'profile-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own photos" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'profile-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can always view their own photos in storage
CREATE POLICY "Users can view own photos storage" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'profile-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);