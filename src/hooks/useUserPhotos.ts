
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/errorLogger';
import {
  PHOTO_BUCKET,
  initializePhotoSlots,
  storagePathForPhotoUrl,
  validatePhotoFile,
} from '@/lib/photos';
import type { UserPhoto } from '@/lib/photos';

export type { UserPhoto };

export const useUserPhotos = (userId: string | undefined) => {
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Every photo operation reports back through the same two toasts, so keep
  // the shape in one place rather than repeating the options object per call.
  const notifyError = (description: string) =>
    toast({ title: 'Error', description, variant: 'destructive' });

  const notifySuccess = (description: string) =>
    toast({ title: 'Success', description });

  const fetchPhotos = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      
      const { data, error } = await supabase
        .from('user_photos')
        .select('*')
        .eq('user_id', userId)
        .order('photo_slot');

      if (error) {
        notifyError('Failed to load photos');
        return;
      }

      const photoSlots = initializePhotoSlots(data || []);
      setPhotos(photoSlots);
    } catch (error) {
      logError("useUserPhotos:fetchPhotos", error);
    } finally {
      setLoading(false);
    }
  };

  const uploadPhoto = async (file: File, slot: number) => {
    if (!userId) {
      notifyError('Please sign in to upload photos');
      return null;
    }

    try {
      
      const validationError = validatePhotoFile(file);
      if (validationError) {
        notifyError(validationError);
        return null;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${slot}-${Date.now()}.${fileExt}`;
      
      // Delete existing photo in this slot first
      const existingPhoto = photos.find(p => p.photo_slot === slot && p.photo_url);
      if (existingPhoto && existingPhoto.photo_url.includes('supabase')) {
        await removePhoto(slot);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(PHOTO_BUCKET)
        .getPublicUrl(fileName);

      // Save to database
      const { data, error: dbError } = await supabase
        .from('user_photos')
        .upsert({
          user_id: userId,
          photo_url: publicUrl,
          photo_slot: slot,
          is_main: slot === 1
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      // Refresh photos after successful upload
      await fetchPhotos();

      notifySuccess('Photo uploaded successfully');

      return publicUrl;
    } catch (error) {
      notifyError('Failed to upload photo. Please try again.');
      return null;
    }
  };

  const addPhotoFromUrl = async (url: string, slot: number) => {
    if (!userId) {
      notifyError('Please sign in to add photos');
      return;
    }

    try {
      
      const { data, error } = await supabase
        .from('user_photos')
        .upsert({
          user_id: userId,
          photo_url: url,
          photo_slot: slot,
          is_main: slot === 1
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh photos after successful addition
      await fetchPhotos();

      notifySuccess('Photo added successfully');
    } catch (error) {
      notifyError('Failed to add photo');
    }
  };

  const removePhoto = async (slot: number) => {
    if (!userId) return;

    const photo = photos.find(p => p.photo_slot === slot);
    if (!photo || !photo.photo_url) return;

    try {
      
      // Delete from database first
      const { error: dbError } = await supabase
        .from('user_photos')
        .delete()
        .eq('user_id', userId)
        .eq('photo_slot', slot);

      if (dbError) throw dbError;

      // Externally hosted photos (social imports) have nothing in storage
      // to delete, so storagePathForPhotoUrl returns null and we skip it.
      const fullPath = storagePathForPhotoUrl(photo.photo_url, userId);
      if (fullPath) {

        const { error: storageError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .remove([fullPath]);

        if (storageError) {
          logError(`useUserPhotos:removeStorage:${fullPath}`, storageError);
        }
      }

      // Refresh photos after successful removal
      await fetchPhotos();

      notifySuccess('Photo removed successfully');
    } catch (error) {
      notifyError('Failed to remove photo');
    }
  };

  const setMainPhoto = async (slot: number) => {
    if (!userId) return;

    try {
      
      // First, set all photos to not main
      const { error: resetError } = await supabase
        .from('user_photos')
        .update({ is_main: false })
        .eq('user_id', userId);

      if (resetError) throw resetError;

      // Then set the selected photo as main
      const { error: setError } = await supabase
        .from('user_photos')
        .update({ is_main: true })
        .eq('user_id', userId)
        .eq('photo_slot', slot);

      if (setError) throw setError;

      await fetchPhotos();

      notifySuccess('Main photo updated');
    } catch (error) {
      notifyError('Failed to set main photo');
    }
  };

  const swapPhotoSlots = async (slotA: number, slotB: number) => {
    if (!userId || slotA === slotB) return;

    const photoA = photos.find(p => p.photo_slot === slotA && p.photo_url);
    const photoB = photos.find(p => p.photo_slot === slotB && p.photo_url);

    if (!photoA && !photoB) return;

    try {
      // Use a temporary slot to avoid unique constraint violations
      const TEMP_SLOT = 99;

      if (photoA && photoB) {
        // Swap both photos: A → temp, B → A, temp → B
        await supabase.from('user_photos').update({ photo_slot: TEMP_SLOT }).eq('id', photoA.id);
        await supabase.from('user_photos').update({ photo_slot: slotA }).eq('id', photoB.id);
        await supabase.from('user_photos').update({ photo_slot: slotB }).eq('id', photoA.id);
      } else if (photoA && !photoB) {
        // Move A into empty slot B
        await supabase.from('user_photos').update({ photo_slot: slotB }).eq('id', photoA.id);
      } else if (!photoA && photoB) {
        // Move B into empty slot A
        await supabase.from('user_photos').update({ photo_slot: slotA }).eq('id', photoB.id);
      }

      await fetchPhotos();
    } catch (error) {
      notifyError('Failed to reorder photos');
    }
  };

  // Use a ref to track if subscription is already set up
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const instanceIdRef = useRef<string>(Math.random().toString(36).substring(7));

  useEffect(() => {
    fetchPhotos();

    // Subscribe to real-time updates for photos
    if (!userId) return;

    // Clean up existing subscription before creating new one
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channelName = `user-photos-${userId}-${instanceIdRef.current}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_photos',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchPhotos();
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [userId]);

  return {
    photos,
    loading,
    uploadPhoto,
    addPhotoFromUrl,
    removePhoto,
    setMainPhoto,
    swapPhotoSlots,
    refetch: fetchPhotos
  };
};

export type UseUserPhotosReturn = ReturnType<typeof useUserPhotos>;
