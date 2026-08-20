
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, MapPin, Calendar, User } from 'lucide-react';
import type { ProfileLike } from '@/types/domain';

interface BasicInfoCardProps {
  userProfile: ProfileLike | null;
  onEdit?: () => void;
}

const BasicInfoCard = ({ userProfile, onEdit }: BasicInfoCardProps) => {
  if (!userProfile) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-gray-600 text-center">Loading profile information...</p>
        </CardContent>
      </Card>
    );
  }

  const formatAge = () => {
    if (userProfile.age) {
      return `Age: ${userProfile.age}`;
    }
    if (userProfile.date_of_birth) {
      const birthDate = new Date(userProfile.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return `Age: ${age}`;
    }
    return '';
  };

  const formatGender = () => {
    if (userProfile.gender) {
      return `Gender: ${userProfile.gender.charAt(0).toUpperCase() + userProfile.gender.slice(1).replace('_', '-')}`;
    }
    return '';
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">Profile Information</CardTitle>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Information Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Basic Information</h3>
          
          {/* Name and Age */}
          <div className="flex items-start space-x-3">
            <User className="h-4 w-4 text-gray-500 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-gray-900">
                {userProfile.first_name} {userProfile.last_name}
                {userProfile.nickname && ` (${userProfile.nickname})`}
              </p>
              {formatAge() && (
                <p className="text-sm text-gray-600">{formatAge()}</p>
              )}
            </div>
          </div>

          {/* Date of Birth */}
          {userProfile.date_of_birth && (
            <div className="flex items-start space-x-3">
              <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Born:</span> {new Date(userProfile.date_of_birth).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Gender Section */}
        {formatGender() && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Gender</h3>
            
            <div className="flex items-start space-x-3">
              <User className="h-4 w-4 text-gray-500 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm text-gray-900">{formatGender()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Location Section */}
        {userProfile.location && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Location</h3>
            
            <div className="flex items-start space-x-3">
              <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Location:</span> {userProfile.location}
                </p>
                {userProfile.city && userProfile.country && (
                  <p className="text-xs text-gray-600">
                    {userProfile.city}{userProfile.region && `, ${userProfile.region}`}, {userProfile.country}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BasicInfoCard;
