import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getMemeDisplayInfo, fetchLatestOnboarding, fetchMainPhotoUrl, fetchMatchedViewProfile } from '@/lib/matchQueries';
import { logError } from '@/lib/errorLogger';
import { MAX_ACTIVE_CHATS, getMatchDayStart } from '@/lib/constants';
import type { MatchRow } from '@/types/domain';

interface MatchProfile {
  id: string;
  userId: string; // The matched user's ID
  name: string;
  age?: number;
  mood: string;
  memes: { emoji: string; title: string }[];
  promptAnswer: string;
  compatibility: number;
  mainPhoto: string | null;
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
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
          .neq('status', 'expired')
          .gte('matched_on', getMatchDayStart().toISOString()),
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

      // The hourly cron normally fills matches; this only covers a user who
      // opens the screen before the next run. The server enforces every cap.
      const canGenerate =
        liveMatches.length === 0 &&
        chatCount < MAX_ACTIVE_CHATS &&
        (todayResult.count ?? 0) < 2;

      if (canGenerate) {
        const { error: generateError } = await supabase.rpc('generate_daily_matches');
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
    const processedMatches: MatchProfile[] = [];

    for (const match of matchesData) {
      // Stop if we already have 2 matches
      if (processedMatches.length >= 2) break;

      // Determine which user is the match (not the current user)
      const isUser1 = match.user_1 === currentUserId;
      const matchUserId = isUser1 ? match.user_2 : match.user_1;

      try {
        // Fetch matched user's safe profile data (RLS-friendly)
        const { data: matchProfile, error: profileError } = await fetchMatchedViewProfile(matchUserId);

        if (profileError) {
          logError(`useMatches:profile:${matchUserId}`, profileError);
        }

        // A match with no resolvable name is not something a user should ever
        // see a placeholder for - skip it rather than rendering "Unknown User".
        if (!matchProfile?.nickname) {
          logError(`useMatches:missingProfile:${matchUserId}`, profileError || 'profiles_matched_view returned no nickname for this match');
          continue;
        }

        // Fetch onboarding data for the match - get the most recent non-pending record
        const { data: matchOnboarding, error: onboardingError } = await fetchLatestOnboarding(matchUserId);

        if (onboardingError) {
          logError(`useMatches:onboarding:${matchUserId}`, onboardingError);
        }

        // Fetch main photo for the match
        const { data: matchPhoto, error: photoError } = await fetchMainPhotoUrl(matchUserId);

        if (photoError) {
          logError(`useMatches:photo:${matchUserId}`, photoError);
        }

        // Show matches even with incomplete data
        const memeInfo = getMemeDisplayInfo(matchOnboarding?.selected_memes || [], matchOnboarding?.selected_memes_display);

        processedMatches.push({
          id: match.id,
          userId: matchUserId, // Add the matched user's ID
          name: matchProfile.nickname,
          age: matchProfile?.age,
          mood: matchOnboarding?.mood || 'chill',
          memes: memeInfo,
          promptAnswer: matchOnboarding?.perfect_sunday || "",
          compatibility: match.match_score || 75,
          mainPhoto: matchPhoto?.photo_url || null,
          city: matchProfile?.city || 'Unknown',
          region: matchProfile?.region,
          country: matchProfile?.country,
          chatRequestStatus: match.chat_request_status || 'none',
          chatRequestSender: match.chat_request_sender,
          expiresAt: match.expires_at
        });
        
      } catch (error) {
        logError(`useMatches:processMatch:${matchUserId}`, error);
        continue;
      }
    }

    setMatches(processedMatches);
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
