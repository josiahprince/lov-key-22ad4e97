
import { Button } from '@/components/ui/button';
import { useProfileSetup } from './ProfileSetupContext';

const RELIGION_OPTIONS = [
  'Christianity', 'Islam', 'Judaism', 'Hinduism', 'Buddhism', 'Sikhism',
  'Atheist', 'Agnostic', 'Spiritual', 'Other', 'Prefer not to say'
];

const ReligionStep = () => {
  const { formData, updateField } = useProfileSetup();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-6">Religion & Beliefs</h2>
      <div className="grid grid-cols-2 gap-3">
        {RELIGION_OPTIONS.map((religion) => (
          <Button
            key={religion}
            variant={formData.religion === religion ? "default" : "outline"}
            onClick={() => updateField('religion', religion)}
            className="justify-start text-sm"
          >
            {religion}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ReligionStep;
