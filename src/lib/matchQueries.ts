import { supabase } from '@/integrations/supabase/client';

const MEME_MAP: Record<string, { emoji: string; title: string }> = {
  meme1: { emoji: '☕', title: 'Coffee Lover' },
  meme2: { emoji: '📚', title: 'Book Worm' },
  meme3: { emoji: '🌱', title: 'Plant Parent' },
  meme4: { emoji: '🦉', title: 'Night Owl' },
  meme5: { emoji: '🍜', title: 'Foodie' },
  meme6: { emoji: '🏏', title: 'Cricket Fanatic' },
  meme7: { emoji: '🌧️', title: 'Monsoon Mood' },
  meme8: { emoji: '🚇', title: 'Metro Survivor' },
  meme9: { emoji: '🥟', title: 'Street Food Explorer' },
  meme10: { emoji: '🎬', title: 'Bollywood Buff' },
  meme11: { emoji: '🚗', title: 'Traffic Philosopher' },
  meme12: { emoji: '🎉', title: 'Festival Enthusiast' },
  meme13: { emoji: '🏆', title: 'IPL Loyalist' },
  meme14: { emoji: '🦄', title: 'Startup Dreamer' },
  meme15: { emoji: '📱', title: 'Meme Connoisseur' },
};

export const getMemeDisplayInfo = (selectedMemes: string[] | null | undefined) => {
  if (!selectedMemes || selectedMemes.length === 0) return [];
  return selectedMemes.map((meme) => MEME_MAP[meme]).filter(Boolean);
};

// Most recent onboarding record for a user, excluding placeholder "pending" rows.
export const fetchLatestOnboarding = (userId: string) =>
  supabase
    .from('user_onboarding')
    .select('*')
    .eq('user_id', userId)
    .neq('mood', 'pending_daily_update')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

export const fetchMainPhotoUrl = (userId: string) =>
  supabase
    .from('user_photos')
    .select('photo_url')
    .eq('user_id', userId)
    .eq('is_main', true)
    .maybeSingle();

export const fetchMatchedViewProfile = (userId: string) =>
  supabase.from('profiles_matched_view').select('*').eq('id', userId).maybeSingle();
