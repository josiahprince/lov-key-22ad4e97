
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import ScreenHeader from '@/components/ScreenHeader';
import ProfileHeader from './profile/ProfileHeader';
import ProfileInfo from './profile/ProfileInfo';
import PhotoGallery from './profile/PhotoGallery';
import DescriptionSection from './profile/DescriptionSection';
import PrivacyCards from './profile/PrivacyCards';
import BlockedUsersSection from './profile/BlockedUsersSection';
import NotificationsSection from './profile/NotificationsSection';
import ProfileFilters from './profile/ProfileFilters';
import PhotoGalleryViewer from './profile/PhotoGalleryViewer';
import { useSecurePhotos } from '@/hooks/useSecurePhotos';
import { useAuth } from '@/hooks/useAuth';
import type { ProfileLike } from '@/types/domain';

const ProfileScreen = ({
  userProfile
}: {
  userProfile: ProfileLike | null;
}) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const { photos } = useSecurePhotos({ userId: currentUserId, isOwnProfile: true });

  const onSignOut = () => {
    supabase.auth.signOut();
  };

  const signOutAction = (
    <Button
      onClick={onSignOut}
      variant="outline"
      size="sm"
      className="flex items-center space-x-2"
    >
      <LogOut className="w-4 h-4" />
      <span>Sign Out</span>
    </Button>
  );

  // If userProfile is not available, show loading
  if (!userProfile) {
    return (
      <div className="p-4 pb-20 space-y-6">
        <ScreenHeader logo actions={signOutAction} />
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
            {signOutAction}
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
        onPhotoClick={(index) => {
          setSelectedPhotoIndex(index);
          setIsGalleryOpen(true);
        }}
      />
      <PrivacyCards />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">Account</h3>
        <NotificationsSection />
        <BlockedUsersSection />
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
