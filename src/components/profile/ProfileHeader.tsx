
import { Camera, Edit } from 'lucide-react';

interface ProfileHeaderProps {
  mainPhotoUrl?: string;
}

const ProfileHeader = ({ mainPhotoUrl }: ProfileHeaderProps) => {
  return (
    <div className="text-center space-y-4">
      <div className="relative mx-auto w-24 h-24">
        <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
          {mainPhotoUrl ? (
            <img src={mainPhotoUrl} alt="Profile" className="w-full h-full object-cover rounded-full" />
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
