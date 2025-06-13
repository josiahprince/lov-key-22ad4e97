
import { Input } from '@/components/ui/input';
import { StepProps } from './types';

const NameStep = ({ profileData, updateProfileData }: StepProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">What's your name?</h2>
        <p className="text-sm text-gray-600">This is how you'll appear to others</p>
      </div>
      
      <div className="space-y-4">
        <Input
          placeholder="First name"
          value={profileData.firstName}
          onChange={(e) => updateProfileData('firstName', e.target.value)}
          className="h-12 rounded-2xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-pink-300 focus:ring-pink-200 transition-all duration-200 text-base"
        />
        <Input
          placeholder="Last name"
          value={profileData.lastName}
          onChange={(e) => updateProfileData('lastName', e.target.value)}
          className="h-12 rounded-2xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-pink-300 focus:ring-pink-200 transition-all duration-200 text-base"
        />
      </div>
    </div>
  );
};

export default NameStep;
