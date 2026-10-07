import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getMemeDisplayInfo, fetchMatchPartner } from '@/lib/matchQueries';
import { logError } from '@/lib/errorLogger';
import type { MatchRow } from '@/types/domain';

interface ChatProfile {
  id: string; // match ID
  userId: string; // The matched user's ID
  name: string;
  age?: number;
  mood: string;
  memes: { emoji: string; title: string }[];
  promptQuestion: string | null;
  promptAnswer: string;
  mainPhoto: string | null;
  // Both people chose to reveal photos; until then the photo is shown blurred.
  photoRevealed: boolean;
  city?: string;
  region?: string;
  country?: string;
  lastInteractionAt: string;
  hasUnreadMessages?: boolean;
}

export const useChats = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchChats = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      setLoading(true);

      // Fetch all accepted chat requests (active chats only, not inactive due to 48h rule)
      const { data: chatMatches, error: chatsError } = await supabase
        .from('matches')
        .select('*, chat_request_status, last_interaction_at')
        .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
        .eq('chat_request_status', 'accepted')
        .in('status', ['active', 'chatting']) // Only active chats, inactive ones are removed by database function
        .order('last_interaction_at', { ascending: false });

      if (chatsError) {
        throw chatsError;
      }

      if (chatMatches && chatMatches.length > 0) {
        await processChats(chatMatches, user.id);
      } else {
        setChats([]);
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load chats. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  const processChats = async (chatMatches: MatchRow[], currentUserId: string) => {
    const cards = await Promise.all(
      chatMatches.map(async (match): Promise<ChatProfile | null> => {
        const matchUserId = match.user_1 === currentUserId ? match.user_2 : match.user_1;
        try {
          const { profile, onboarding, photoUrl, photoRevealed } = await fetchMatchPartner(matchUserId, 'useChats', match.id);

          // A chat with no resolvable name is not something a user should ever
          // see a placeholder for - skip it rather than rendering "Unknown User".
          if (!profile?.nickname) {
            logError(`useChats:missingProfile:${matchUserId}`, 'profiles_matched_view returned no nickname for this match');
            return null;
          }

          // A placeholder onboarding row has nothing real to show yet.
          if (onboarding?.selected_memes?.length === 1 && onboarding.selected_memes[0] === 'pending') {
            logError(`useChats:pendingData:${matchUserId}`, 'Skipping chat with pending onboarding data');
            return null;
          }

          return {
            id: match.id,
            userId: matchUserId,
            name: profile.nickname,
            age: profile.age,
            mood: onboarding?.mood || 'chill',
            memes: getMemeDisplayInfo(onboarding?.selected_memes, onboarding?.selected_memes_display),
            promptQuestion: onboarding?.prompt_question ?? null,
            promptAnswer: onboarding?.perfect_sunday || '',
            mainPhoto: photoUrl,
            photoRevealed,
            city: profile.city || 'Unknown',
            region: profile.region,
            country: profile.country,
            lastInteractionAt: match.last_interaction_at,
            hasUnreadMessages: false,
          };
        } catch (error) {
          logError(`useChats:processChat:${matchUserId}`, error);
          return null;
        }
      })
    );

    setChats(cards.filter((card): card is ChatProfile => card !== null));
  };

  useEffect(() => {
    // Nothing to subscribe to while logged out - Realtime rejects an
    // unauthenticated subscription to a RLS-protected table outright, which
    // was surfacing as a spurious CLOSED status on the login screen.
    if (!user) {
      return;
    }

    fetchChats();

    // Set up real-time subscription for matches table with unique channel ID
    const channelId = `matches-updates-${Date.now()}-${Math.random()}`;
    const matchesChannel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches'
        },
        () => {
          // Refetch chats when matches are updated with longer delay for DB propagation
          setTimeout(() => fetchChats(), 800);
        }
      )
      .subscribe((status) => {
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          logError("useChats:subscription", `Subscription status: ${status}`);
        }
      });

    return () => {
      supabase.removeChannel(matchesChannel);
    };
  }, [fetchChats, user]);

  return {
    chats,
    loading,
    refetch: fetchChats
  };
};
