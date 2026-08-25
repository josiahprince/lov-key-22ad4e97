
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { logError } from '@/lib/errorLogger';
import type { PostgrestError } from '@supabase/supabase-js';
import type { MappedOnboardingData } from '@/types/domain';

type OnboardingData = MappedOnboardingData;

export const useOnboardingData = () => {
  const { user } = useAuth();
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const { toast } = useToast();

  const detectAndUpdateTimezone = async (userId: string) => {
    try {
      // Detect user's timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Update user's timezone in profile
      await supabase
        .from('profiles')
        .update({ timezone })
        .eq('id', userId);
        
      return timezone;
    } catch (error) {
      return 'Asia/Kolkata'; // Fallback
    }
  };

  const fetchOnboardingData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      // First, ensure user has timezone set and capture it
      const timezone = await detectAndUpdateTimezone(user.id);

      // Add timeout to RPC calls to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RPC timeout')), 5000)
      );

      let isAfter6am = true; // Default to true
      let todayInTz = new Date().toISOString().split('T')[0]; // Fallback to today

      try {
        // Ask DB if it's after 6 AM and what's today's date in user's timezone
        const results = await Promise.race([
          Promise.all([
            supabase.rpc('is_after_6am_in_timezone', { user_timezone: timezone }),
            supabase.rpc('get_date_in_timezone', { user_timezone: timezone }),
          ]),
          timeoutPromise
        ]) as [
          { data: boolean | null; error: PostgrestError | null },
          { data: string | null; error: PostgrestError | null }
        ];
        
        isAfter6am = results[0]?.data ?? true;
        todayInTz = results[1]?.data ?? todayInTz;
      } catch (rpcError) {
        // Continue with defaults
      }

      // Fetch latest onboarding data - get the most recent non-pending record
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .neq('mood', 'pending_daily_update')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // If no valid onboarding data found, check if there are any records at all
      let hasAnyRecord = false;
      if (!data) {
        const { data: anyRecord } = await supabase
          .from('user_onboarding')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        hasAnyRecord = !!anyRecord;
      }

      if (error) {
        logError("useOnboardingData:fetchOnboarding", error);
      }

      if (data) {
        setOnboardingData({
          id: data.id,
          mood: data.mood,
          selectedMemes: data.selected_memes,
          perfectSunday: data.perfect_sunday,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          lastOnboardingDate: data.last_onboarding_date,
          onboardingShownToday: data.onboarding_shown_today,
        });
      }

      // Compute whether onboarding should be shown today (client-side safeguard)
      let computedShouldShow = false;
      
      // For NEW users (no onboarding data), ALWAYS show onboarding regardless of time
      if (!data) {
        computedShouldShow = true;
      } else if (isAfter6am) {
        // For existing users, check if it's a new day after 6 AM
        if (!data.last_onboarding_date || data.last_onboarding_date < todayInTz) {
          computedShouldShow = true; // New day → show
        } else if (data.last_onboarding_date === todayInTz && data.onboarding_shown_today !== true) {
          computedShouldShow = true; // Not shown yet today after 6am
        }
      }

      // Also try the server-side decision. If it errors, fall back to computed value.
      let serverDecision = computedShouldShow;
      try {
        const serverResult = await Promise.race([
          supabase.rpc('should_show_onboarding', { user_id_param: user.id }),
          timeoutPromise
        ]) as { data: boolean | null; error: PostgrestError | null };
        
        if (serverResult && typeof serverResult.data === 'boolean') {
          serverDecision = serverResult.data;
        }
      } catch (shouldShowError) {
        logError("useOnboardingData:shouldShowOnboarding", shouldShowError);
      }

      const finalDecision = serverDecision || computedShouldShow;

      setShouldShowOnboarding(finalDecision);
    } catch (error) {
      logError("useOnboardingData:fetchOnboardingData", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveOnboardingData = async (data: Omit<OnboardingData, 'id' | 'createdAt' | 'updatedAt' | 'lastOnboardingDate' | 'onboardingShownToday'>) => {
    try {
      if (!user) throw new Error('User not authenticated');

      // Get user's timezone for date calculation
      const { data: profile } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', user.id)
        .single();

      const timezone = profile?.timezone || 'Asia/Kolkata';

      // Get today's date in user's timezone using the database function
      const { data: todayInTz } = await supabase
        .rpc('get_date_in_timezone', { user_timezone: timezone });

      const { data: result, error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: user.id,
          mood: data.mood,
          selected_memes: data.selectedMemes,
          perfect_sunday: data.perfectSunday,
          updated_at: new Date().toISOString(),
          onboarding_shown_today: true,
          last_onboarding_date: todayInTz,
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;

      setOnboardingData({
        id: result.id,
        mood: result.mood,
        selectedMemes: result.selected_memes,
        perfectSunday: result.perfect_sunday,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        lastOnboardingDate: result.last_onboarding_date,
        onboardingShownToday: result.onboarding_shown_today,
      });

      // Mark that onboarding should not be shown again today
      setShouldShowOnboarding(false);
      
      // Force update the local state immediately to prevent re-showing

      // Match generation is handled by the database cron job (runs periodically)
      // Just show success message - matches will be generated automatically
      toast({
        title: "Profile updated",
        description: "Your preferences have been saved! New matches will appear soon.",
      });

      return result;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your preferences. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      fetchOnboardingData();
    } else {
      setLoading(false);
    }
  }, [user, fetchOnboardingData]);

  return {
    onboardingData,
    loading,
    shouldShowOnboarding,
    saveOnboardingData,
    refetch: fetchOnboardingData,
  };
};
