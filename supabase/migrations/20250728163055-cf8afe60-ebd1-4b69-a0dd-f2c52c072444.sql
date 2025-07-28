-- Create trigger to enforce link limits before insertion
CREATE OR REPLACE FUNCTION public.enforce_link_limit()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that runs before link insertion
CREATE TRIGGER enforce_link_limit_trigger
    BEFORE INSERT ON public.links
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_link_limit();

-- Update RLS policy for links to include limit check
DROP POLICY IF EXISTS "Users can manage links on own pages" ON public.links;

CREATE POLICY "Users can manage links on own pages" ON public.links
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.pages 
        WHERE pages.id = links.page_id 
        AND pages.user_id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.pages 
        WHERE pages.id = links.page_id 
        AND pages.user_id = auth.uid()
    ) AND (
        TG_OP = 'UPDATE' OR 
        TG_OP = 'DELETE' OR 
        public.check_link_limit_enhanced(auth.uid())
    )
);