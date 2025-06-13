
import { Card } from '@/components/ui/card';
import { StepProps } from './types';

const OrientationStep = ({ profileData, updateProfileData }: StepProps) => {
  const orientationOptions = [
    { value: 'straight' as const, label: 'Straight' },
    { value: 'gay' as const, label: 'Gay' },
    { value: 'lesbian' as const, label: 'Lesbian' },
    { value: 'bisexual' as const, label: 'Bisexual' },
    { value: 'pansexual' as const, label: 'Pansexual' },
    { value: 'asexual' as const, label: 'Asexual' },
    { value: 'other' as const, label: 'Other' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">Sexual Orientation</h2>
        <p className="text-sm text-gray-600">This helps us understand your preferences</p>
      </div>
      
      <div className="space-y-3">
        {orientationOptions.map((option) => (
          <Card
            key={option.value}
            className={`p-4 cursor-pointer transition-all duration-200 hover:scale-105 border-2 ${
              profileData.sexualOrientation === option.value
                ? 'bg-pink-50 border-pink-200 text-pink-700'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
            }`}
            onClick={() => updateProfileData('sexualOrientation', option.value)}
          >
            <div className="text-center">
              <p className="font-medium">{option.label}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OrientationStep;
