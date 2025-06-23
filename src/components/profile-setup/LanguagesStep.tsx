
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useProfileSetup } from './ProfileSetupContext';

const LANGUAGES_OPTIONS = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian',
  'Chinese (Mandarin)', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Dutch',
  'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish', 'Czech', 'Hungarian'
];

const LanguagesStep = () => {
  const { formData, toggleArrayItem } = useProfileSetup();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-6">Languages Spoken</h2>
      <p className="text-center text-gray-600 mb-4">Select all languages you speak *</p>
      <div className="grid grid-cols-2 gap-3">
        {LANGUAGES_OPTIONS.map((language) => (
          <div key={language} className="flex items-center space-x-2">
            <Checkbox
              id={language}
              checked={formData.languages.includes(language)}
              onCheckedChange={() => toggleArrayItem('languages', language)}
            />
            <Label htmlFor={language} className="text-sm">{language}</Label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LanguagesStep;
