
-- Create separate storage buckets for main and additional photos
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('main-profile-photos', 'main-profile-photos', true),
  ('additional-profile-photos', 'additional-profile-photos', true);

-- Create storage policies for main profile photos
CREATE POLICY "Anyone can view main profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'main-profile-photos');

CREATE POLICY "Users can upload their own main profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'main-profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own main profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'main-profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own main profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'main-profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for additional profile photos
CREATE POLICY "Anyone can view additional profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'additional-profile-photos');

CREATE POLICY "Users can upload their own additional profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'additional-profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own additional profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'additional-profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own additional profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'additional-profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
