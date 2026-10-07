import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/errorLogger';

// The profile-photos bucket is private, so the stored photo_url (a /public/
// address) never loads in the browser. Every photo has to be shown through a
// short-lived signed URL from the get-signed-photo-url edge function, which
// also checks the viewer may see it and says whether the pair has revealed
// photos (canViewUnblurred).

export interface SignedPhoto {
  signedUrl: string;
  canViewUnblurred: boolean;
}

// Signed URLs last an hour; reuse them for 50 minutes.
const CACHE_MS = 50 * 60 * 1000;
const cache = new Map<string, SignedPhoto & { expiresAt: number }>();

export const extractPhotoPath = (photoUrl: string): string | null =>
  photoUrl?.match(/\/profile-photos\/([^?]+)/)?.[1] ?? null;

export const getSignedPhotoUrl = async (
  photoUrl: string,
  targetUserId: string,
  matchId?: string
): Promise<SignedPhoto | null> => {
  const filePath = extractPhotoPath(photoUrl);
  // Not in our bucket (e.g. an external image): use it as is.
  if (!filePath) return { signedUrl: photoUrl, canViewUnblurred: true };

  const cacheKey = `${filePath}-${targetUserId}-${matchId || 'none'}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase.functions.invoke('get-signed-photo-url', {
      body: { targetUserId, matchId, photoPath: filePath },
    });
    if (error || !data?.signedUrl) {
      if (error) logError(`photoUrls:sign:${targetUserId}`, error);
      return null;
    }

    const signed = { signedUrl: data.signedUrl as string, canViewUnblurred: Boolean(data.canViewUnblurred) };
    cache.set(cacheKey, { ...signed, expiresAt: Date.now() + CACHE_MS });
    return signed;
  } catch (error) {
    logError(`photoUrls:getSignedPhotoUrl:${targetUserId}`, error);
    return null;
  }
};

// Forget cached URLs for a user whose photos just changed.
export const clearSignedPhotoCache = (targetUserId: string) => {
  [...cache.keys()].filter((key) => key.includes(targetUserId)).forEach((key) => cache.delete(key));
};
