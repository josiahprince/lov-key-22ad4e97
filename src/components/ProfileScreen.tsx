
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScreenHeader from '@/components/ScreenHeader';
import ProfileHeader from './profile/ProfileHeader';
import ProfileInfo from './profile/ProfileInfo';
import PhotoGallery from './profile/PhotoGallery';
import DescriptionSection from './profile/DescriptionSection';
import PrivacyCards from './profile/PrivacyCards';
import NotificationsSection from './profile/NotificationsSection';
import ProfileFilters from './profile/ProfileFilters';
import PhotoGalleryViewer from './profile/PhotoGalleryViewer';
import { useSecurePhotos } from '@/hooks/useSecurePhotos';
import { useUserPhotos } from '@/hooks/useUserPhotos';
import { useAuth } from '@/hooks/useAuth';
import type { ProfileLike } from '@/types/domain';

const ProfileScreen = ({
  userProfile
}: {
  userProfile: ProfileLike | null;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUserId = user?.id;
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const { photos } = useSecurePhotos({ userId: currentUserId, isOwnProfile: true });
  const photosState = useUserPhotos(currentUserId);

  // Sign out, account and legal options all live on the Settings screen.
  const settingsAction = (
    <Button
      onClick={() => navigate('/settings')}
      variant="outline"
      size="sm"
      className="h-9 w-9 p-0"
      aria-label="Settings"
      title="Settings"
    >
      <Settings className="w-4 h-4" />
    </Button>
  );

  // If userProfile is not available, show loading
  if (!userProfile) {
    return (
      <div className="p-4 pb-20 space-y-6">
        <ScreenHeader logo actions={settingsAction} />
        <div className="text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      <ScreenHeader
        logo
        actions={
          <>
            <ProfileFilters userProfile={userProfile} />
            {settingsAction}
          </>
        }
      />

      <ProfileHeader
        userProfile={userProfile} 
        onPhotoClick={() => {
          setSelectedPhotoIndex(0);
          setIsGalleryOpen(true);
        }}
      />
      <ProfileInfo userProfile={userProfile} />
      <DescriptionSection />
      <PhotoGallery
        userId={currentUserId}
        photosState={photosState}
        onPhotoClick={(index) => {
          setSelectedPhotoIndex(index);
          setIsGalleryOpen(true);
        }}
      />
      <PrivacyCards />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">Activity</h3>
        <NotificationsSection />
      </div>

      <PhotoGalleryViewer
        photos={photos}
        initialIndex={selectedPhotoIndex}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        canViewPhotos={true}
      />
    </div>
  );
};

export default ProfileScreen;
