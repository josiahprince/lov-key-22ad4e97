
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, MapPin, Calendar, Heart, User } from 'lucide-react';

interface BasicInfoCardProps {
  userProfile: any;
  onEdit: () => void;
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

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">Profile Information</CardTitle>
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
          <Edit2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name and Age */}
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-gray-500" />
          <div>
            <p className="font-medium">
              {userProfile.first_name} {userProfile.last_name}
              {userProfile.nickname && ` (${userProfile.nickname})`}
            </p>
            <p className="text-sm text-gray-600">Age: {userProfile.age}</p>
          </div>
        </div>

        {/* Gender & Orientation */}
        <div className="flex items-center space-x-2">
          <Heart className="h-4 w-4 text-gray-500" />
          <div>
            <p className="text-sm">
              <span className="font-medium">Gender:</span> {userProfile.gender}
            </p>
            <p className="text-sm">
              <span className="font-medium">Orientation:</span> {userProfile.sexual_orientation}
            </p>
            <p className="text-sm">
              <span className="font-medium">Looking for:</span> {userProfile.interested_in}
            </p>
          </div>
        </div>

        {/* Location */}
        {userProfile.location && (
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm">
                <span className="font-medium">Location:</span> {userProfile.location}
              </p>
              {userProfile.city && userProfile.country && (
                <p className="text-xs text-gray-600">
                  {userProfile.city}, {userProfile.region && `${userProfile.region}, `}{userProfile.country}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Date of Birth */}
        {userProfile.date_of_birth && (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <p className="text-sm">
              <span className="font-medium">Born:</span> {new Date(userProfile.date_of_birth).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BasicInfoCard;
