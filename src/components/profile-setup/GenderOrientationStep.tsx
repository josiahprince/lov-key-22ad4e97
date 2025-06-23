
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useProfileSetup } from './ProfileSetupContext';
import type { Database } from '@/integrations/supabase/types';

type GenderType = Database['public']['Enums']['gender_type'];
type OrientationType = Database['public']['Enums']['orientation_type'];
type InterestedInType = Database['public']['Enums']['interested_in_type'];

const GENDER_OPTIONS: { value: GenderType; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' }
];

const ORIENTATION_OPTIONS: { value: OrientationType; label: string }[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'gay', label: 'Gay' },
  { value: 'lesbian', label: 'Lesbian' },
  { value: 'bisexual', label: 'Bisexual' },
  { value: 'pansexual', label: 'Pansexual' },
  { value: 'asexual', label: 'Asexual' },
  { value: 'other', label: 'Other' }
];

const INTERESTED_IN_OPTIONS: { value: InterestedInType; label: string }[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'everyone', label: 'Everyone' }
];

const GenderOrientationStep = () => {
  const { formData, updateField } = useProfileSetup();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center mb-6">Gender & Orientation</h2>
      <div>
        <Label>Gender *</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {GENDER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={formData.gender === option.value ? "default" : "outline"}
              onClick={() => updateField('gender', option.value)}
              className="justify-start"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label>Sexual Orientation *</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {ORIENTATION_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={formData.sexual_orientation === option.value ? "default" : "outline"}
              onClick={() => updateField('sexual_orientation', option.value)}
              className="justify-start text-sm"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label>Interested In *</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {INTERESTED_IN_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={formData.interested_in === option.value ? "default" : "outline"}
              onClick={() => updateField('interested_in', option.value)}
              className="justify-start"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GenderOrientationStep;
