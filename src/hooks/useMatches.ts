import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MatchProfile {
  id: string;
  name: string;
  mood: string;
  meme: { emoji: string; title: string };
  promptAnswer: string;
  compatibility: number;
  mainPhoto: string;
  city?: string;
  region?: string;
  country?: string;
}

export const useMatches = () => {
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const calculateMatchScore = (
    userOnboarding: any,
    userProfile: any,
    matchOnboarding: any,
    matchProfile: any
  ): number => {
    let score = 0;

    // Mood match = +40%
    if (userOnboarding.mood === matchOnboarding.mood) {
      score += 40;
    } else {
      // Adjacent moods
      const moodCompatibility: { [key: string]: string[] } = {
        'happy': ['energetic', 'chill'],
        'energetic': ['happy', 'excited'],
        'chill': ['happy', 'sleepy'],
        'sleepy': ['chill', 'peaceful'],
        'deep': ['thoughtful', 'reflective'],
        'excited': ['energetic', 'happy']
      };
      
      if (moodCompatibility[userOnboarding.mood]?.includes(matchOnboarding.mood)) {
        score += 20;
      }
    }

    // Meme/vibe tag match = +30%
    const sharedMemes = userOnboarding.selected_memes?.filter((meme: string) =>
      matchOnboarding.selected_memes?.includes(meme)
    ) || [];
    if (sharedMemes.length > 0) {
      score += 30;
    }

    // Same city = +20%
    if (userProfile.city && matchProfile.city && userProfile.city === matchProfile.city) {
      score += 20;
    } else if (userProfile.region && matchProfile.region && userProfile.region === matchProfile.region) {
      score += 10;
    }

    // Common interests = +10%
    const sharedInterests = userProfile.interests?.filter((interest: string) =>
      matchProfile.interests?.includes(interest)
    ) || [];
    if (sharedInterests.length > 0) {
      score += 10;
    }

    return Math.min(score, 100); // Cap at 100%
  };

  const getMemeDisplayInfo = (selectedMemes: string[]) => {
    const memeMap: { [key: string]: { emoji: string; title: string } } = {
      'bookworm': { emoji: '📚', title: 'Book Worm' },
      'plantparent': { emoji: '🌱', title: 'Plant Parent' },
      'nightowl': { emoji: '🦉', title: 'Night Owl' },
      'coffeeaddict': { emoji: '☕', title: 'Coffee Addict' },
      'adventurer': { emoji: '🏔️', title: 'Adventurer' },
      'foodie': { emoji: '🍕', title: 'Foodie' },
      'musiclover': { emoji: '🎵', title: 'Music Lover' },
      'gamer': { emoji: '🎮', title: 'Gamer' },
      'artist': { emoji: '🎨', title: 'Artist' },
      'fitness': { emoji: '💪', title: 'Fitness Enthusiast' }
    };

    const firstMeme = selectedMemes?.[0];
    return memeMap[firstMeme] || { emoji: '🌟', title: 'Vibe Master' };
  };

  const fetchTodayMatches = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to view matches",
          variant: "destructive"
        });
        return;
      }

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Fetch today's matches for the current user
      const { data: todayMatches, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          user_1_profile:profiles!matches_user_1_fkey(
            id, first_name, last_name, city, region, country, interests
          ),
          user_2_profile:profiles!matches_user_2_fkey(
            id, first_name, last_name, city, region, country, interests
          )
        `)
        .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
        .gte('matched_on', startOfDay.toISOString())
        .lt('matched_on', endOfDay.toISOString())
        .eq('status', 'active');

      if (matchesError) {
        throw matchesError;
      }

      if (!todayMatches || todayMatches.length === 0) {
        // No matches for today, try to generate new ones
        const { error: generateError } = await supabase.functions.invoke('generate-daily-matches');
        
        if (generateError) {
          console.error('Error generating matches:', generateError);
        }
        
        // Retry fetching after generation attempt
        const { data: newMatches } = await supabase
          .from('matches')
          .select(`
            *,
            user_1_profile:profiles!matches_user_1_fkey(
              id, first_name, last_name, city, region, country, interests
            ),
            user_2_profile:profiles!matches_user_2_fkey(
              id, first_name, last_name, city, region, country, interests
            )
          `)
          .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
          .gte('matched_on', startOfDay.toISOString())
          .lt('matched_on', endOfDay.toISOString())
          .eq('status', 'active');

        if (newMatches) {
          await processMatches(newMatches, user.id);
        }
      } else {
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

    for (const match of matchesData) {
      // Determine which user is the match (not the current user)
      const isUser1 = match.user_1 === currentUserId;
      const matchUserId = isUser1 ? match.user_2 : match.user_1;
      const matchProfile = isUser1 ? match.user_2_profile : match.user_1_profile;

      // Fetch onboarding data for the match
      const { data: matchOnboarding } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', matchUserId)
        .single();

      // Fetch main photo for the match
      const { data: matchPhoto } = await supabase
        .from('user_photos')
        .select('photo_url')
        .eq('user_id', matchUserId)
        .eq('is_main', true)
        .single();

      if (matchProfile && matchOnboarding) {
        const memeInfo = getMemeDisplayInfo(matchOnboarding.selected_memes);
        
        processedMatches.push({
          id: match.id,
          name: `${matchProfile.first_name || 'Anonymous'}`,
          mood: matchOnboarding.mood || 'chill',
          meme: memeInfo,
          promptAnswer: matchOnboarding.perfect_sunday || "Looking forward to great conversations!",
          compatibility: match.match_score || 75,
          mainPhoto: matchPhoto?.photo_url || `https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=150&h=150&fit=crop&crop=face`,
          city: matchProfile.city,
          region: matchProfile.region,
          country: matchProfile.country
        });
      }
    }

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