
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
      if (!user) {
        setLoading(false);
        return;
      }

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
          { data: boolean | null; error: any },
          { data: string | null; error: any }
        ];
        
        isAfter6am = results[0]?.data ?? true;
        todayInTz = results[1]?.data ?? todayInTz;
      } catch (rpcError) {
        console.warn('RPC calls failed or timed out, using defaults:', rpcError);
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
        ]) as { data: boolean | null; error: any };
        
        if (serverResult && typeof serverResult.data === 'boolean') {
          serverDecision = serverResult.data;
        }
      } catch (shouldShowError) {
        console.warn('should_show_onboarding RPC failed or timed out, using computed fallback:', shouldShowError);
      }

      const finalDecision = serverDecision || computedShouldShow;

      console.log('🔍 Onboarding decision details:', { 
        computedShouldShow, 
        serverDecision, 
        isAfter6am, 
        todayInTz,
        lastOnboardingDate: data?.last_onboarding_date,
        onboardingShownToday: data?.onboarding_shown_today,
        hasValidData: !!data && data.mood !== 'pending_daily_update',
        hasAnyRecord,
        finalDecision
      });

      console.log(`🎯 Setting shouldShowOnboarding to: ${finalDecision}`);
      setShouldShowOnboarding(finalDecision);
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
      
      // Force update the local state immediately to prevent re-showing
      console.log('✅ Onboarding completed, flag set to false for today');

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
    let isMounted = true;
    let isInitialized = false;
    let currentUserId: string | null = null;
    
    const initOnboarding = async () => {
      if (isInitialized) return; // Prevent duplicate initialization
      isInitialized = true;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (isMounted && user) {
        currentUserId = user.id;
        await fetchOnboardingData();
      } else if (isMounted) {
        // No user, set loading to false immediately
        setLoading(false);
      }
    };
    
    initOnboarding();

    // Subscribe to auth changes - only refetch on actual user change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted || !isInitialized) return;
      
      const newUserId = session?.user?.id || null;
      
      // User logged out
      if (!newUserId && currentUserId) {
        console.log('🔄 User logged out, resetting onboarding state');
        currentUserId = null;
        setOnboardingData(null);
        setLoading(false);
        setShouldShowOnboarding(false);
      }
      // Different user logged in (not just session refresh)
      else if (newUserId && newUserId !== currentUserId) {
        console.log('🔄 New user logged in, fetching onboarding data');
        currentUserId = newUserId;
        setLoading(true);
        await fetchOnboardingData();
      }
      // Same user, session refresh - don't refetch to avoid showing onboarding again
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    onboardingData,
    loading,
    shouldShowOnboarding,
    saveOnboardingData,
    refetch: fetchOnboardingData,
  };
};
