import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/errorLogger';

export interface WeeklyPrompt {
  id: string;
  question: string;
  placeholder: string;
}

// Used if the RPC fails, so onboarding never blocks on it. Same row as the
// first prompt in the rotation.
export const FALLBACK_PROMPT: WeeklyPrompt = {
  id: 'perfect-sunday',
  question: 'Describe your perfect Sunday',
  placeholder: 'Maybe sleeping in, reading a book, trying a new recipe, or exploring a local market...',
};

// The question of the week, the same for everyone (see
// current_weekly_prompt() in 20260929120000_weekly_prompt_and_vibe_sets.sql).
export const useWeeklyPrompt = () => {
  const [prompt, setPrompt] = useState<WeeklyPrompt>(FALLBACK_PROMPT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchPrompt = async () => {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const { data, error } = await supabase.rpc('current_weekly_prompt', { user_timezone: timezone });
        if (error) throw error;

        const row = data?.[0];
        if (!cancelled && row) {
          setPrompt({ id: row.id, question: row.question, placeholder: row.placeholder });
        }
      } catch (error) {
        logError('useWeeklyPrompt:fetch', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPrompt();
    return () => {
      cancelled = true;
    };
  }, []);

  return { prompt, loading };
};
