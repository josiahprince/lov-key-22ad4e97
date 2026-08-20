
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import ProfileHeader from './profile/ProfileHeader';
import ProfileInfo from './profile/ProfileInfo';
import PhotoGallery from './profile/PhotoGallery';
import DescriptionSection from './profile/DescriptionSection';
import PrivacyCards from './profile/PrivacyCards';
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

  // If userProfile is not available, show loading
  if (!userProfile) {
    return (
      <div className="p-4 pb-20 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/c28200aa-e002-4654-86ab-fcb6351cb739.png" 
              alt="LovKey Logo" 
              className="w-8 h-8"
            />
            <h1 className="text-xl font-bold text-gray-800">LovKey</h1>
          </div>
          <Button
            onClick={onSignOut}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>
        <div className="text-center">
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* Header with Sign Out button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <img 
            src="/lovable-uploads/c28200aa-e002-4654-86ab-fcb6351cb739.png" 
            alt="LovKey Logo" 
            className="w-8 h-8"
          />
          <h1 className="text-xl font-bold text-gray-800">LovKey</h1>
        </div>
        <div className="flex items-center space-x-2">
          <ProfileFilters userProfile={userProfile} />
          <Button
            onClick={onSignOut}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

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
