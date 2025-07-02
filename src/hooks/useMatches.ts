
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMatches = () => {
  const [loading, setLoading] = useState(false);

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
    getUserMatches,
    loading,
  };
};
