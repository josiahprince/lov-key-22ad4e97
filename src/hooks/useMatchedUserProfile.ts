import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMatchedUserProfile = (matchId: string | undefined, currentUserId: string | undefined) => {
  const [matchedUserProfile, setMatchedUserProfile] = useState<any>(null);
  const [matchedUserId, setMatchedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId || !currentUserId) {
      setLoading(false);
      return;
    }

    const fetchMatchedUserProfile = async () => {
      try {
        // First get the match to find the other user
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single();

        if (matchError) throw matchError;

        // Determine which user is the matched user (not current user)
        const otherUserId = match.user_1 === currentUserId ? match.user_2 : match.user_1;
        setMatchedUserId(otherUserId);

        // Get the matched user's profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .single();

        if (profileError) throw profileError;

        setMatchedUserProfile(profile);
      } catch (error) {
        console.error('Error fetching matched user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchedUserProfile();

    // Subscribe to real-time updates for the matched user's profile
    // We need to set up the subscription after we know the matchedUserId
    const setupRealtimeSubscription = async () => {
      const { data: match } = await supabase
        .from('matches')
        .select('user_1, user_2')
        .eq('id', matchId)
        .single();

      if (!match) return null;

      const otherUserId = match.user_1 === currentUserId ? match.user_2 : match.user_1;

      const channel = supabase
        .channel(`matched-user-profile-${otherUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${otherUserId}`,
          },
          (payload) => {
            console.log('Profile updated in real-time:', payload);
            setMatchedUserProfile(payload.new);
          }
        )
        .subscribe();

      return channel;
    };

    let channel: any = null;
    setupRealtimeSubscription().then(ch => {
      channel = ch;
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [matchId, currentUserId]);

  return {
    matchedUserProfile,
    matchedUserId,
    loading,
  };
};
