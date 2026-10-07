import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getMemeDisplayInfo, fetchMatchPartner, fetchTodayMatchCount } from '@/lib/matchQueries';
import { logError } from '@/lib/errorLogger';
import { DAILY_MATCH_LIMIT, MAX_ACTIVE_CHATS } from '@/lib/constants';
import type { MatchRow } from '@/types/domain';

export interface MatchProfile {
  id: string;
  userId: string; // The matched user's ID
  name: string;
  age?: number;
  mood: string;
  memes: { emoji: string; title: string }[];
  promptAnswer: string;
  promptQuestion: string;
  compatibility: number;
  mainPhoto: string | null;
  // Both people chose to reveal photos; until then the photo is shown blurred.
  photoRevealed: boolean;
  city?: string;
  region?: string;
  country?: string;
  chatRequestStatus: string;
  chatRequestSender?: string;
  expiresAt?: string;
}

export const useMatches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatCount, setActiveChatCount] = useState(0);
  const { toast } = useToast();

  const fetchTodayMatches = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to view matches",
        variant: "destructive"
      });
      return;
    }
    try {
      setLoading(true);

      const fetchLiveMatches = () => supabase
        .from('matches')
        .select('*')
        .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .limit(10);

      const [liveResult, chatsResult, todayResult] = await Promise.all([
        fetchLiveMatches(),
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
          .in('status', ['active', 'chatting'])
          .eq('chat_request_status', 'accepted'),
        fetchTodayMatchCount(user.id),
      ]);

      if (liveResult.error) {
        throw liveResult.error;
      }
      if (chatsResult.error) {
        logError("useMatches:activeChats", chatsResult.error);
      }
      if (todayResult.error) {
        logError("useMatches:todayMatches", todayResult.error);
      }

      const chatCount = chatsResult.count ?? 0;
      setActiveChatCount(chatCount);

      let liveMatches = liveResult.data ?? [];

      // The hourly cron also fills matches; this tops up an open slot as soon
      // as the screen opens, so both of today's matches show together when
      // they're available. The server enforces every cap.
      const canGenerate =
        liveMatches.length < DAILY_MATCH_LIMIT &&
        chatCount < MAX_ACTIVE_CHATS &&
        (todayResult.count ?? 0) < DAILY_MATCH_LIMIT;

      if (canGenerate) {
        const { error: generateError } = await supabase.rpc('generate_my_daily_matches');
        if (generateError) {
          logError("useMatches:generateDaily", generateError);
        } else {
          const { data: newMatches, error: refetchError } = await fetchLiveMatches();
          if (refetchError) {
            logError("useMatches:refetchAfterGenerate", refetchError);
          }
          liveMatches = newMatches ?? [];
        }
      }

      await processMatches(liveMatches, user.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load matches. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const processMatches = async (matchesData: MatchRow[], currentUserId: string) => {
    const cards = await Promise.all(
      matchesData.map(async (match): Promise<MatchProfile | null> => {
        const matchUserId = match.user_1 === currentUserId ? match.user_2 : match.user_1;
        try {
          const { profile, onboarding, photoUrl, photoRevealed } = await fetchMatchPartner(matchUserId, 'useMatches', match.id);

          // A match with no resolvable name is not something a user should ever
          // see a placeholder for - skip it rather than rendering "Unknown User".
          if (!profile?.nickname) {
            logError(`useMatches:missingProfile:${matchUserId}`, 'profiles_matched_view returned no nickname for this match');
            return null;
          }

          // Show matches even with incomplete onboarding data.
          return {
            id: match.id,
            userId: matchUserId,
            name: profile.nickname,
            age: profile.age,
            mood: onboarding?.mood || 'chill',
            memes: getMemeDisplayInfo(onboarding?.selected_memes, onboarding?.selected_memes_display),
            promptAnswer: onboarding?.perfect_sunday || '',
            promptQuestion: onboarding?.prompt_question || 'Describe your perfect Sunday',
            compatibility: match.match_score || 75,
            mainPhoto: photoUrl,
            photoRevealed,
            city: profile.city || 'Unknown',
            region: profile.region,
            country: profile.country,
            chatRequestStatus: match.chat_request_status || 'none',
            chatRequestSender: match.chat_request_sender,
            expiresAt: match.expires_at,
          };
        } catch (error) {
          logError(`useMatches:processMatch:${matchUserId}`, error);
          return null;
        }
      })
    );

    setMatches(cards.filter((card): card is MatchProfile => card !== null).slice(0, DAILY_MATCH_LIMIT));
  };

  useEffect(() => {
    fetchTodayMatches();
  }, [fetchTodayMatches]);

  return {
    matches,
    loading,
    activeChatCount,
    chatLimitReached: activeChatCount >= MAX_ACTIVE_CHATS,
    refetch: fetchTodayMatches
  };
};
