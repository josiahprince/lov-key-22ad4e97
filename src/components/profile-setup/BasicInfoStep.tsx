
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useProfileSetup } from './ProfileSetupContext';

const BasicInfoStep = () => {
  const { formData, updateField, dobError } = useProfileSetup();

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const calculatedAge = calculateAge(date);
      updateField('date_of_birth', format(date, 'yyyy-MM-dd'));
      updateField('age', calculatedAge.toString());
    }
  };

  const selectedDate = formData.date_of_birth ? new Date(formData.date_of_birth) : undefined;
  const displayAge = selectedDate ? calculateAge(selectedDate) : null;

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
        <Label>Date of Birth *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground",
                dobError && "border-red-500"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? (
                format(selectedDate, 'MMM d, yyyy')
              ) : (
                <span>Select date of birth</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
              initialFocus
              className={cn("p-3 pointer-events-auto")}
              captionLayout="dropdown-buttons"
              fromYear={1900}
              toYear={new Date().getFullYear()}
            />
          </PopoverContent>
        </Popover>
        {dobError && (
          <p className="text-sm text-red-600 mt-1">
            {dobError}
          </p>
        )}
      </div>
    </div>
  );
};

export default BasicInfoStep;
