-- Fix security issue: Set search_path for the function
CREATE OR REPLACE FUNCTION public.enforce_link_limit()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
    page_user_id uuid;
    can_add_link boolean;
BEGIN
    -- Get the user_id from the page
    SELECT user_id INTO page_user_id
    FROM public.pages
    WHERE id = NEW.page_id;
    
    -- Check if user can add more links
    SELECT public.check_link_limit_enhanced(page_user_id) INTO can_add_link;
    
    IF NOT can_add_link THEN
        RAISE EXCEPTION 'Link limit exceeded for your current plan. Upgrade to Premium for unlimited links.';
    END IF;
    
    RETURN NEW;
END;
$$;