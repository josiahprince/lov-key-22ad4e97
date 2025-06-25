
-- Create storage buckets for user profile information
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('profile-photos', 'profile-photos', true),
  ('profile-documents', 'profile-documents', false),
  ('profile-media', 'profile-media', true);

-- Create storage policies for profile photos (public bucket)
CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload their own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for profile documents (private bucket)
CREATE POLICY "Users can view their own profile documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'profile-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own profile documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for profile media (public bucket)
CREATE POLICY "Anyone can view profile media"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-media');

CREATE POLICY "Users can upload their own profile media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-media' AND auth.uid()::text = (storage.foldername(name))[1]);
