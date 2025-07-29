
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
}

export const useOnboardingData = () => {
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const { toast } = useToast();

  const fetchOnboardingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        // Check if it's pending daily update
        const isPendingUpdate = data.mood === 'pending_daily_update' || 
                               data.selected_memes?.includes('pending') ||
                               data.perfect_sunday === 'pending_daily_update';

        if (isPendingUpdate) {
          // Get the previous day's valid data
          const { data: previousData, error: prevError } = await supabase
            .from('user_onboarding')
            .select('*')
            .eq('user_id', user.id)
            .neq('mood', 'pending_daily_update')
            .not('selected_memes', 'cs', '["pending"]')
            .neq('perfect_sunday', 'pending_daily_update')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!prevError && previousData) {
            // Show previous day's data but mark for update
            setOnboardingData({
              id: previousData.id,
              mood: previousData.mood,
              selectedMemes: previousData.selected_memes,
              perfectSunday: previousData.perfect_sunday,
              createdAt: previousData.created_at,
              updatedAt: previousData.updated_at,
            });
            setShouldShowOnboarding(true);
          } else {
            // No previous data, show fresh onboarding
            setOnboardingData(null);
            setShouldShowOnboarding(true);
          }
        } else {
          // Valid current data
          setOnboardingData({
            id: data.id,
            mood: data.mood,
            selectedMemes: data.selected_memes,
            perfectSunday: data.perfect_sunday,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          });

          // Check if onboarding needs to be done today based on 6AM reset
          const lastOnboardingDate = new Date(data.updated_at);
          const today = new Date();
          
          // Check if it's a new day and past 6 AM
          const isNewDay = lastOnboardingDate.toDateString() !== today.toDateString();
          const isPast6AM = today.getHours() >= 6;
          
          if (isNewDay && isPast6AM) {
            setShouldShowOnboarding(true);
          } else {
          setShouldShowOnboarding(false);
          }
        }
      } else {
        // No onboarding data exists, show onboarding
        setOnboardingData(null);
        setShouldShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error in fetchOnboardingData:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveOnboardingData = async (data: Omit<OnboardingData, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: result, error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: user.id,
          mood: data.mood,
          selected_memes: data.selectedMemes,
          perfect_sunday: data.perfectSunday,
          updated_at: new Date().toISOString(),
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
      });

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
