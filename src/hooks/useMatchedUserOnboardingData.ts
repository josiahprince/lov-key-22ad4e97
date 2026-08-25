import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchLatestOnboarding } from '@/lib/matchQueries';
import { logError } from '@/lib/errorLogger';
import type { OnboardingRow, MappedOnboardingData } from '@/types/domain';

type OnboardingData = MappedOnboardingData;

export const useMatchedUserOnboardingData = (userId: string | undefined) => {
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const instanceIdRef = useRef<string>(Math.random().toString(36).substring(7));

  const mapDataToOnboarding = (data: OnboardingRow): OnboardingData => ({
    id: data.id,
    mood: data.mood,
    selectedMemes: data.selected_memes,
    selectedMemesDisplay: data.selected_memes_display as OnboardingData['selectedMemesDisplay'],
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
        const { data, error } = await fetchLatestOnboarding(userId);

        if (error) {
          logError(`useMatchedUserOnboardingData:fetch:${userId}`, error);
        }

        if (data) {
          setOnboardingData(mapDataToOnboarding(data));
        }
      } catch (error) {
        logError(`useMatchedUserOnboardingData:fetchOnboardingData:${userId}`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchOnboardingData();

    // Clean up existing subscription before creating new one
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Subscribe to real-time updates for the matched user's onboarding data
    const channelName = `matched-onboarding-${userId}-${instanceIdRef.current}`;
    const channel = supabase
      .channel(channelName)
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
          } else if (payload.new && (payload.new as OnboardingRow).mood !== 'pending_daily_update') {
            setOnboardingData(mapDataToOnboarding(payload.new as OnboardingRow));
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [userId]);

  return {
    onboardingData,
    loading,
  };
};
