-- Create a new RLS policy to allow public access to profiles when users have active pages
-- This enables avatar_url, display_name, and bio to be visible on public pages (like Linktree)

CREATE POLICY "Public can view profiles with active pages" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.pages 
    WHERE pages.user_id = profiles.user_id 
    AND pages.is_active = true
  )
);