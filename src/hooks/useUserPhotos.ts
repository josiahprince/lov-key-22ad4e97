
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserPhoto {
  id: string;
  photo_url: string;
  photo_slot: number;
  is_main: boolean;
}

export const useUserPhotos = (userId: string | undefined) => {
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Initialize photo slots (1-6)
  const initializePhotoSlots = (userPhotos: UserPhoto[]) => {
    const photoSlots = Array.from({ length: 6 }, (_, index) => {
      const slot = index + 1;
      const existingPhoto = userPhotos.find(p => p.photo_slot === slot);
      return existingPhoto || {
        id: `slot-${slot}`,
        photo_url: '',
        photo_slot: slot,
        is_main: slot === 1 && userPhotos.length === 0
      };
    });
    return photoSlots;
  };

  const fetchPhotos = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching photos for user:', userId);
      
      const { data, error } = await supabase
        .from('user_photos')
        .select('*')
        .eq('user_id', userId)
        .order('photo_slot');

      if (error) {
        console.error('Error fetching photos:', error);
        toast({
          title: "Error",
          description: "Failed to load photos",
          variant: "destructive"
        });
        return;
      }

      console.log('Fetched photos from DB:', data);
      const photoSlots = initializePhotoSlots(data || []);
      setPhotos(photoSlots);
    } catch (error) {
      console.error('Unexpected error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadPhoto = async (file: File, slot: number) => {
    if (!userId) {
      console.error('No user ID available for upload');
      toast({
        title: "Error",
        description: "Please sign in to upload photos",
        variant: "destructive"
      });
      return null;
    }

    try {
      console.log('Starting upload for slot:', slot, 'file:', file.name);
      
      // Validate file type - Enhanced to support more formats
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
        'image/bmp', 'image/webp', 'image/svg+xml', 'image/tiff', 
        'image/x-icon', 'image/vnd.microsoft.icon'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Please select a valid image file (JPG, PNG, GIF, BMP, WebP, SVG, TIFF, ICO)",
          variant: "destructive"
        });
        return null;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size should be less than 5MB",
          variant: "destructive"
        });
        return null;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${slot}-${Date.now()}.${fileExt}`;
      
      // Use the new profile-photos bucket for all photos
      const bucketName = 'profile-photos';

      console.log('Uploading to bucket:', bucketName, 'with filename:', fileName);

      // Delete existing photo in this slot first
      const existingPhoto = photos.find(p => p.photo_slot === slot && p.photo_url);
      if (existingPhoto && existingPhoto.photo_url.includes('supabase')) {
        await removePhoto(slot);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      console.log('Generated public URL:', publicUrl);

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
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('Database save successful:', data);

      // Refresh photos after successful upload
      await fetchPhotos();

      toast({
        title: "Success",
        description: "Photo uploaded successfully"
      });

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  const addPhotoFromUrl = async (url: string, slot: number) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "Please sign in to add photos",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Adding photo from URL:', url, 'to slot:', slot);
      
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

      console.log('Photo from URL added successfully:', data);

      // Refresh photos after successful addition
      await fetchPhotos();

      toast({
        title: "Success",
        description: "Photo added successfully"
      });
    } catch (error) {
      console.error('Error adding photo:', error);
      toast({
        title: "Error",
        description: "Failed to add photo",
        variant: "destructive"
      });
    }
  };

  const removePhoto = async (slot: number) => {
    if (!userId) return;

    const photo = photos.find(p => p.photo_slot === slot);
    if (!photo || !photo.photo_url) return;

    try {
      console.log('Removing photo from slot:', slot);
      
      // Delete from database first
      const { error: dbError } = await supabase
        .from('user_photos')
        .delete()
        .eq('user_id', userId)
        .eq('photo_slot', slot);

      if (dbError) throw dbError;

      // If it's a Supabase-hosted photo, delete from storage
      if (photo.photo_url.includes('supabase')) {
        const urlParts = photo.photo_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const fullPath = `${userId}/${fileName}`;
        
        // Use the profile-photos bucket
        const bucketName = 'profile-photos';
        
        const { error: storageError } = await supabase.storage
          .from(bucketName)
          .remove([fullPath]);

        if (storageError) {
          console.error('Storage deletion error:', storageError);
        }
      }

      // Refresh photos after successful removal
      await fetchPhotos();

      toast({
        title: "Success",
        description: "Photo removed successfully"
      });
    } catch (error) {
      console.error('Error removing photo:', error);
      toast({
        title: "Error",
        description: "Failed to remove photo",
        variant: "destructive"
      });
    }
  };

  const setMainPhoto = async (slot: number) => {
    if (!userId) return;

    try {
      console.log('Setting main photo to slot:', slot);
      
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

      // Refresh photos after successful update
      await fetchPhotos();

      toast({
        title: "Success",
        description: "Main photo updated"
      });
    } catch (error) {
      console.error('Error setting main photo:', error);
      toast({
        title: "Error",
        description: "Failed to set main photo",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchPhotos();

    // Subscribe to real-time updates for photos
    if (!userId) return;

    const channel = supabase
      .channel(`user-photos-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_photos',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log('Photos updated in real-time');
          fetchPhotos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    photos,
    loading,
    uploadPhoto,
    addPhotoFromUrl,
    removePhoto,
    setMainPhoto,
    refetch: fetchPhotos
  };
};
