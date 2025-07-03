
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
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

  const handleAgeRangeChange = (values: number[]) => {
    updateField('min_age_preference', values[0]);
    updateField('max_age_preference', values[1]);
  };

  const handleDistanceChange = (values: number[]) => {
    updateField('max_distance_preference', values[0]);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center mb-6">Preferences & Orientation</h2>
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

      {/* Age Preferences */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">Age</Label>
        <div className="space-y-3">
          <div className="text-sm font-medium">
            Between {formData.min_age_preference} and {formData.max_age_preference}
          </div>
          <Slider
            value={[formData.min_age_preference, formData.max_age_preference]}
            onValueChange={handleAgeRangeChange}
            min={18}
            max={90}
            step={1}
            className="w-full"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">See people 2 years either side if I run out</span>
            <Switch
              checked={formData.expand_age_range}
              onCheckedChange={(checked) => updateField('expand_age_range', checked)}
            />
          </div>
        </div>
      </div>

      {/* Distance Preferences */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">Distance</Label>
        <div className="space-y-3">
          <div className="text-sm font-medium">
            Up to {formData.max_distance_preference} kilometres away
          </div>
          <Slider
            value={[formData.max_distance_preference]}
            onValueChange={handleDistanceChange}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">See people slightly further away if I run out</span>
            <Switch
              checked={formData.expand_distance_range}
              onCheckedChange={(checked) => updateField('expand_distance_range', checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenderOrientationStep;
