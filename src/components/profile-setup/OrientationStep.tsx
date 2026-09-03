
import { Button } from '@/components/ui/button';
import { useProfileSetup } from './ProfileSetupContext';
import type { Database } from '@/integrations/supabase/types';

type OrientationType = Database['public']['Enums']['orientation_type'];

const ORIENTATION_OPTIONS: { value: OrientationType; label: string }[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'gay', label: 'Gay' },
  { value: 'lesbian', label: 'Lesbian' },
  { value: 'bisexual', label: 'Bisexual' },
  { value: 'pansexual', label: 'Pansexual' },
  { value: 'asexual', label: 'Asexual' },
  { value: 'other', label: 'Other' }
];

const OrientationStep = () => {
  const { formData, updateField } = useProfileSetup();

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold">Your sexual orientation</h2>
        <p className="text-sm text-muted-foreground mt-1">Helps us find the right people for you</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ORIENTATION_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={formData.sexual_orientation === option.value ? "default" : "outline"}
            onClick={() => updateField('sexual_orientation', option.value)}
            className="justify-center h-12 text-sm"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default OrientationStep;
