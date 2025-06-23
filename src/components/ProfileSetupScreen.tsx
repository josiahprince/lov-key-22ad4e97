
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { ProfileSetupProvider, useProfileSetup } from './profile-setup/ProfileSetupContext';
import BasicInfoStep from './profile-setup/BasicInfoStep';
import GenderOrientationStep from './profile-setup/GenderOrientationStep';
import LocationStep from './profile-setup/LocationStep';
import InterestsStep from './profile-setup/InterestsStep';
import ReligionStep from './profile-setup/ReligionStep';
import LanguagesStep from './profile-setup/LanguagesStep';

type GenderType = Database['public']['Enums']['gender_type'];
type OrientationType = Database['public']['Enums']['orientation_type'];
type InterestedInType = Database['public']['Enums']['interested_in_type'];

interface ProfileSetupScreenProps {
  onComplete: (profile: any) => void;
}

const ProfileSetupForm = ({ onComplete }: ProfileSetupScreenProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { formData, validateStep } = useProfileSetup();

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const profileData = {
        id: user.id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        nickname: formData.nickname,
        age: parseInt(formData.age),
        gender: formData.gender as GenderType,
        sexual_orientation: formData.sexual_orientation as OrientationType,
        interested_in: formData.interested_in as InterestedInType,
        location: formData.location,
        interests: formData.interests,
        religion: formData.religion,
        languages: formData.languages,
        is_profile_complete: true
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile setup completed!"
      });

      onComplete(profileData);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfoStep />;
      case 2:
        return <GenderOrientationStep />;
      case 3:
        return <LocationStep />;
      case 4:
        return <InterestsStep />;
      case 5:
        return <ReligionStep />;
      case 6:
        return <LanguagesStep />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 bg-white/80 backdrop-blur-sm shadow-xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img 
              src="/lovable-uploads/c28200aa-e002-4654-86ab-fcb6351cb739.png" 
              alt="LovKey Logo" 
              className="w-16 h-16"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Complete Your Profile</h1>
          <p className="text-sm text-gray-600 mt-2">
            Step {currentStep} of 6
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div 
              className="bg-rose-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>

        {renderStep()}

        <div className="flex justify-between mt-8">
          {currentStep > 1 && (
            <Button
              onClick={handleBack}
              variant="outline"
              className="flex-1 mr-2"
            >
              Back
            </Button>
          )}
          
          {currentStep < 6 ? (
            <Button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className="flex-1 bg-rose-500 hover:bg-rose-600"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!validateStep(currentStep) || loading}
              className="flex-1 bg-rose-500 hover:bg-rose-600"
            >
              {loading ? 'Saving...' : 'Complete Profile'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

const ProfileSetupScreen = ({ onComplete }: ProfileSetupScreenProps) => {
  return (
    <ProfileSetupProvider>
      <ProfileSetupForm onComplete={onComplete} />
    </ProfileSetupProvider>
  );
};

export default ProfileSetupScreen;
