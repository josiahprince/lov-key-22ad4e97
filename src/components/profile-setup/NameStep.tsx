
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useProfileSetup } from './ProfileSetupContext';

const NameStep = () => {
  const { formData, updateField } = useProfileSetup();

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold">What's your name?</h2>
        <p className="text-sm text-muted-foreground mt-1">Your nickname is what matches will see</p>
      </div>
      <div>
        <Label htmlFor="nickname">Nickname *</Label>
        <Input
          id="nickname"
          value={formData.nickname}
          onChange={(e) => updateField('nickname', e.target.value)}
          placeholder="What should people call you?"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => updateField('first_name', e.target.value)}
            placeholder="First name"
          />
        </div>
        <div>
          <Label htmlFor="last_name">Last Name *</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => updateField('last_name', e.target.value)}
            placeholder="Last name"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Your first and last name are kept private and never shown to other users.
      </p>
    </div>
  );
};

export default NameStep;
