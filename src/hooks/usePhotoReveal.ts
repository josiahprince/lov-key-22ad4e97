import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/errorLogger';
import { getPhotoRevealThreshold, type PhotoRevealChoice } from '@/lib/constants';

export interface PhotoRevealSnapshot {
  round: number;
  myChoice: PhotoRevealChoice | null;
  revealed: boolean;
}

/**
 * Drives the mutual photo-reveal handshake for one match. Photos unblur only
 * once both people choose to reveal; a single "wait" pushes the pair into the
 * next round, which asks again 30 messages later.
 *
 * `messageCount` is the caller's live count from useMessages - the database
 * independently re-checks the threshold on submit, so this only decides when
 * the prompt appears.
 */
export const usePhotoReveal = (matchId: string, messageCount: number) => {
  const [round, setRound] = useState(1);
  const [myChoice, setMyChoice] = useState<PhotoRevealChoice | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const threshold = getPhotoRevealThreshold(round);
  const thresholdReached = messageCount >= threshold;

  const applySnapshot = useCallback((snapshot: PhotoRevealSnapshot) => {
    setRound(snapshot.round);
    setMyChoice(snapshot.myChoice);
    setRevealed(snapshot.revealed);
  }, []);

  const fetchState = useCallback(async () => {
    if (!matchId) return;

    try {
      const { data, error } = await supabase.rpc('get_photo_reveal_state', { p_match_id: matchId });
      if (error) throw error;

      const row = data?.[0];
      if (!row) return;

      applySnapshot({
        round: row.reveal_round,
        myChoice: row.my_choice as PhotoRevealChoice | null,
        revealed: row.revealed,
      });
    } catch (error) {
      logError(`usePhotoReveal:fetchState:${matchId}`, error);
    }
  }, [matchId, applySnapshot]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // While a decision is outstanding the other person can change what this
  // screen should show - by agreeing (photos unlock) or by choosing to wait
  // (the round advances and the prompt has to disappear) - so poll until the
  // round settles. Outside that window nothing can change without a new
  // message arriving first.
  useEffect(() => {
    if (!matchId || revealed || !thresholdReached) return;

    const pollInterval = setInterval(fetchState, 5000);
    return () => clearInterval(pollInterval);
  }, [matchId, revealed, thresholdReached, fetchState]);

  const submitChoice = useCallback(
    async (choice: PhotoRevealChoice): Promise<PhotoRevealSnapshot | null> => {
      if (!matchId || submitting) return null;

      setSubmitting(true);
      try {
        const { data, error } = await supabase.rpc('submit_photo_reveal_choice', {
          p_match_id: matchId,
          p_choice: choice,
        });
        if (error) throw error;

        const row = data?.[0];
        if (!row) return null;

        const snapshot: PhotoRevealSnapshot = {
          round: row.reveal_round,
          myChoice: row.my_choice as PhotoRevealChoice | null,
          revealed: row.revealed,
        };
        applySnapshot(snapshot);
        return snapshot;
      } catch (error) {
        logError(`usePhotoReveal:submitChoice:${matchId}`, error);

        // The other person answered first and moved the goalposts between
        // this screen rendering and the tap landing.
        const staleRound = error instanceof Error && error.message.includes('threshold_not_reached');
        if (staleRound) {
          fetchState();
        }

        toast({
          title: staleRound ? 'Just missed it' : 'Error',
          description: staleRound
            ? 'Your match chose to wait a little longer. Keep chatting and you\'ll both be asked again.'
            : 'Could not save your choice. Please try again.',
          variant: staleRound ? 'default' : 'destructive',
        });
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [matchId, submitting, applySnapshot, fetchState, toast]
  );

  return {
    round,
    threshold,
    revealed,
    submitting,
    // Both people are asked as soon as the pair reaches the round's threshold.
    awaitingMyChoice: !revealed && thresholdReached && myChoice === null,
    awaitingPartner: !revealed && myChoice === 'reveal',
    submitChoice,
  };
};
