import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionData {
  subscribed: boolean;
  plan_name: string;
  in_trial: boolean;
  trial_end: string | null;
  subscription_end: string | null;
  cancel_at_period_end?: boolean;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check auth state
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        checkSubscription();
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkSubscription();
      } else {
        setSubscription(null);
        setLoading(false);
      }
    });

    return () => authSubscription.unsubscribe();
  }, []);

  const checkSubscription = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    if (user) {
      await checkSubscription();
    }
  };

  const isPremium = subscription?.subscribed || false;
  const isFree = !isPremium;
  const isInTrial = subscription?.in_trial || false;
  const isCancelled = subscription?.cancel_at_period_end || false;

  return {
    subscription,
    loading,
    user,
    isPremium,
    isFree,
    isInTrial,
    isCancelled,
    refreshSubscription
  };
};