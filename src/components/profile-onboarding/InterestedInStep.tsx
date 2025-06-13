
import { Card } from '@/components/ui/card';
import { StepProps } from './types';

const InterestedInStep = ({ profileData, updateProfileData }: StepProps) => {
  const interestedInOptions = [
    { value: 'men' as const, label: 'Men' },
    { value: 'women' as const, label: 'Women' },
    { value: 'non_binary' as const, label: 'Non-binary people' },
    { value: 'everyone' as const, label: 'Everyone' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">Who are you interested in?</h2>
        <p className="text-sm text-gray-600">This helps us show you relevant matches</p>
      </div>
      
      <div className="space-y-3">
        {interestedInOptions.map((option) => (
          <Card
            key={option.value}
            className={`p-4 cursor-pointer transition-all duration-200 hover:scale-105 border-2 ${
              profileData.interestedIn === option.value
                ? 'bg-pink-50 border-pink-200 text-pink-700'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
            }`}
            onClick={() => updateProfileData('interestedIn', option.value)}
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

export default InterestedInStep;
