import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logError } from '@/lib/errorLogger';
import { getOnboardingDay, getOnboardingWeekStart, seededShuffle } from '@/lib/onboardingWeek';

export interface Vibe {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

// Ids are title slugs, the same scheme generate-cultural-vibes uses, so a
// default vibe and a generated vibe with the same title count as a match.
const DEFAULT_VIBES: Vibe[] = [
  { id: 'coffee-lover', title: 'Coffee Lover', description: 'When you need coffee to function', emoji: '☕' },
  { id: 'book-worm', title: 'Book Worm', description: 'One more chapter...', emoji: '📚' },
  { id: 'plant-parent', title: 'Plant Parent', description: 'Talking to my plants daily', emoji: '🌱' },
  { id: 'night-owl', title: 'Night Owl', description: '3 AM thoughts hit different', emoji: '🦉' },
  { id: 'foodie', title: 'Foodie', description: 'Photos of food > photos of myself', emoji: '🍜' },
  { id: 'music-lover', title: 'Music Lover', description: 'Always got headphones on', emoji: '🎵' },
  { id: 'adventure-seeker', title: 'Adventure Seeker', description: 'Weekend trips are life', emoji: '🏔️' },
  { id: 'fitness-enthusiast', title: 'Fitness Enthusiast', description: 'Gym is my happy place', emoji: '💪' },
  { id: 'pet-lover', title: 'Pet Lover', description: 'Can never say no to a dog', emoji: '🐕' },
  { id: 'art-appreciator', title: 'Art Appreciator', description: 'Museums make me happy', emoji: '🎨' },
  { id: 'tech-geek', title: 'Tech Geek', description: 'Latest gadgets obsession', emoji: '💻' },
  { id: 'film-buff', title: 'Film Buff', description: 'Movie marathons are my thing', emoji: '🎬' },
  { id: 'sports-fan', title: 'Sports Fan', description: 'Never miss a game', emoji: '⚽' },
  { id: 'dreamer', title: 'Dreamer', description: 'Always planning next big thing', emoji: '✨' },
  { id: 'social-butterfly', title: 'Social Butterfly', description: 'Love meeting new people', emoji: '🦋' },
];

const CACHE_PREFIX = 'cultural-vibes-';

const readCache = (key: string): Vibe[] | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { vibes } = JSON.parse(cached);
    return Array.isArray(vibes) && vibes.length > 0 ? vibes : null;
  } catch (e) {
    logError(`useCulturalVibes:readCache:${key}`, e);
    return null;
  }
};

// One set per country per week, so the cache is keyed the same way. Older
// weeks (and the pre-weekly 24h entries) are dropped.
const writeCache = (key: string, vibes: Vibe[]) => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX) && k !== key)
      .forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(key, JSON.stringify({ vibes }));
  } catch (e) {
    logError(`useCulturalVibes:writeCache:${key}`, e);
  }
};

export const useCulturalVibes = (country?: string | null) => {
  const { user } = useAuth();
  const [baseVibes, setBaseVibes] = useState<Vibe[]>(DEFAULT_VIBES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVibes = async () => {
      if (!country) {
        setBaseVibes(DEFAULT_VIBES);
        return;
      }

      const cacheKey = `${CACHE_PREFIX}${country}-${getOnboardingWeekStart()}`;
      const cached = readCache(cacheKey);
      if (cached) {
        setBaseVibes(cached);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: functionError } = await supabase.functions.invoke('generate-cultural-vibes', {
          body: { country }
        });

        if (functionError) {
          throw functionError;
        }

        if (data?.vibes && Array.isArray(data.vibes) && data.vibes.length > 0) {
          setBaseVibes(data.vibes);
          // Only cache the set for the week we asked about. A fallback to
          // last week's set shouldn't stick for the rest of this week.
          if (data.weekStart === getOnboardingWeekStart()) {
            writeCache(cacheKey, data.vibes);
          }
        } else {
          setBaseVibes(DEFAULT_VIBES);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch vibes');
        setBaseVibes(DEFAULT_VIBES);
      } finally {
        setLoading(false);
      }
    };

    fetchVibes();
  }, [country]);

  // Everyone in a country shares the week's set, but each user sees it in
  // their own order, reshuffled daily.
  const vibes = useMemo(
    () => seededShuffle(baseVibes, `${user?.id ?? ''}-${getOnboardingDay()}`),
    [baseVibes, user?.id]
  );

  return { vibes, loading, error };
};
