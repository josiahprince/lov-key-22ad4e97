
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProfileData {
  firstName: string;
  lastName: string;
  dateOfBirth: Date | undefined;
  gender: string;
  sexualOrientation: string;
  interestedIn: string;
}

const ProfileOnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    dateOfBirth: undefined,
    gender: '',
    sexualOrientation: '',
    interestedIn: '',
  });

  const totalSteps = 5;

  const genderOptions = [
    { value: 'male', label: 'Man' },
    { value: 'female', label: 'Woman' },
    { value: 'non_binary', label: 'Non-binary' },
    { value: 'other', label: 'Other' },
  ];

  const orientationOptions = [
    { value: 'straight', label: 'Straight' },
    { value: 'gay', label: 'Gay' },
    { value: 'lesbian', label: 'Lesbian' },
    { value: 'bisexual', label: 'Bisexual' },
    { value: 'pansexual', label: 'Pansexual' },
    { value: 'asexual', label: 'Asexual' },
    { value: 'other', label: 'Other' },
  ];

  const interestedInOptions = [
    { value: 'men', label: 'Men' },
    { value: 'women', label: 'Women' },
    { value: 'non_binary', label: 'Non-binary people' },
    { value: 'everyone', label: 'Everyone' },
  ];

  const updateProfileData = (field: keyof ProfileData, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          date_of_birth: profileData.dateOfBirth?.toISOString().split('T')[0],
          gender: profileData.gender,
          sexual_orientation: profileData.sexualOrientation,
          interested_in: profileData.interestedIn,
          is_profile_complete: true,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onComplete();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return profileData.firstName.trim() && profileData.lastName.trim();
      case 2:
        return profileData.dateOfBirth !== undefined;
      case 3:
        return profileData.gender !== '';
      case 4:
        return profileData.sexualOrientation !== '';
      case 5:
        return profileData.interestedIn !== '';
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-800">What's your name?</h2>
              <p className="text-sm text-gray-600">This is how you'll appear to others</p>
            </div>
            
            <div className="space-y-4">
              <Input
                placeholder="First name"
                value={profileData.firstName}
                onChange={(e) => updateProfileData('firstName', e.target.value)}
                className="h-12 rounded-2xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-pink-300 focus:ring-pink-200 transition-all duration-200 text-base"
              />
              <Input
                placeholder="Last name"
                value={profileData.lastName}
                onChange={(e) => updateProfileData('lastName', e.target.value)}
                className="h-12 rounded-2xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-pink-300 focus:ring-pink-200 transition-all duration-200 text-base"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-800">When's your birthday?</h2>
              <p className="text-sm text-gray-600">Your age will be shown on your profile</p>
            </div>
            
            <div className="flex justify-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 rounded-2xl border-gray-200 bg-gray-50/50 hover:bg-white justify-start text-left font-normal text-base",
                      !profileData.dateOfBirth && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {profileData.dateOfBirth ? format(profileData.dateOfBirth, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={profileData.dateOfBirth}
                    onSelect={(date) => updateProfileData('dateOfBirth', date)}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-800">What's your gender?</h2>
              <p className="text-sm text-gray-600">This helps us show you to the right people</p>
            </div>
            
            <div className="space-y-3">
              {genderOptions.map((option) => (
                <Card
                  key={option.value}
                  className={`p-4 cursor-pointer transition-all duration-200 hover:scale-105 border-2 ${
                    profileData.gender === option.value
                      ? 'bg-pink-50 border-pink-200 text-pink-700'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                  }`}
                  onClick={() => updateProfileData('gender', option.value)}
                >
                  <div className="text-center">
                    <p className="font-medium">{option.label}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-800">Sexual Orientation</h2>
              <p className="text-sm text-gray-600">This helps us understand your preferences</p>
            </div>
            
            <div className="space-y-3">
              {orientationOptions.map((option) => (
                <Card
                  key={option.value}
                  className={`p-4 cursor-pointer transition-all duration-200 hover:scale-105 border-2 ${
                    profileData.sexualOrientation === option.value
                      ? 'bg-pink-50 border-pink-200 text-pink-700'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                  }`}
                  onClick={() => updateProfileData('sexualOrientation', option.value)}
                >
                  <div className="text-center">
                    <p className="font-medium">{option.label}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-800">Who are you interested in?</h2>
              <p className="text-sm text-gray-600">This helps us show you relevant matches</p>
            </div>
            
            <div className="space-y-3">
              {interestedInOptions.map((option) => (
                <Card
                  key={option.value}
                  className={`p-4 cursor-pointer transition-all duration-200 hover:scale-105 border-2 ${
                    profileData.interestedIn === option.value
                      ? 'bg-pink-50 border-pink-200 text-pink-700'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                  }`}
                  onClick={() => updateProfileData('interestedIn', option.value)}
                >
                  <div className="text-center">
                    <p className="font-medium">{option.label}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-rose-400 to-red-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-xl shadow-2xl border-0 rounded-3xl overflow-hidden">
        <div className="p-8">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Step {step} of {totalSteps}</span>
              <span className="text-sm font-medium text-gray-600">{Math.round((step / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Step content */}
          {renderStep()}

          {error && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100">
              {error}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex space-x-3 mt-8">
            {step > 1 && (
              <Button
                onClick={handleBack}
                variant="outline"
                className="flex-1 h-12 rounded-2xl border-gray-200 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            
            <Button
              onClick={step === totalSteps ? handleComplete : handleNext}
              disabled={!canProceed() || loading}
              className="flex-1 h-12 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <>
                  {step === totalSteps ? 'Complete Profile' : 'Next'}
                  {step < totalSteps && <ChevronRight className="w-4 h-4 ml-2" />}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfileOnboardingScreen;
