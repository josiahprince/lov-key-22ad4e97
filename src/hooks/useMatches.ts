import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MatchProfile {
  id: string;
  userId: string; // The matched user's ID
  name: string;
  age?: number;
  mood: string;
  memes: { emoji: string; title: string }[];
  promptAnswer: string;
  compatibility: number;
  mainPhoto: string;
  city?: string;
  region?: string;
  country?: string;
  chatRequestStatus: string;
  chatRequestSender?: string;
  expiresAt?: string;
}

export const useMatches = () => {
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Remove local calculation since we now use the score from the database

  const getMemeDisplayInfo = (selectedMemes: string[]) => {
    const memeMap: { [key: string]: { emoji: string; title: string } } = {
      'meme1': { emoji: '☕', title: 'Coffee Lover' },
      'meme2': { emoji: '📚', title: 'Book Worm' },
      'meme3': { emoji: '🌱', title: 'Plant Parent' },
      'meme4': { emoji: '🦉', title: 'Night Owl' },
      'meme5': { emoji: '🍜', title: 'Foodie' },
      'meme6': { emoji: '🏏', title: 'Cricket Fanatic' },
      'meme7': { emoji: '🌧️', title: 'Monsoon Mood' },
      'meme8': { emoji: '🚇', title: 'Metro Survivor' },
      'meme9': { emoji: '🥟', title: 'Street Food Explorer' },
      'meme10': { emoji: '🎬', title: 'Bollywood Buff' },
      'meme11': { emoji: '🚗', title: 'Traffic Philosopher' },
      'meme12': { emoji: '🎉', title: 'Festival Enthusiast' },
      'meme13': { emoji: '🏆', title: 'IPL Loyalist' },
      'meme14': { emoji: '🦄', title: 'Startup Dreamer' },
      'meme15': { emoji: '📱', title: 'Meme Connoisseur' }
    };

    if (!selectedMemes || selectedMemes.length === 0) {
      return [];
    }

    return selectedMemes.map(meme => memeMap[meme]).filter(Boolean);
  };

  const fetchTodayMatches = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No user found for matches');
        toast({
          title: "Authentication required",
          description: "Please log in to view matches",
          variant: "destructive"
        });
        return;
      }

      console.log('Fetching matches for user:', user.id);

      console.log('Fetching active matches (excluding accepted chats and expired matches)');

      // Fetch active matches (including accepted ones to show "Go to Chats" button)
      // Only exclude chats that have messages (they belong in the chats screen)
      const { data: todayMatches, error: matchesError } = await supabase
        .from('matches')
        .select('*, chat_request_status, chat_request_sender, expires_at')
        .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
        .eq('status', 'active') // Only active status for matches screen (chatting status goes to chats)
        .gt('expires_at', new Date().toISOString()) // Only non-expired matches
        .limit(10);

      console.log('Matches query result:', { todayMatches, matchesError });

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
        console.error('Error checking today\'s matches:', todayMatchesError);
      }

      const matchesCreatedToday = todayCreatedMatches?.length || 0;
      console.log(`User has ${matchesCreatedToday} matches created today`);

      // If user already has 2 matches created today, don't generate more (regardless of status)
      if (matchesCreatedToday >= 2) {
        console.log('User already has 2 matches created today, not generating more');
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
        console.log('No active matches found and less than 2 matches created today, checking if new ones can be generated');
        
        // Check how many active chats the user has
        const { data: activeChats, error: chatsError } = await supabase
          .from('matches')
          .select('id')
          .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
          .in('status', ['active', 'chatting'])
          .eq('chat_request_status', 'accepted');

        if (chatsError) {
          console.error('Error checking active chats:', chatsError);
        }

        const activeChatCount = activeChats?.length || 0;
        console.log(`User has ${activeChatCount} active chats`);
        
        if (activeChatCount >= 6) {
          console.log('User has 6+ active chats, not generating new matches');
          toast({
            title: "Chat limit reached",
            description: "You have 6 active chats. New matches will be available when some chats expire (48 hours of inactivity).",
            variant: "default"
          });
          setMatches([]);
          return;
        }

        // Try to generate new matches using the RPC function
        console.log('Calling generate_daily_matches RPC');
        const { data: generationResult, error: generateError } = await supabase
          .rpc('generate_daily_matches');
        
        if (generateError) {
          console.error('Error generating matches:', generateError);
        } else if (generationResult && generationResult.length > 0) {
          const result = generationResult[0];
          console.log('Match generation result:', result);
          
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

        console.log('New matches after generation:', newMatches);

        if (newMatches) {
          await processMatches(newMatches, user.id);
        } else {
          setMatches([]);
        }
      } else {
        console.log('Found existing active matches:', todayMatches.length);
        await processMatches(todayMatches, user.id);
      }

    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({
        title: "Error",
        description: "Failed to load matches. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processMatches = async (matchesData: any[], currentUserId: string) => {
    const processedMatches: MatchProfile[] = [];
    console.log('Processing matches:', matchesData.length);

    for (const match of matchesData) {
      // Stop if we already have 2 matches
      if (processedMatches.length >= 2) break;

      // Determine which user is the match (not the current user)
      const isUser1 = match.user_1 === currentUserId;
      const matchUserId = isUser1 ? match.user_2 : match.user_1;

      console.log('Processing match for user:', matchUserId);

      try {
        // Fetch matched user's safe profile data (RLS-friendly)
        const { data: matchProfile, error: profileError } = await supabase
          .from('profiles_matched_view')
          .select('id, nickname, age, city, region, country')
          .eq('id', matchUserId)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching matched profile for user:', matchUserId, profileError);
        }

        // Don't drop the match card if profile fields are partially unavailable
        if (!matchProfile) {
          console.warn('No matched profile view row found for user:', matchUserId);
        }

        // Fetch onboarding data for the match - get the most recent non-pending record
        const { data: matchOnboarding, error: onboardingError } = await supabase
          .from('user_onboarding')
          .select('*')
          .eq('user_id', matchUserId)
          .neq('mood', 'pending_daily_update')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (onboardingError) {
          console.error('Error fetching onboarding for user:', matchUserId, onboardingError);
        }

        // Fetch main photo for the match
        const { data: matchPhoto, error: photoError } = await supabase
          .from('user_photos')
          .select('photo_url')
          .eq('user_id', matchUserId)
          .eq('is_main', true)
          .maybeSingle();

        if (photoError) {
          console.error('Error fetching photo for user:', matchUserId, photoError);
        }

        // Show matches even with incomplete data
        const memeInfo = getMemeDisplayInfo(matchOnboarding?.selected_memes || []);
        
        processedMatches.push({
          id: match.id,
          userId: matchUserId, // Add the matched user's ID
          name: matchProfile.first_name || 'Unknown User',
          age: matchProfile.age,
          mood: matchOnboarding?.mood || 'chill',
          memes: memeInfo,
          promptAnswer: matchOnboarding?.perfect_sunday || "",
          compatibility: match.match_score || 75,
          mainPhoto: matchPhoto?.photo_url || `https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=150&h=150&fit=crop&crop=face`,
          city: matchProfile.city || 'Unknown',
          region: matchProfile.region,
          country: matchProfile.country,
          chatRequestStatus: match.chat_request_status || 'none',
          chatRequestSender: match.chat_request_sender,
          expiresAt: match.expires_at
        });
        
        console.log('Successfully processed match:', processedMatches.length);
      } catch (error) {
        console.error('Error processing match for user:', matchUserId, error);
        continue;
      }
    }

    console.log('Final processed matches count:', processedMatches.length);
    setMatches(processedMatches);
  };

  useEffect(() => {
    fetchTodayMatches();
  }, []);

  return {
    matches,
    loading,
    refetch: fetchTodayMatches
  };
};