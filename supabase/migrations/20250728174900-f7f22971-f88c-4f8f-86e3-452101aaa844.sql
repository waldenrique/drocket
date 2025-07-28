-- Add unique constraint to user_id in subscriptions table if it doesn't exist
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_unique;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);