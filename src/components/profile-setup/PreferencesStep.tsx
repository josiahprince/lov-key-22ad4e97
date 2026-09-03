
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useProfileSetup } from './ProfileSetupContext';

const PreferencesStep = () => {
  const { formData, updateField } = useProfileSetup();

  const handleAgeRangeChange = (values: number[]) => {
    updateField('min_age_preference', values[0]);
    updateField('max_age_preference', values[1]);
  };

  const handleDistanceChange = (values: number[]) => {
    updateField('max_distance_preference', values[0]);
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold">Your match preferences</h2>
        <p className="text-sm text-muted-foreground mt-1">You can change these anytime</p>
      </div>

      <div className="space-y-3">
        <Label className="text-lg font-semibold">Age</Label>
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

      <div className="space-y-3">
        <Label className="text-lg font-semibold">Distance</Label>
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
  );
};

export default PreferencesStep;
