import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMatchedUserProfile = (matchId: string | undefined, currentUserId: string | undefined) => {
  const [matchedUserProfile, setMatchedUserProfile] = useState<any>(null);
  const [matchedUserId, setMatchedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const instanceIdRef = useRef<string>(Math.random().toString(36).substring(7));

  useEffect(() => {
    if (!matchId || !currentUserId) {
      setLoading(false);
      return;
    }

    // Clean up existing subscription before creating new one
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
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

        // Get the matched user's profile from the secure view (excludes sensitive data)
        const { data: profile, error: profileError } = await supabase
          .from('profiles_matched_view')
          .select('*')
          .eq('id', otherUserId)
          .single();

        if (profileError) throw profileError;

        setMatchedUserProfile(profile);

        // Set up real-time subscription for the matched user's profile
        // Note: We subscribe to the base table but only expose safe fields in state
        const channelName = `matched-profile-${otherUserId}-${instanceIdRef.current}`;
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${otherUserId}`,
            },
            async () => {
              // Re-fetch from secure view to get only safe fields
              const { data: updatedProfile } = await supabase
                .from('profiles_matched_view')
                .select('*')
                .eq('id', otherUserId)
                .single();
              if (updatedProfile) {
                setMatchedUserProfile(updatedProfile);
              }
            }
          )
          .subscribe();

        subscriptionRef.current = channel;
      } catch (error) { /* no-op */ } finally {
        setLoading(false);
      }
    };

    fetchMatchedUserProfile();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [matchId, currentUserId]);

  return {
    matchedUserProfile,
    matchedUserId,
    loading,
  };
};
