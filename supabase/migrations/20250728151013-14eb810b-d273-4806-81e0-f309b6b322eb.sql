-- Update subscription plans and add role system
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- Update existing free users
UPDATE public.subscriptions 
SET plan_name = 'free', plan_type = 'free' 
WHERE plan_type = 'free';

-- Create function to check user plan limits
CREATE OR REPLACE FUNCTION public.check_link_limit(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_plan text;
    link_count integer;
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
    
    -- Count current links
    SELECT COUNT(*) INTO link_count
    FROM public.links l
    JOIN public.pages p ON l.page_id = p.id
    WHERE p.user_id = user_uuid;
    
    -- Check limits based on plan
    IF user_plan = 'free' AND link_count >= 2 THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$;