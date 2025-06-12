
import { Card } from '@/components/ui/card';

interface ProfileInfoProps {
  userProfile: any;
}

const ProfileInfo = ({ userProfile }: ProfileInfoProps) => {
  // Handle case where userProfile is null or undefined
  if (!userProfile) {
    return (
      <Card className="p-6 space-y-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-gray-700">Current Mood</h3>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-gray-600">Loading...</span>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">Today's Vibe</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-lg">📚</span>
              <span className="text-gray-600">Loading...</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-3">
        <div>
          <h3 className="font-medium text-gray-700">Current Mood</h3>
          <div className="flex items-center space-x-2 mt-1">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-gray-600 capitalize">{userProfile.mood || 'Not set'}</span>
          </div>
        </div>

        <div>
          <h3 className="font-medium text-gray-700">Today's Vibe</h3>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-lg">📚</span>
            <span className="text-gray-600">Book Worm</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProfileInfo;
