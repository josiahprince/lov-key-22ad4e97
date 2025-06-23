
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useProfileSetup } from './ProfileSetupContext';

const INTERESTS_OPTIONS = [
  'Music', 'Travel', 'Memes', 'Pets', 'Sports', 'Reading', 'Movies', 'Gaming',
  'Cooking', 'Art', 'Photography', 'Dancing', 'Fitness', 'Technology', 'Nature',
  'Fashion', 'Food', 'Adventure', 'Comedy', 'Science'
];

const InterestsStep = () => {
  const { formData, toggleArrayItem } = useProfileSetup();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-6">Interests & Hobbies</h2>
      <p className="text-center text-gray-600 mb-4">Select all that apply *</p>
      <div className="grid grid-cols-2 gap-3">
        {INTERESTS_OPTIONS.map((interest) => (
          <div key={interest} className="flex items-center space-x-2">
            <Checkbox
              id={interest}
              checked={formData.interests.includes(interest)}
              onCheckedChange={() => toggleArrayItem('interests', interest)}
            />
            <Label htmlFor={interest} className="text-sm">{interest}</Label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InterestsStep;
