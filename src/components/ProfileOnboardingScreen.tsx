import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ProfileData } from './profile-onboarding/types';
import NameStep from './profile-onboarding/NameStep';
import DateOfBirthStep from './profile-onboarding/DateOfBirthStep';
import GenderStep from './profile-onboarding/GenderStep';
import OrientationStep from './profile-onboarding/OrientationStep';
import InterestedInStep from './profile-onboarding/InterestedInStep';
import ProgressBar from './profile-onboarding/ProgressBar';
import NavigationButtons from './profile-onboarding/NavigationButtons';

const ProfileOnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    dateOfBirth: undefined,
    gender: null,
    sexualOrientation: null,
    interestedIn: null,
  });

  const totalSteps = 5;

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
          is_profile_complete: true as boolean,
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
        return profileData.gender !== null;
      case 4:
        return profileData.sexualOrientation !== null;
      case 5:
        return profileData.interestedIn !== null;
      default:
        return false;
    }
  };

  const renderStep = () => {
    const stepProps = { profileData, updateProfileData };
    
    switch (step) {
      case 1:
        return <NameStep {...stepProps} />;
      case 2:
        return <DateOfBirthStep {...stepProps} />;
      case 3:
        return <GenderStep {...stepProps} />;
      case 4:
        return <OrientationStep {...stepProps} />;
      case 5:
        return <InterestedInStep {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-rose-400 to-red-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-xl shadow-2xl border-0 rounded-3xl overflow-hidden">
        <div className="p-8">
          <ProgressBar step={step} totalSteps={totalSteps} />

          {renderStep()}

          {error && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100">
              {error}
            </div>
          )}

          <NavigationButtons
            step={step}
            totalSteps={totalSteps}
            canProceed={canProceed()}
            loading={loading}
            onBack={handleBack}
            onNext={handleNext}
            onComplete={handleComplete}
          />
        </div>
      </Card>
    </div>
  );
};

export default ProfileOnboardingScreen;
