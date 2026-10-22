
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPhotos } from '@/hooks/useUserPhotos';
import PhotoGallery from '@/components/profile/PhotoGallery';
import { useProfileSetup } from './ProfileSetupContext';

const PhotosStep = () => {
  const { user } = useAuth();
  const { updateField } = useProfileSetup();
  // Single shared instance, passed down to PhotoGallery, so step validation
  // sees the same state as the upload UI instead of a separately-subscribed copy.
  const photosState = useUserPhotos(user?.id);
  // Only an approved photo counts: matches never see the others.
  const hasPhoto = photosState.photos.some(p => p.photo_url && p.moderation_status === 'approved');
  const isChecking = photosState.photos.some(p => p.moderation_status === 'pending');
  const onlyRejected = !hasPhoto && !isChecking && photosState.photos.some(p => p.moderation_status === 'rejected');

  useEffect(() => {
    updateField('hasPhoto', hasPhoto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPhoto]);

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold">Add your photos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add at least 1 photo of yourself so people know who they're matching with. Every photo is checked before your matches can see it.
        </p>
      </div>
      <PhotoGallery userId={user?.id} photosState={photosState} />
      {!hasPhoto && isChecking && (
        <p className="text-sm text-center text-muted-foreground">Checking your photo…</p>
      )}
      {onlyRejected && (
        <p className="text-sm text-center text-destructive">
          None of your photos was approved. Add a different one to continue.
        </p>
      )}
    </div>
  );
};

export default PhotosStep;
