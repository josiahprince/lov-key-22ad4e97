import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/errorLogger';

// Every uploaded photo starts 'pending' and is hidden from matches until the
// moderate-photo edge function approves it (20261021120000_photo_moderation.sql).
export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface ModerationResult {
  id: string;
  status: ModerationStatus;
  reason?: string;
}

// One check per user at a time. Several useUserPhotos instances and realtime
// refetches all ask at once, and each check costs an AI call per photo.
const inFlight = new Map<string, Promise<ModerationResult[]>>();

// Checks the signed-in user's pending photos. Resolves to [] if the check
// couldn't run; the photos stay pending and are retried on the next load.
export const checkPendingPhotos = (userId: string): Promise<ModerationResult[]> => {
  const running = inFlight.get(userId);
  if (running) return running;

  const check = supabase.functions
    .invoke('moderate-photo', { body: {} })
    .then(({ data, error }) => {
      if (error) {
        logError('photoModeration:checkPendingPhotos', error);
        return [];
      }
      return (data?.results ?? []) as ModerationResult[];
    })
    .catch((error) => {
      logError('photoModeration:checkPendingPhotos', error);
      return [] as ModerationResult[];
    })
    .finally(() => inFlight.delete(userId));

  inFlight.set(userId, check);
  return check;
};

// Result for one photo. If a check for an earlier upload was already running
// it won't include this photo, so wait for it and check again.
export const checkPhoto = async (userId: string, photoId: string): Promise<ModerationResult | undefined> => {
  const first = await checkPendingPhotos(userId);
  return first.find((r) => r.id === photoId)
    ?? (await checkPendingPhotos(userId)).find((r) => r.id === photoId);
};
