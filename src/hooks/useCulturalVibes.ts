import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Vibe {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

const DEFAULT_VIBES: Vibe[] = [
  { id: 'vibe1', title: 'Coffee Lover', description: 'When you need coffee to function', emoji: '☕' },
  { id: 'vibe2', title: 'Book Worm', description: 'One more chapter...', emoji: '📚' },
  { id: 'vibe3', title: 'Plant Parent', description: 'Talking to my plants daily', emoji: '🌱' },
  { id: 'vibe4', title: 'Night Owl', description: '3 AM thoughts hit different', emoji: '🦉' },
  { id: 'vibe5', title: 'Foodie', description: 'Photos of food > photos of myself', emoji: '🍜' },
  { id: 'vibe6', title: 'Music Lover', description: 'Always got headphones on', emoji: '🎵' },
  { id: 'vibe7', title: 'Adventure Seeker', description: 'Weekend trips are life', emoji: '🏔️' },
  { id: 'vibe8', title: 'Fitness Enthusiast', description: 'Gym is my happy place', emoji: '💪' },
  { id: 'vibe9', title: 'Pet Lover', description: 'Can never say no to a dog', emoji: '🐕' },
  { id: 'vibe10', title: 'Art Appreciator', description: 'Museums make me happy', emoji: '🎨' },
  { id: 'vibe11', title: 'Tech Geek', description: 'Latest gadgets obsession', emoji: '💻' },
  { id: 'vibe12', title: 'Film Buff', description: 'Movie marathons are my thing', emoji: '🎬' },
  { id: 'vibe13', title: 'Sports Fan', description: 'Never miss a game', emoji: '⚽' },
  { id: 'vibe14', title: 'Dreamer', description: 'Always planning next big thing', emoji: '✨' },
  { id: 'vibe15', title: 'Social Butterfly', description: 'Love meeting new people', emoji: '🦋' },
];

export const useCulturalVibes = (country?: string | null) => {
  const [vibes, setVibes] = useState<Vibe[]>(DEFAULT_VIBES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVibes = async () => {
      if (!country) {
        setVibes(DEFAULT_VIBES);
        return;
      }

      // Check if we have cached vibes for this country in localStorage
      const cacheKey = `cultural-vibes-${country}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const { vibes: cachedVibes, timestamp } = JSON.parse(cached);
          // Use cache if less than 24 hours old
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            setVibes(cachedVibes);
            return;
          }
        } catch (e) { /* no-op */ }
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
          setVibes(data.vibes);
          
          // Cache the vibes
          localStorage.setItem(cacheKey, JSON.stringify({
            vibes: data.vibes,
            timestamp: Date.now()
          }));
        } else {
          setVibes(DEFAULT_VIBES);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch vibes');
        setVibes(DEFAULT_VIBES); // Fallback to default vibes
      } finally {
        setLoading(false);
      }
    };

    fetchVibes();
  }, [country]);

  return { vibes, loading, error };
};
