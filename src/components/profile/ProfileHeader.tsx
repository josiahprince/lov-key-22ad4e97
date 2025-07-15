
import { Camera } from 'lucide-react';
import { useUserPhotos } from '@/hooks/useUserPhotos';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProfileHeaderProps {
  userProfile?: any;
  isMatchedUser?: boolean;
  canViewPhotos?: boolean;
}

const ProfileHeader = ({ userProfile, isMatchedUser = false, canViewPhotos = true }: ProfileHeaderProps) => {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  // Use matched user's ID for photos if viewing matched user, otherwise use current user
  const targetUserId = isMatchedUser ? userProfile?.id : currentUserId;
  const { photos, loading } = useUserPhotos(targetUserId);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user in ProfileHeader:', user?.id);
      setCurrentUserId(user?.id);
    };
    getCurrentUser();
  }, []);

  // Find the main photo or the first photo with content
  const mainPhoto = photos.find(photo => photo.is_main && photo.photo_url) || 
                   photos.find(photo => photo.photo_url);

  console.log('Photos in ProfileHeader:', photos);
  console.log('Main photo:', mainPhoto);

  if (loading) {
    return (
      <div className="text-center space-y-4">
        <div className="relative mx-auto w-24 h-24">
          <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Your Profile</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <div className="relative mx-auto w-24 h-24">
        <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
          {mainPhoto?.photo_url ? (
            <div className="relative w-full h-full">
              <img 
                src={mainPhoto.photo_url} 
                alt="Profile" 
                className={`w-full h-full object-cover rounded-full ${
                  isMatchedUser && !canViewPhotos ? 'blur-md' : ''
                }`}
                onError={(e) => {
                  console.error('Error loading profile image:', e);
                  e.currentTarget.style.display = 'none';
                }}
              />
              {isMatchedUser && !canViewPhotos && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
              )}
            </div>
          ) : (
            <Camera className="w-8 h-8 text-rose-400" />
          )}
        </div>
      </div>
      {userProfile?.nickname && (
        <div className="mt-2">
          <h2 className="text-xl font-semibold text-gray-700">{userProfile.nickname}</h2>
        </div>
      )}
      <div>
        {isMatchedUser ? (
          <h1 className="text-2xl font-bold text-gray-800">
            {userProfile?.nickname || 'User'} Profile
          </h1>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-800">Your Profile</h1>
            <p className="text-gray-600">This is how others see you</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
