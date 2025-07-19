import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatProfile {
  id: string; // match ID
  userId: string; // The matched user's ID
  name: string;
  age?: number;
  mood: string;
  memes: { emoji: string; title: string }[];
  mainPhoto: string;
  city?: string;
  region?: string;
  country?: string;
  lastInteractionAt: string;
  hasUnreadMessages?: boolean;
}

export const useChats = () => {
  const [chats, setChats] = useState<ChatProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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

  const fetchChats = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No user found for chats');
        return;
      }

      console.log('Fetching chats for user:', user.id);

      // Fetch all accepted chat requests (active chats)
      const { data: chatMatches, error: chatsError } = await supabase
        .from('matches')
        .select('*, chat_request_status, last_interaction_at')
        .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
        .eq('chat_request_status', 'accepted')
        .order('last_interaction_at', { ascending: false });

      console.log('Chat matches query result:', { chatMatches, chatsError });

      if (chatsError) {
        throw chatsError;
      }

      if (chatMatches && chatMatches.length > 0) {
        console.log(`Processing ${chatMatches.length} chat matches`);
        await processChats(chatMatches, user.id);
      } else {
        console.log('No chat matches found, setting empty array');
        setChats([]);
      }

    } catch (error) {
      console.error('Error fetching chats:', error);
      toast({
        title: "Error",
        description: "Failed to load chats. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processChats = async (chatMatches: any[], currentUserId: string) => {
    const processedChats: ChatProfile[] = [];

    for (const match of chatMatches) {
      // Check if there are any messages in this chat
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .eq('match_id', match.id)
        .limit(1);

      if (messagesError) {
        console.error('Error checking messages for match:', match.id, messagesError);
      }

      // If there are messages, keep the chat active regardless of time
      // If no messages, apply the 48-hour rule for chat requests that were accepted but never used
      if (!messages || messages.length === 0) {
        const lastInteraction = new Date(match.last_interaction_at);
        const hoursAgo = (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60);
        
        if (hoursAgo > 48) {
          // Silently skip expired chats that never had messages
          continue;
        }
      }

      // Determine which user is the match (not the current user)
      const isUser1 = match.user_1 === currentUserId;
      const matchUserId = isUser1 ? match.user_2 : match.user_1;

      try {
        // Fetch profile data for the match
        const { data: matchProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, age, city, region, country')
          .eq('id', matchUserId)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile for user:', matchUserId, profileError);
        }

        // Fetch onboarding data for the match
        const { data: matchOnboarding, error: onboardingError } = await supabase
          .from('user_onboarding')
          .select('*')
          .eq('user_id', matchUserId)
          .single();

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

        const memeInfo = getMemeDisplayInfo(matchOnboarding?.selected_memes || []);
        
        console.log('Chat data for match:', match.id, {
          matchProfile: matchProfile?.first_name,
          matchOnboarding: matchOnboarding?.mood,
          memeInfo: memeInfo.length
        });
        
        processedChats.push({
          id: match.id,
          userId: matchUserId,
          name: matchProfile?.first_name || 'Unknown User',
          age: matchProfile?.age,
          mood: matchOnboarding?.mood || 'chill',
          memes: memeInfo,
          mainPhoto: matchPhoto?.photo_url || `https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=150&h=150&fit=crop&crop=face`,
          city: matchProfile?.city || 'Unknown',
          region: matchProfile?.region,
          country: matchProfile?.country,
          lastInteractionAt: match.last_interaction_at,
          hasUnreadMessages: false // TODO: Implement unread message checking
        });
        
      } catch (error) {
        console.error('Error processing chat for user:', matchUserId, error);
        continue;
      }
    }

    setChats(processedChats);
  };

  useEffect(() => {
    fetchChats();
  }, []);

  return {
    chats,
    loading,
    refetch: fetchChats
  };
};