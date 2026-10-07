import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/errorLogger';
import { clearSignedPhotoCache, getSignedPhotoUrl } from '@/lib/photoUrls';

export interface SecurePhoto {
  id: string;
  photo_url: string;
  photo_slot: number;
  is_main: boolean;
  signedUrl?: string;
  canViewUnblurred?: boolean;
}

interface UseSecurePhotosProps {
  userId: string | undefined;
  matchId?: string;
  isOwnProfile?: boolean;
}

export const useSecurePhotos = ({ userId, matchId, isOwnProfile = false }: UseSecurePhotosProps) => {
  const [photos, setPhotos] = useState<SecurePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [canViewUnblurred, setCanViewUnblurred] = useState(isOwnProfile);
  const fetchingRef = useRef(false);

  const fetchPhotos = useCallback(async () => {
    if (!userId || fetchingRef.current) {
      setLoading(false);
      return;
    }

    fetchingRef.current = true;
    setLoading(true);

    try {
      // Fetch photo records from database
      const { data: photoData, error } = await supabase
        .from('user_photos')
        .select('*')
        .eq('user_id', userId)
        .order('photo_slot');

      if (error) {
        setPhotos([]);
        return;
      }

      if (!photoData || photoData.length === 0) {
        setPhotos([]);
        return;
      }

      // Get signed URLs for all photos
      const photosWithSignedUrls: SecurePhoto[] = [];
      let firstCanViewUnblurred = isOwnProfile;

      for (const photo of photoData) {
        if (!photo.photo_url) continue;

        const result = await getSignedPhotoUrl(photo.photo_url, userId, matchId);
        
        if (result) {
          photosWithSignedUrls.push({
            ...photo,
            signedUrl: result.signedUrl,
            canViewUnblurred: result.canViewUnblurred
          });
          
          // Use the first photo's canViewUnblurred status
          if (photosWithSignedUrls.length === 1) {
            firstCanViewUnblurred = result.canViewUnblurred;
          }
        }
      }

      setPhotos(photosWithSignedUrls);
      setCanViewUnblurred(firstCanViewUnblurred);
    } catch (error) {
      logError(`useSecurePhotos:fetchPhotos:${userId}`, error);
      setPhotos([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [userId, matchId, isOwnProfile]);

  const clearCache = useCallback((targetUserId: string) => clearSignedPhotoCache(targetUserId), []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  return {
    photos,
    loading,
    canViewUnblurred,
    refetch: fetchPhotos,
    clearCache
  };
};
