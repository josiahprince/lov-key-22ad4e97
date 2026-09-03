
import { Button } from '@/components/ui/button';
import { useProfileSetup } from './ProfileSetupContext';
import type { Database } from '@/integrations/supabase/types';

type GenderType = Database['public']['Enums']['gender_type'];

const GENDER_OPTIONS: { value: GenderType; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' }
];

const GenderStep = () => {
  const { formData, updateField } = useProfileSetup();

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold">I am a...</h2>
        <p className="text-sm text-muted-foreground mt-1">This is shown on your profile</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {GENDER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={formData.gender === option.value ? "default" : "outline"}
            onClick={() => updateField('gender', option.value)}
            className="justify-center h-14 text-base"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default GenderStep;
