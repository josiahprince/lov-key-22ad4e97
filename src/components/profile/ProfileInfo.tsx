
import { Card } from '@/components/ui/card';
import { MapPin, Calendar, Heart, Globe, Users, Book } from 'lucide-react';

interface ProfileInfoProps {
  userProfile: any;
}

const ProfileInfo = ({ userProfile }: ProfileInfoProps) => {
  if (!userProfile) {
    return (
      <Card className="p-4">
        <p className="text-gray-600 text-center">Loading profile information...</p>
      </Card>
    );
  }

  const formatInterests = (interests: string[]) => {
    if (!interests || interests.length === 0) return 'Not specified';
    return interests.join(', ');
  };

  const formatLanguages = (languages: string[]) => {
    if (!languages || languages.length === 0) return 'Not specified';
    return languages.join(', ');
  };

  const formatGender = (gender: string) => {
    if (!gender) return 'Not specified';
    return gender.charAt(0).toUpperCase() + gender.slice(1).replace('_', ' ');
  };

  const formatOrientation = (orientation: string) => {
    if (!orientation) return 'Not specified';
    return orientation.charAt(0).toUpperCase() + orientation.slice(1).replace('_', ' ');
  };

  const formatInterestedIn = (interestedIn: string) => {
    if (!interestedIn) return 'Not specified';
    return interestedIn.charAt(0).toUpperCase() + interestedIn.slice(1).replace('_', ' ');
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="text-center border-b pb-4">
        <h2 className="text-2xl font-bold">
          {userProfile.nickname || userProfile.first_name || 'User'}
        </h2>
        <p className="text-gray-600">
          {userProfile.first_name} {userProfile.last_name}
        </p>
      </div>

      <div className="space-y-3">
        {/* Age */}
        {userProfile.age && (
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-rose-500" />
            <span className="text-gray-700">{userProfile.age} years old</span>
          </div>
        )}

        {/* Location */}
        {userProfile.location && (
          <div className="flex items-center space-x-3">
            <MapPin className="w-5 h-5 text-rose-500" />
            <span className="text-gray-700">{userProfile.location}</span>
          </div>
        )}

        {/* Gender & Orientation */}
        <div className="flex items-center space-x-3">
          <Heart className="w-5 h-5 text-rose-500" />
          <span className="text-gray-700">
            {formatGender(userProfile.gender)} • {formatOrientation(userProfile.sexual_orientation)}
          </span>
        </div>

        {/* Interested In */}
        {userProfile.interested_in && (
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-rose-500" />
            <span className="text-gray-700">
              Looking for: {formatInterestedIn(userProfile.interested_in)}
            </span>
          </div>
        )}

        {/* Religion */}
        {userProfile.religion && (
          <div className="flex items-center space-x-3">
            <Book className="w-5 h-5 text-rose-500" />
            <span className="text-gray-700">{userProfile.religion}</span>
          </div>
        )}

        {/* Languages */}
        {userProfile.languages && userProfile.languages.length > 0 && (
          <div className="flex items-start space-x-3">
            <Globe className="w-5 h-5 text-rose-500 mt-0.5" />
            <div>
              <p className="text-gray-700 font-medium">Languages:</p>
              <p className="text-gray-600 text-sm">{formatLanguages(userProfile.languages)}</p>
            </div>
          </div>
        )}

        {/* Interests */}
        {userProfile.interests && userProfile.interests.length > 0 && (
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">Interests & Hobbies:</p>
            <div className="flex flex-wrap gap-2">
              {userProfile.interests.map((interest: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProfileInfo;
