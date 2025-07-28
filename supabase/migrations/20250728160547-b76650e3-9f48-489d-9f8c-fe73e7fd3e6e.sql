-- Strengthen RLS policies for better security

-- Update analytics table to require authentication for inserts
DROP POLICY IF EXISTS "Anyone can insert analytics" ON analytics;
CREATE POLICY "Authenticated users can insert analytics" 
ON analytics FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create a more restrictive policy for profile visibility
-- Only show profiles for users who have active public pages
DROP POLICY IF EXISTS "Public can view profiles with active pages" ON profiles;
CREATE POLICY "Public can view limited profile data for active pages" 
ON profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM pages 
    WHERE pages.user_id = profiles.user_id 
    AND pages.is_active = true
  )
);

-- Add user-based rate limiting for link creation to prevent abuse
-- Update the existing link limit check function to be more restrictive
CREATE OR REPLACE FUNCTION public.check_link_limit_enhanced(user_uuid uuid)
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
    user_plan text;
    link_count integer;
    created_today integer;
BEGIN
    -- Get user's current plan
    SELECT plan_name INTO user_plan
    FROM public.subscriptions
    WHERE user_id = user_uuid
    AND status = 'active'
    LIMIT 1;
    
    -- Default to free if no subscription found
    IF user_plan IS NULL THEN
        user_plan := 'free';
    END IF;
    
    -- Count current total links
    SELECT COUNT(*) INTO link_count
    FROM public.links l
    JOIN public.pages p ON l.page_id = p.id
    WHERE p.user_id = user_uuid;
    
    -- Count links created today (rate limiting)
    SELECT COUNT(*) INTO created_today
    FROM public.links l
    JOIN public.pages p ON l.page_id = p.id
    WHERE p.user_id = user_uuid
    AND l.created_at >= CURRENT_DATE;
    
    -- Check daily rate limits
    IF user_plan = 'free' AND created_today >= 5 THEN
        RETURN false;
    END IF;
    
    IF user_plan = 'premium' AND created_today >= 50 THEN
        RETURN false;
    END IF;
    
    -- Check total limits based on plan
    IF user_plan = 'free' AND link_count >= 2 THEN
        RETURN false;
    END IF;
    
    -- Premium users have higher limits
    IF user_plan = 'premium' AND link_count >= 100 THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$;

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
    event_type text,
    user_uuid uuid DEFAULT auth.uid(),
    metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Insert security log (you would create a security_logs table for this)
    -- For now, we'll just use the existing analytics table with a special event type
    INSERT INTO public.analytics (
        event_type,
        page_id,
        created_at,
        user_agent,
        ip_address
    )
    SELECT 
        'security_' || event_type,
        (SELECT id FROM public.pages WHERE user_id = user_uuid LIMIT 1),
        now(),
        'system',
        '127.0.0.1'::inet
    WHERE user_uuid IS NOT NULL;
END;
$$;

-- Add trigger to detect and log suspicious activities
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    recent_count integer;
BEGIN
    -- Check for rapid link creation (potential spam)
    IF TG_TABLE_NAME = 'links' AND TG_OP = 'INSERT' THEN
        SELECT COUNT(*) INTO recent_count
        FROM public.links l
        JOIN public.pages p ON l.page_id = p.id
        WHERE p.user_id = (
            SELECT user_id FROM public.pages WHERE id = NEW.page_id
        )
        AND l.created_at >= now() - interval '5 minutes';
        
        IF recent_count > 10 THEN
            PERFORM public.log_security_event('rapid_link_creation', 
                (SELECT user_id FROM public.pages WHERE id = NEW.page_id),
                jsonb_build_object('count', recent_count)
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS suspicious_activity_trigger ON links;
CREATE TRIGGER suspicious_activity_trigger
    AFTER INSERT ON links
    FOR EACH ROW
    EXECUTE FUNCTION public.detect_suspicious_activity();

-- Add constraint to prevent URL injection attacks
ALTER TABLE links 
DROP CONSTRAINT IF EXISTS valid_url_format;

ALTER TABLE links 
ADD CONSTRAINT valid_url_format 
CHECK (
    url ~ '^https?://[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\..*$' OR
    url ~ '^mailto:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' OR
    url ~ '^tel:\+?[0-9\s\-\(\)\.]{10,}$'
);