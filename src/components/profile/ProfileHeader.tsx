
import { Camera } from 'lucide-react';
import { useSecurePhotos } from '@/hooks/useSecurePhotos';
import { useAuth } from '@/hooks/useAuth';
import type { ProfileLike } from '@/types/domain';

interface ProfileHeaderProps {
  userProfile?: ProfileLike | null;
  isMatchedUser?: boolean;
  canViewPhotos?: boolean;
  matchId?: string;
  onPhotoClick?: () => void;
}

const ProfileHeader = ({ userProfile, isMatchedUser = false, canViewPhotos = true, matchId, onPhotoClick }: ProfileHeaderProps) => {
  const { user } = useAuth();
  // Use matched user's ID for photos if viewing matched user, otherwise use current user
  const targetUserId = isMatchedUser ? userProfile?.id : user?.id;
  const { photos, loading, canViewUnblurred } = useSecurePhotos({
    userId: targetUserId,
    matchId: matchId,
    isOwnProfile: !isMatchedUser
  });

  // Find the main photo or the first photo with content (use signedUrl if available)
  const mainPhoto = photos.find(photo => photo.is_main && (photo.signedUrl || photo.photo_url)) || 
                   photos.find(photo => photo.signedUrl || photo.photo_url);
  const displayUrl = mainPhoto?.signedUrl || mainPhoto?.photo_url;

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
        <div 
          className={`w-24 h-24 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden ${
            displayUrl && onPhotoClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
          }`}
          onClick={() => displayUrl && onPhotoClick?.()}
        >
          {displayUrl ? (
            <div className="relative w-full h-full">
              <img 
                src={displayUrl} 
                alt="Profile" 
                className={`w-full h-full object-cover rounded-full ${
                  isMatchedUser && !canViewPhotos && !canViewUnblurred ? 'blur-md' : ''
                }`}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {isMatchedUser && !canViewPhotos && !canViewUnblurred && (
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
