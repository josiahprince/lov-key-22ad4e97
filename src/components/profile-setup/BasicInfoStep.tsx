
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useProfileSetup } from './ProfileSetupContext';

const BasicInfoStep = () => {
  const { formData, updateField } = useProfileSetup();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-6">Basic Information</h2>
      <div>
        <Label htmlFor="first_name">First Name *</Label>
        <Input
          id="first_name"
          value={formData.first_name}
          onChange={(e) => updateField('first_name', e.target.value)}
          placeholder="Enter your first name"
        />
      </div>
      <div>
        <Label htmlFor="last_name">Last Name *</Label>
        <Input
          id="last_name"
          value={formData.last_name}
          onChange={(e) => updateField('last_name', e.target.value)}
          placeholder="Enter your last name"
        />
      </div>
      <div>
        <Label htmlFor="nickname">Nickname *</Label>
        <Input
          id="nickname"
          value={formData.nickname}
          onChange={(e) => updateField('nickname', e.target.value)}
          placeholder="What should people call you?"
        />
      </div>
      <div>
        <Label htmlFor="age">Age *</Label>
        <Input
          id="age"
          type="number"
          min="18"
          max="100"
          value={formData.age}
          onChange={(e) => updateField('age', e.target.value)}
          placeholder="Enter your age"
        />
      </div>
    </div>
  );
};

export default BasicInfoStep;
