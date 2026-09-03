import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useProfileSetup } from './ProfileSetupContext';

const INTEREST_OPTIONS = [
  'Music', 'Travel', 'Memes', 'Pets', 'Sports', 'Photography', 'Cooking', 'Reading',
  'Movies', 'Gaming', 'Fitness', 'Art', 'Dancing', 'Hiking', 'Technology', 'Fashion',
  'Food', 'Nature', 'Writing', 'Yoga', 'Coffee', 'Wine', 'Books', 'Concerts',
  'Beach', 'Mountains', 'Comedy', 'Theater', 'Museums', 'Festivals'
];

export const MAX_INTERESTS = 5;

const InterestsStep = () => {
  const { formData, updateField } = useProfileSetup();

  const handleInterestToggle = (interest: string) => {
    const currentInterests = formData.interests;
    if (currentInterests.includes(interest)) {
      updateField('interests', currentInterests.filter(i => i !== interest));
    } else if (currentInterests.length < MAX_INTERESTS) {
      updateField('interests', [...currentInterests, interest]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold">What are you into?</h2>
        <p className="text-sm text-muted-foreground mt-1">Pick up to {MAX_INTERESTS} - great conversation starters</p>
      </div>
      <div className="flex justify-end">
        <span className="text-sm text-gray-600">{formData.interests.length}/{MAX_INTERESTS} selected</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {INTEREST_OPTIONS.map((interest) => {
          const selected = formData.interests.includes(interest);
          const disabled = !selected && formData.interests.length >= MAX_INTERESTS;
          return (
            <Button
              key={interest}
              variant={selected ? "default" : "outline"}
              onClick={() => handleInterestToggle(interest)}
              disabled={disabled}
              className="text-xs h-8 justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40"
              size="sm"
            >
              {interest}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default InterestsStep;
