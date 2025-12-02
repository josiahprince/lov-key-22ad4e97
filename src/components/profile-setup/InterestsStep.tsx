import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useProfileSetup } from './ProfileSetupContext';

const INTEREST_OPTIONS = [
  'Music', 'Travel', 'Memes', 'Pets', 'Sports', 'Photography', 'Cooking', 'Reading',
  'Movies', 'Gaming', 'Fitness', 'Art', 'Dancing', 'Hiking', 'Technology', 'Fashion',
  'Food', 'Nature', 'Writing', 'Yoga', 'Coffee', 'Wine', 'Books', 'Concerts',
  'Beach', 'Mountains', 'Comedy', 'Theater', 'Museums', 'Festivals'
];

const LANGUAGE_OPTIONS = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch',
  'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian', 'Polish',
  'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Greek', 'Turkish', 'Hebrew',
  'Thai', 'Vietnamese', 'Indonesian', 'Tagalog', 'Swahili'
];


const InterestsStep = () => {
  const { formData, updateField } = useProfileSetup();

  const handleInterestToggle = (interest: string) => {
    const currentInterests = formData.interests;
    if (currentInterests.includes(interest)) {
      updateField('interests', currentInterests.filter(i => i !== interest));
    } else {
      updateField('interests', [...currentInterests, interest]);
    }
  };

  const handleLanguageToggle = (language: string) => {
    const currentLanguages = formData.languages_spoken;
    if (currentLanguages.includes(language)) {
      updateField('languages_spoken', currentLanguages.filter(l => l !== language));
    } else {
      updateField('languages_spoken', [...currentLanguages, language]);
    }
  };


  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-center mb-6">Tell Us More About You</h2>
      
      {/* Interests Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label className="text-lg font-semibold">Interests & Hobbies *</Label>
          <span className="text-sm text-gray-600">{formData.interests.length} selected</span>
        </div>
        <p className="text-sm text-gray-600">Select at least one interest</p>
        <div className="grid grid-cols-3 gap-2">
          {INTEREST_OPTIONS.map((interest) => (
            <Button
              key={interest}
              variant={formData.interests.includes(interest) ? "default" : "outline"}
              onClick={() => handleInterestToggle(interest)}
              className="text-xs h-8 justify-center transition-all duration-200 hover:scale-105 active:scale-95"
              size="sm"
            >
              {interest}
            </Button>
          ))}
        </div>
      </div>

      {/* Languages Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label className="text-lg font-semibold">Languages Spoken *</Label>
          <span className="text-sm text-gray-600">{formData.languages_spoken.length} selected</span>
        </div>
        <p className="text-sm text-gray-600">Select at least one language</p>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGE_OPTIONS.map((language) => (
            <Button
              key={language}
              variant={formData.languages_spoken.includes(language) ? "default" : "outline"}
              onClick={() => handleLanguageToggle(language)}
              className="text-sm h-8 justify-start transition-all duration-200 hover:scale-105 active:scale-95"
              size="sm"
            >
              {language}
            </Button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default InterestsStep;