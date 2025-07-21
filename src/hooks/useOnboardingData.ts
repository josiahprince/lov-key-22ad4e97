
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
        setOnboardingData({
          id: data.id,
          mood: data.mood,
          selectedMemes: data.selected_memes,
          perfectSunday: data.perfect_sunday,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });

        // Check if onboarding was done today
        const lastOnboardingDate = new Date(data.updated_at).toDateString();
        const todayDate = new Date().toDateString();
        
        if (lastOnboardingDate !== todayDate) {
          setShouldShowOnboarding(true);
        } else {
          setShouldShowOnboarding(false);
        }
      } else {
        // No onboarding data exists, show onboarding
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

      // Check if there's existing onboarding data for today
      const today = new Date().toDateString();
      const { data: existingData } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let result;
      let error;

      if (existingData) {
        const existingDate = new Date(existingData.updated_at).toDateString();
        
        if (existingDate === today) {
          // Update existing today's record
          const { data: updateResult, error: updateError } = await supabase
            .from('user_onboarding')
            .update({
              mood: data.mood,
              selected_memes: data.selectedMemes,
              perfect_sunday: data.perfectSunday,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingData.id)
            .select()
            .single();
          
          result = updateResult;
          error = updateError;
        } else {
          // Insert new record for today
          const { data: insertResult, error: insertError } = await supabase
            .from('user_onboarding')
            .insert({
              user_id: user.id,
              mood: data.mood,
              selected_memes: data.selectedMemes,
              perfect_sunday: data.perfectSunday,
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();
          
          result = insertResult;
          error = insertError;
        }
      } else {
        // Insert new record
        const { data: insertResult, error: insertError } = await supabase
          .from('user_onboarding')
          .insert({
            user_id: user.id,
            mood: data.mood,
            selected_memes: data.selectedMemes,
            perfect_sunday: data.perfectSunday,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        result = insertResult;
        error = insertError;
      }

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
