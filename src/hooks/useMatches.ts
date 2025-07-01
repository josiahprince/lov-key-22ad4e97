
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MatchResult {
  matches_created: number;
  users_processed: number;
}

export const useMatches = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateMatches = async (): Promise<MatchResult | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('generate_daily_matches');
      
      if (error) {
        console.error('Error generating matches:', error);
        toast({
          title: "Error",
          description: "Failed to generate matches. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      const result = data[0] as MatchResult;
      
      toast({
        title: "Matches Generated!",
        description: `Created ${result.matches_created} matches for ${result.users_processed} users.`,
      });

      return result;
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getUserMatches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return [];
      }

      console.log('Fetching matches for user:', user.id);

      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          user_1,
          user_2,
          matched_on,
          match_score,
          status,
          profiles_user_1:profiles!matches_user_1_fkey(first_name, last_name, age, city),
          profiles_user_2:profiles!matches_user_2_fkey(first_name, last_name, age, city)
        `)
        .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
        .eq('status', 'active')
        .order('matched_on', { ascending: false });

      if (error) {
        console.error('Error fetching matches:', error);
        return [];
      }

      console.log('Fetched matches:', data);
      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching matches:', error);
      return [];
    }
  };

  return {
    generateMatches,
    getUserMatches,
    loading,
  };
};
