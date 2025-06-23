
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useProfileSetup } from './ProfileSetupContext';

const LocationStep = () => {
  const { formData, updateField } = useProfileSetup();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-6">Location</h2>
      <div>
        <Label htmlFor="location">Where are you located? *</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => updateField('location', e.target.value)}
          placeholder="City, State/Country"
        />
      </div>
    </div>
  );
};

export default LocationStep;
