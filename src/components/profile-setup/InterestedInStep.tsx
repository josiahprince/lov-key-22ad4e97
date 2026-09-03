
import { Button } from '@/components/ui/button';
import { useProfileSetup } from './ProfileSetupContext';
import type { Database } from '@/integrations/supabase/types';

type InterestedInType = Database['public']['Enums']['interested_in_type'];

const INTERESTED_IN_OPTIONS: { value: InterestedInType; label: string }[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'everyone', label: 'Everyone' }
];

const InterestedInStep = () => {
  const { formData, updateField } = useProfileSetup();

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold">Show me...</h2>
        <p className="text-sm text-muted-foreground mt-1">Who would you like to match with?</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {INTERESTED_IN_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={formData.interested_in === option.value ? "default" : "outline"}
            onClick={() => updateField('interested_in', option.value)}
            className="justify-center h-14 text-base"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default InterestedInStep;
