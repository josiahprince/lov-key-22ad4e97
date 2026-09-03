
import { Button } from '@/components/ui/button';
import { useProfileSetup } from './ProfileSetupContext';

const LANGUAGE_OPTIONS = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch',
  'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian', 'Polish',
  'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Greek', 'Turkish', 'Hebrew',
  'Thai', 'Vietnamese', 'Indonesian', 'Tagalog', 'Swahili'
];

const LanguagesStep = () => {
  const { formData, updateField } = useProfileSetup();

  const handleLanguageToggle = (language: string) => {
    const currentLanguages = formData.languages_spoken;
    if (currentLanguages.includes(language)) {
      updateField('languages_spoken', currentLanguages.filter(l => l !== language));
    } else {
      updateField('languages_spoken', [...currentLanguages, language]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold">Languages you speak</h2>
        <p className="text-sm text-muted-foreground mt-1">Optional - helps us match you with people you can talk to</p>
      </div>
      <div className="flex justify-end">
        <span className="text-sm text-gray-600">{formData.languages_spoken.length} selected</span>
      </div>
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
  );
};

export default LanguagesStep;
