
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import ProfileHeader from './profile/ProfileHeader';
import ProfileInfo from './profile/ProfileInfo';
import PhotoGallery from './profile/PhotoGallery';
import DescriptionSection from './profile/DescriptionSection';
import PrivacyCards from './profile/PrivacyCards';

interface Photo {
  id: number;
  url: string;
  isMain: boolean;
}

const ProfileScreen = ({ userProfile, onSignOut }: { 
  userProfile: any; 
  onSignOut: () => void;
}) => {
  // Initialize photos state with 6 empty photo slots
  const [photos, setPhotos] = useState<Photo[]>([
    { id: 1, url: '', isMain: true },
    { id: 2, url: '', isMain: false },
    { id: 3, url: '', isMain: false },
    { id: 4, url: '', isMain: false },
    { id: 5, url: '', isMain: false },
    { id: 6, url: '', isMain: false },
  ]);

  const [description, setDescription] = useState("Tell others about yourself...");

  const handlePhotosChange = (updatedPhotos: Photo[]) => {
    setPhotos(updatedPhotos);
    console.log('Photos updated:', updatedPhotos);
  };

  const handleDescriptionSave = (newDescription: string) => {
    setDescription(newDescription);
    console.log('Description saved:', newDescription);
  };

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
      <PhotoGallery photos={photos} onPhotosChange={handlePhotosChange} />
      <DescriptionSection initialDescription={description} onSave={handleDescriptionSave} />
      <PrivacyCards />
    </div>
  );
};

export default ProfileScreen;
