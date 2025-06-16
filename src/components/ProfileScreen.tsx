
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import ProfileHeader from './profile/ProfileHeader';
import ProfileInfo from './profile/ProfileInfo';
import PhotoGallery from './profile/PhotoGallery';
import DescriptionSection from './profile/DescriptionSection';
import PrivacyCards from './profile/PrivacyCards';

const ProfileScreen = ({ userProfile, onSignOut }: { 
  userProfile: any; 
  onSignOut: () => void;
}) => {
  // If userProfile is not available, show loading
  if (!userProfile) {
    return (
      <div className="p-4 pb-20 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Your Profile</h1>
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
        <h1 className="text-xl font-bold text-gray-800">Your Profile</h1>
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

      <ProfileHeader />
      <ProfileInfo userProfile={userProfile} />
      <PhotoGallery photos={[]} onPhotosChange={() => {}} />
      <DescriptionSection onSave={() => {}} />
      <PrivacyCards />
    </div>
  );
};

export default ProfileScreen;
