
import { Card } from '@/components/ui/card';
import { Camera, Heart } from 'lucide-react';

const PrivacyCards = () => {
  return (
    <>
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center space-x-3">
          <Camera className="w-5 h-5 text-blue-600" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-800">Photo Privacy</h4>
            <p className="text-sm text-blue-600">
              Your main photo stays blurred until both people exchange 60 messages
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200">
        <div className="text-center space-y-2">
          <Heart className="w-6 h-6 mx-auto text-rose-500" />
          <h4 className="font-medium text-rose-800">Privacy First</h4>
          <p className="text-sm text-rose-600">
            Additional photos are revealed only when your match requests to see them after 60 messages
          </p>
        </div>
      </Card>
    </>
  );
};

export default PrivacyCards;
