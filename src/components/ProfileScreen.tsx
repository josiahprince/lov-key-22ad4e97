
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Edit, Heart } from 'lucide-react';

const ProfileScreen = ({ userProfile }: { userProfile: any }) => {
  if (!userProfile) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">No profile data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="relative mx-auto w-24 h-24">
          <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
            <Camera className="w-8 h-8 text-rose-400" />
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

      <Card className="p-6 space-y-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-gray-700">Current Mood</h3>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-gray-600 capitalize">{userProfile.mood}</span>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">Today's Vibe</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-lg">📚</span>
              <span className="text-gray-600">Book Worm</span>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">About You</h3>
            <p className="text-gray-600 text-sm mt-1 leading-relaxed">
              {userProfile.promptAnswer}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center space-x-3">
          <Camera className="w-5 h-5 text-blue-600" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-800">Profile Photo</h4>
            <p className="text-sm text-blue-600">
              Add a photo that will be blurred until you connect
            </p>
          </div>
          <Button variant="outline" size="sm" className="border-blue-200 text-blue-700">
            Add Photo
          </Button>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200">
        <div className="text-center space-y-2">
          <Heart className="w-6 h-6 mx-auto text-rose-500" />
          <h4 className="font-medium text-rose-800">Privacy First</h4>
          <p className="text-sm text-rose-600">
            Your photo stays blurred until both people exchange 30 messages
          </p>
        </div>
      </Card>

      <Button className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl">
        Update Profile
      </Button>
    </div>
  );
};

export default ProfileScreen;
