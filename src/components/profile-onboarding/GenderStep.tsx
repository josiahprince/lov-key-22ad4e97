
import { Card } from '@/components/ui/card';
import { StepProps } from './types';

const GenderStep = ({ profileData, updateProfileData }: StepProps) => {
  const genderOptions = [
    { value: 'male' as const, label: 'Man' },
    { value: 'female' as const, label: 'Woman' },
    { value: 'non_binary' as const, label: 'Non-binary' },
    { value: 'other' as const, label: 'Other' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">What's your gender?</h2>
        <p className="text-sm text-gray-600">This helps us show you to the right people</p>
      </div>
      
      <div className="space-y-3">
        {genderOptions.map((option) => (
          <Card
            key={option.value}
            className={`p-4 cursor-pointer transition-all duration-200 hover:scale-105 border-2 ${
              profileData.gender === option.value
                ? 'bg-pink-50 border-pink-200 text-pink-700'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
            }`}
            onClick={() => updateProfileData('gender', option.value)}
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

export default GenderStep;
