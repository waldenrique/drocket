-- Create storage policies for avatar uploads
-- Allow authenticated users to upload their own avatars

-- Policy to allow users to upload their own avatar files
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow users to update their own avatar files
CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow users to view their own avatar files
CREATE POLICY "Users can view their own avatar" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow users to delete their own avatar files
CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to view avatar images (for public pages)
CREATE POLICY "Anyone can view avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');