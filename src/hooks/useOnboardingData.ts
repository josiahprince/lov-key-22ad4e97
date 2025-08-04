
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

      // First, ensure user has timezone set
      await detectAndUpdateTimezone(user.id);

      // Use the database function to check if onboarding should be shown
      const { data: shouldShow, error: shouldShowError } = await supabase
        .rpc('should_show_onboarding', { user_id_param: user.id });

      if (shouldShowError) {
        console.error('Error checking onboarding status:', shouldShowError);
        // Fallback to old logic if function fails
        setShouldShowOnboarding(true);
      } else {
        setShouldShowOnboarding(shouldShow);
      }

      // Fetch onboarding data
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching onboarding data:', error);
        return;
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

      toast({
        title: "Profile updated",
        description: "Your preferences have been saved successfully.",
      });

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
