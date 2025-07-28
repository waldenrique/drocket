-- First, let's see what policies currently exist for storage.objects
-- Remove any conflicting policies and create new ones

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Create simple and working policies for avatar uploads
-- Policy 1: Allow authenticated users to upload to avatars bucket
CREATE POLICY "Allow authenticated uploads to avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Policy 2: Allow authenticated users to update files in avatars bucket
CREATE POLICY "Allow authenticated updates to avatars" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Policy 3: Allow anyone to view avatars (public access)
CREATE POLICY "Allow public read access to avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

-- Policy 4: Allow authenticated users to delete from avatars bucket
CREATE POLICY "Allow authenticated deletes from avatars" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);