
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useProfileSetup } from './ProfileSetupContext';

const BirthdayStep = () => {
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
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold">When's your birthday?</h2>
        <p className="text-sm text-muted-foreground mt-1">You must be 18 or older to use LovKey</p>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-12 text-base",
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
      {displayAge !== null && !dobError && (
        <p className="text-sm text-center text-muted-foreground">You are {displayAge} years old</p>
      )}
      {dobError && (
        <p className="text-sm text-red-600 text-center">{dobError}</p>
      )}
    </div>
  );
};

export default BirthdayStep;
