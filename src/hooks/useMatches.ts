import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getMemeDisplayInfo, fetchLatestOnboarding, fetchMainPhotoUrl, fetchMatchedViewProfile } from '@/lib/matchQueries';
import { logError } from '@/lib/errorLogger';
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

      // Fetch active matches (including accepted ones to show "Go to Chats" button)
      // Only exclude chats that have messages (they belong in the chats screen)
      const { data: todayMatches, error: matchesError } = await supabase
        .from('matches')
        .select('*, chat_request_status, chat_request_sender, expires_at')
        .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
        .eq('status', 'active') // Only active status for matches screen (chatting status goes to chats)
        .gt('expires_at', new Date().toISOString()) // Only non-expired matches
        .limit(10);

      if (matchesError) {
        throw matchesError;
      }

      // Check how many matches were created TODAY (regardless of current status)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data: todayCreatedMatches, error: todayMatchesError } = await supabase
        .from('matches')
        .select('id, status, chat_request_status, created_at')
        .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
        .gte('matched_on', todayStart.toISOString());

      if (todayMatchesError) {
        logError("useMatches:todayMatches", todayMatchesError);
      }

      const matchesCreatedToday = todayCreatedMatches?.length || 0;

      // If user already has 2 matches created today, don't generate more (regardless of status)
      if (matchesCreatedToday >= 2) {
        if (todayMatches && todayMatches.length > 0) {
          await processMatches(todayMatches, user.id);
        } else {
          setMatches([]);
        }
        return;
      }

      // If we get here, user has less than 2 matches created today
      // Check if we should generate new ones
      if (!todayMatches || todayMatches.length === 0) {
        
        // Check how many active chats the user has
        const { data: activeChats, error: chatsError } = await supabase
          .from('matches')
          .select('id')
          .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
          .in('status', ['active', 'chatting'])
          .eq('chat_request_status', 'accepted');

        if (chatsError) {
          logError("useMatches:activeChats", chatsError);
        }

        const activeChatCount = activeChats?.length || 0;
        
        if (activeChatCount >= 6) {
          toast({
            title: "Chat limit reached",
            description: "You have 6 active chats. New matches will be available when some chats expire (48 hours of inactivity).",
            variant: "default"
          });
          setMatches([]);
          return;
        }

        // Try to generate new matches using the RPC function
        const { data: generationResult, error: generateError } = await supabase
          .rpc('generate_daily_matches');
        
        if (generateError) {
          logError("useMatches:generateDaily", generateError);
        } else if (generationResult && generationResult.length > 0) {
          const result = generationResult[0];
          
          // Check if the current user was skipped due to chat limit
          if (result.users_skipped_chat_limit > 0 && result.matches_created === 0) {
            toast({
              title: "Chat Limit Reached",
              description: "You have reached the maximum of 6 active chats. New matches will be available when some chats expire.",
              variant: "default",
            });
          }
        }
        
        // Retry fetching after generation attempt
        const { data: newMatches } = await supabase
          .from('matches')
          .select('*, chat_request_status, chat_request_sender, expires_at')
          .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString());

        if (newMatches) {
          await processMatches(newMatches, user.id);
        } else {
          setMatches([]);
        }
      } else {
        await processMatches(todayMatches, user.id);
      }

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
          name: matchProfile?.nickname || 'Unknown User',
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
    refetch: fetchTodayMatches
  };
};
