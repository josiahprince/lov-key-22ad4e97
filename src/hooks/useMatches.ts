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

      console.log('Fetching all active matches for user');

      // Fetch all active matches for the current user (not just today's)
      const { data: todayMatches, error: matchesError } = await supabase
        .from('matches')
        .select('*, chat_request_status, chat_request_sender')
        .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
        .eq('status', 'active')
        .limit(10);

      console.log('Matches query result:', { todayMatches, matchesError });

      if (matchesError) {
        throw matchesError;
      }

      if (!todayMatches || todayMatches.length === 0) {
        console.log('No matches found, trying to generate new ones');
        // No matches for today, try to generate new ones
        const { error: generateError } = await supabase.functions.invoke('generate-daily-matches');
        
        if (generateError) {
          console.error('Error generating matches:', generateError);
        }
        
        // Retry fetching after generation attempt
        const { data: newMatches } = await supabase
          .from('matches')
          .select('*, chat_request_status, chat_request_sender')
          .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
          .eq('status', 'active');

        console.log('New matches after generation:', newMatches);

        if (newMatches) {
          await processMatches(newMatches, user.id);
        }
      } else {
        console.log('Found existing matches:', todayMatches.length);
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
      // Stop if we already have 3 matches
      if (processedMatches.length >= 3) break;

      // Determine which user is the match (not the current user)
      const isUser1 = match.user_1 === currentUserId;
      const matchUserId = isUser1 ? match.user_2 : match.user_1;

      console.log('Processing match for user:', matchUserId);

      try {
        // Fetch profile data for the match
        const { data: matchProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, age, city, region, country, interests')
          .eq('id', matchUserId)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile for user:', matchUserId, profileError);
          continue;
        }

        if (!matchProfile) {
          console.warn('No profile found for user:', matchUserId);
          continue;
        }

        // Fetch onboarding data for the match
        const { data: matchOnboarding, error: onboardingError } = await supabase
          .from('user_onboarding')
          .select('*')
          .eq('user_id', matchUserId)
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
          chatRequestSender: match.chat_request_sender
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