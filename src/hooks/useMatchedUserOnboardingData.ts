import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingData {
  id?: string;
  mood: string;
  selectedMemes: string[];
  perfectSunday: string;
  createdAt?: string;
  updatedAt?: string;
}

export const useMatchedUserOnboardingData = (userId: string | undefined) => {
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);

  const mapDataToOnboarding = (data: any): OnboardingData => ({
    id: data.id,
    mood: data.mood,
    selectedMemes: data.selected_memes,
    perfectSunday: data.perfect_sunday,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchOnboardingData = async () => {
      try {
        const { data, error } = await supabase
          .from('user_onboarding')
          .select('*')
          .eq('user_id', userId)
          .neq('mood', 'pending_daily_update')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching matched user onboarding data:', error);
        }

        if (data) {
          setOnboardingData(mapDataToOnboarding(data));
        }
      } catch (error) {
        console.error('Error in fetchMatchedUserOnboardingData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOnboardingData();

    // Subscribe to real-time updates for the matched user's onboarding data
    const channel = supabase
      .channel(`matched-user-onboarding-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_onboarding',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setOnboardingData(null);
          } else if (payload.new && (payload.new as any).mood !== 'pending_daily_update') {
            setOnboardingData(mapDataToOnboarding(payload.new));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    onboardingData,
    loading,
  };
};
