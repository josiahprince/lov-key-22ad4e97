import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/errorLogger';

// A chat can close while it's open on screen: the other person removes or
// blocks you, or the hourly job closes it for inactivity. Watch the match row
// so the chat can say so instead of letting sends fail one by one.
export type ChatClosedReason = 'inactive' | 'ended';

const OPEN_STATUSES = ['active', 'chatting'];
// Realtime is the fast path; polling covers networks that block the websocket.
const POLL_MS = 15000;

export const useMatchClosed = (matchId: string) => {
  const [closedReason, setClosedReason] = useState<ChatClosedReason | null>(null);

  const applyStatus = useCallback((status: string | null | undefined) => {
    if (!status || OPEN_STATUSES.includes(status)) return;
    // Only the inactivity close has a reason worth stating. Removal and
    // blocking are deliberately not revealed to the other person.
    setClosedReason(status === 'inactive' ? 'inactive' : 'ended');
  }, []);

  const checkStatus = useCallback(async () => {
    if (!matchId) return;
    const { data, error } = await supabase
      .from('matches')
      .select('status')
      .eq('id', matchId)
      .maybeSingle();
    if (error) {
      logError(`useMatchClosed:${matchId}`, error);
      return;
    }
    // No row means it was deleted, which is closed as well.
    applyStatus(data ? data.status : 'deleted');
  }, [matchId, applyStatus]);

  useEffect(() => {
    if (!matchId || closedReason) return;

    checkStatus();
    const pollInterval = setInterval(checkStatus, POLL_MS);

    const channel = supabase
      .channel(`match-status:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload) => applyStatus((payload.new as { status?: string }).status)
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [matchId, closedReason, checkStatus, applyStatus]);

  return { closedReason, checkStatus };
};
