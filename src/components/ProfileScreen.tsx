
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ProfileHeader from './profile/ProfileHeader';
import ProfileInfo from './profile/ProfileInfo';
import DescriptionSection from './profile/DescriptionSection';
import PhotoGallery from './profile/PhotoGallery';
import PrivacyCards from './profile/PrivacyCards';

const ProfileScreen = ({ userProfile }: { userProfile: any }) => {
  const [description, setDescription] = useState(userProfile?.description || "Tell others about yourself...");
  const [photos, setPhotos] = useState([
    { id: 1, url: '', isMain: true },
    { id: 2, url: '', isMain: false },
    { id: 3, url: '', isMain: false },
    { id: 4, url: '', isMain: false },
    { id: 5, url: '', isMain: false },
    { id: 6, url: '', isMain: false },
  ]);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!userProfile) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">No profile data available</p>
      </div>
    );
  }

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    
    try {
      console.log('Updating profile with:', {
        description,
        photos: photos.filter(photo => photo.url),
        userProfile
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const mainPhoto = photos.find(photo => photo.isMain);

  return (
    <div className="p-6 space-y-6 pb-20">
      <ProfileHeader mainPhotoUrl={mainPhoto?.url} />

      <ProfileInfo userProfile={userProfile} />

      <DescriptionSection 
        initialDescription={description}
        onSave={setDescription}
      />

      <PhotoGallery 
        photos={photos}
        onPhotosChange={setPhotos}
      />

      <PrivacyCards />

      <Button 
        className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl disabled:opacity-50"
        onClick={handleUpdateProfile}
        disabled={isUpdating}
      >
        {isUpdating ? 'Updating...' : 'Update Profile'}
      </Button>
    </div>
  );
};

export default ProfileScreen;
