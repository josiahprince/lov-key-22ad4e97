
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OnboardingData {
  id?: string;
  mood: string;
  selectedMemes: string[];
  perfectSunday: string;
  createdAt?: string;
  updatedAt?: string;
  lastOnboardingDate?: string;
  onboardingShownToday?: boolean;
}

export const useOnboardingData = () => {
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
        
      console.log(`Updated timezone to ${timezone} for user ${userId}`);
      return timezone;
    } catch (error) {
      console.error('Error detecting/updating timezone:', error);
      return 'Asia/Kolkata'; // Fallback
    }
  };

  const fetchOnboardingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First, ensure user has timezone set and capture it
      const timezone = await detectAndUpdateTimezone(user.id);

      // Ask DB if it's after 6 AM and what's today's date in user's timezone
      const [{ data: isAfter6am }, { data: todayInTz }] = await Promise.all([
        supabase.rpc('is_after_6am_in_timezone', { user_timezone: timezone }),
        supabase.rpc('get_date_in_timezone', { user_timezone: timezone }),
      ]);

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
        console.error('Error fetching onboarding data:', error);
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
      if (isAfter6am) {
        if (!data) {
          // No valid (non-pending) record found → show onboarding
          computedShouldShow = true;
        } else if (!data.last_onboarding_date || data.last_onboarding_date < todayInTz) {
          computedShouldShow = true; // New day → show
        } else if (data.last_onboarding_date === todayInTz && data.onboarding_shown_today !== true) {
          computedShouldShow = true; // Not shown yet today after 6am
        }
      }

      // Also try the server-side decision. If it errors, fall back to computed value.
      let serverDecision = computedShouldShow;
      const { data: shouldShow, error: shouldShowError } = await supabase
        .rpc('should_show_onboarding', { user_id_param: user.id });
      if (shouldShowError) {
        console.warn('should_show_onboarding RPC failed, using computed fallback:', shouldShowError?.message);
      } else if (typeof shouldShow === 'boolean') {
        serverDecision = shouldShow;
      }

      console.log('Onboarding decision:', { 
        computedShouldShow, 
        serverDecision, 
        isAfter6am, 
        hasValidData: !!data && data.mood !== 'pending_daily_update' 
      });

      setShouldShowOnboarding(serverDecision || computedShouldShow);
    } catch (error) {
      console.error('Error in fetchOnboardingData:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveOnboardingData = async (data: Omit<OnboardingData, 'id' | 'createdAt' | 'updatedAt' | 'lastOnboardingDate' | 'onboardingShownToday'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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

      // Trigger daily match generation after successful onboarding
      try {
        console.log('Triggering daily match generation after onboarding completion...');
        const { data: matchResult, error: matchError } = await supabase.functions.invoke('generate-daily-matches');
        
        if (matchError) {
          console.error('Error generating matches:', matchError);
        } else {
          console.log('Match generation successful:', matchResult);
          toast({
            title: "Profile updated",
            description: "Your preferences have been saved and new matches are being generated!",
          });
        }
      } catch (error) {
        console.error('Error invoking match generation:', error);
        toast({
          title: "Profile updated",
          description: "Your preferences have been saved successfully.",
        });
      }

      return result;
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      toast({
        title: "Error",
        description: "Failed to save your preferences. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchOnboardingData();
  }, []);

  return {
    onboardingData,
    loading,
    shouldShowOnboarding,
    saveOnboardingData,
    refetch: fetchOnboardingData,
  };
};
