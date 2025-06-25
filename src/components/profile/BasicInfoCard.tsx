
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Heart, Globe, Users, Book, Edit } from 'lucide-react';

interface BasicInfoCardProps {
  userProfile: any;
  onEdit: () => void;
}

const BasicInfoCard = ({ userProfile, onEdit }: BasicInfoCardProps) => {
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

  const formatLanguages = (languages: string[]) => {
    if (!languages || languages.length === 0) return 'Not specified';
    return languages.join(', ');
  };

  const getDisplayName = () => {
    if (userProfile.nickname) {
      return userProfile.nickname;
    }
    if (userProfile.first_name && userProfile.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    if (userProfile.first_name) {
      return userProfile.first_name;
    }
    return 'Add Users Name or Nickname here';
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-start border-b pb-4">
        <div className="text-center flex-1">
          <h2 className="text-2xl font-bold text-gray-800">
            {getDisplayName()}
          </h2>
          {userProfile.nickname && userProfile.first_name && (
            <p className="text-gray-600 text-sm">
              {userProfile.first_name} {userProfile.last_name}
            </p>
          )}
        </div>
        <Button
          onClick={onEdit}
          variant="outline"
          size="sm"
          className="flex items-center space-x-1"
        >
          <Edit className="w-4 h-4" />
          <span>Edit</span>
        </Button>
      </div>

      <div className="space-y-3">
        {/* Age */}
        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span className="text-gray-700">
            {userProfile.age ? `${userProfile.age} years old` : 'Age not specified'}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center space-x-3">
          <MapPin className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span className="text-gray-700">
            {userProfile.location || 'Location not specified'}
          </span>
        </div>

        {/* Gender & Orientation */}
        <div className="flex items-center space-x-3">
          <Heart className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span className="text-gray-700">
            {formatGender(userProfile.gender)} • {formatOrientation(userProfile.sexual_orientation)}
          </span>
        </div>

        {/* Interested In */}
        <div className="flex items-center space-x-3">
          <Users className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span className="text-gray-700">
            Looking for: {formatInterestedIn(userProfile.interested_in)}
          </span>
        </div>

        {/* Religion */}
        <div className="flex items-center space-x-3">
          <Book className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span className="text-gray-700">
            {userProfile.religion || 'Religion not specified'}
          </span>
        </div>

        {/* Languages */}
        <div className="flex items-start space-x-3">
          <Globe className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-gray-700 font-medium">Languages:</p>
            <p className="text-gray-600 text-sm">{formatLanguages(userProfile.languages)}</p>
          </div>
        </div>

        {/* Interests */}
        <div className="space-y-2">
          <p className="text-gray-700 font-medium">Interests & Hobbies:</p>
          {userProfile.interests && userProfile.interests.length > 0 ? (
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
          ) : (
            <p className="text-gray-600 text-sm">No interests specified</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default BasicInfoCard;
