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

  useEffect(() => {
    const fetchOnboardingData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

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
          setOnboardingData({
            id: data.id,
            mood: data.mood,
            selectedMemes: data.selected_memes,
            perfectSunday: data.perfect_sunday,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          });
        }
      } catch (error) {
        console.error('Error in fetchMatchedUserOnboardingData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOnboardingData();
  }, [userId]);

  return {
    onboardingData,
    loading,
  };
};
