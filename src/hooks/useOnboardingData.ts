
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

      // Check for today's onboarding data - use local timezone
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      const { data, error } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching onboarding data:', error);
        return;
      }

      if (data) {
        // Found today's onboarding data
        setOnboardingData({
          id: data.id,
          mood: data.mood,
          selectedMemes: data.selected_memes,
          perfectSunday: data.perfect_sunday,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
        setShouldShowOnboarding(false);
      } else {
        // No onboarding data for today, show onboarding
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

      // Simply insert new onboarding data for today
      const { data: result, error } = await supabase
        .from('user_onboarding')
        .insert({
          user_id: user.id,
          mood: data.mood,
          selected_memes: data.selectedMemes,
          perfect_sunday: data.perfectSunday,
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

      setShouldShowOnboarding(false);

      // Generate daily matches after onboarding completion
      try {
        await supabase.functions.invoke('generate-daily-matches');
        console.log('Daily matches generated successfully after onboarding');
      } catch (matchError) {
        console.error('Error generating daily matches:', matchError);
        // Don't throw here - onboarding was successful even if match generation failed
      }

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
