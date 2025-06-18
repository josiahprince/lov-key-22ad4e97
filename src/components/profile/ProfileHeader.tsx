
import { Camera, Edit } from 'lucide-react';
import { useUserPhotos } from '@/hooks/useUserPhotos';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ProfileHeader = () => {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const { photos } = useUserPhotos(currentUserId);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    getCurrentUser();
  }, []);

  // Find the main photo or the first photo with content
  const mainPhoto = photos.find(photo => photo.is_main && photo.photo_url) || 
                   photos.find(photo => photo.photo_url);

  return (
    <div className="text-center space-y-4">
      <div className="relative mx-auto w-24 h-24">
        <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
          {mainPhoto?.photo_url ? (
            <img 
              src={mainPhoto.photo_url} 
              alt="Profile" 
              className="w-full h-full object-cover rounded-full" 
            />
          ) : (
            <Camera className="w-8 h-8 text-rose-400" />
          )}
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center">
          <Edit className="w-4 h-4 text-white" />
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Your Profile</h1>
        <p className="text-gray-600">This is how others see you</p>
      </div>
    </div>
  );
};

export default ProfileHeader;
