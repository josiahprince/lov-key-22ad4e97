import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

// Cache for signed URLs to avoid redundant requests
const signedUrlCache = new Map<string, { url: string; expiresAt: number; canViewUnblurred: boolean }>();

export const useSecurePhotos = ({ userId, matchId, isOwnProfile = false }: UseSecurePhotosProps) => {
  const [photos, setPhotos] = useState<SecurePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [canViewUnblurred, setCanViewUnblurred] = useState(isOwnProfile);
  const fetchingRef = useRef(false);

  // Extract file path from photo URL
  const extractFilePath = (photoUrl: string): string | null => {
    if (!photoUrl) return null;
    
    // Handle Supabase storage URLs
    // Format: https://xxx.supabase.co/storage/v1/object/public/profile-photos/user-id/filename
    const match = photoUrl.match(/\/profile-photos\/(.+)$/);
    if (match) {
      return match[1];
    }
    
    // If it's already a signed URL, extract the path
    const signedMatch = photoUrl.match(/\/profile-photos\/([^?]+)/);
    if (signedMatch) {
      return signedMatch[1];
    }
    
    return null;
  };

  // Get signed URL for a photo
  const getSignedUrl = useCallback(async (
    photoUrl: string, 
    targetUserId: string, 
    currentMatchId?: string
  ): Promise<{ signedUrl: string; canViewUnblurred: boolean } | null> => {
    const filePath = extractFilePath(photoUrl);
    if (!filePath) {
      // Not a Supabase storage URL, return original
      return { signedUrl: photoUrl, canViewUnblurred: true };
    }

    // Check cache
    const cacheKey = `${filePath}-${targetUserId}-${currentMatchId || 'none'}`;
    const cached = signedUrlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { signedUrl: cached.url, canViewUnblurred: cached.canViewUnblurred };
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session for signed URL request');
        return null;
      }

      const response = await supabase.functions.invoke('get-signed-photo-url', {
        body: {
          targetUserId,
          matchId: currentMatchId,
          photoPath: filePath
        }
      });

      if (response.error) {
        console.error('Error getting signed URL:', response.error);
        return null;
      }

      const { signedUrl, canViewUnblurred: canView } = response.data;
      
      // Cache for 50 minutes (URLs expire in 60)
      signedUrlCache.set(cacheKey, {
        url: signedUrl,
        expiresAt: Date.now() + 50 * 60 * 1000,
        canViewUnblurred: canView
      });

      return { signedUrl, canViewUnblurred: canView };
    } catch (error) {
      console.error('Failed to get signed URL:', error);
      return null;
    }
  }, []);

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
        console.error('Error fetching photos:', error);
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

        const result = await getSignedUrl(photo.photo_url, userId, matchId);
        
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
      console.error('Unexpected error fetching secure photos:', error);
      setPhotos([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [userId, matchId, isOwnProfile, getSignedUrl]);

  // Clear cache for a user when their photos change
  const clearCache = useCallback((targetUserId: string) => {
    const keysToDelete: string[] = [];
    signedUrlCache.forEach((_, key) => {
      if (key.includes(targetUserId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => signedUrlCache.delete(key));
  }, []);

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
