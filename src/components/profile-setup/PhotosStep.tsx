
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPhotos } from '@/hooks/useUserPhotos';
import PhotoGallery from '@/components/profile/PhotoGallery';
import { useProfileSetup } from './ProfileSetupContext';

const PhotosStep = () => {
  const { user } = useAuth();
  const { updateField } = useProfileSetup();
  // Own instance just to know whether at least one photo exists, for step
  // validation - the actual upload UI/state lives inside PhotoGallery below.
  const { photos } = useUserPhotos(user?.id);
  const hasPhoto = photos.some(p => Boolean(p.photo_url));

  useEffect(() => {
    updateField('hasPhoto', hasPhoto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPhoto]);

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold">Add your photos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add at least 1 photo so people know who they're matching with
        </p>
      </div>
      <PhotoGallery userId={user?.id} />
    </div>
  );
};

export default PhotosStep;
