
import { createContext, useContext, useState, ReactNode } from 'react';
import type { Database } from '@/integrations/supabase/types';

type GenderType = Database['public']['Enums']['gender_type'];
type OrientationType = Database['public']['Enums']['orientation_type'];
type InterestedInType = Database['public']['Enums']['interested_in_type'];

export interface ProfileFormData {
  first_name: string;
  last_name: string;
  nickname: string;
  age: string;
  date_of_birth: string;
  gender: GenderType | '';
  sexual_orientation: OrientationType | '';
  interested_in: InterestedInType | '';
  location: string;
  city: string;
  region: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  // Age preferences
  min_age_preference: number;
  max_age_preference: number;
  expand_age_range: boolean;
  // Distance preferences
  max_distance_preference: number;
  expand_distance_range: boolean;
  // Additional profile data
  interests: string[];
  personality_prompts: { [key: string]: string };
  languages_spoken: string[];
  // Not persisted to profiles - tracked here only so the Photos step can
  // gate "Next" the same way every other step does. Source of truth for the
  // actual photos is the user_photos table (see PhotosStep.tsx).
  hasPhoto: boolean;
}

export const TOTAL_SETUP_STEPS = 10;

interface ProfileSetupContextType {
  formData: ProfileFormData;
  updateField: (field: keyof ProfileFormData, value: ProfileFormData[keyof ProfileFormData]) => void;
  validateStep: (step: number) => boolean;
  dobError: string | null;
}

const ProfileSetupContext = createContext<ProfileSetupContextType | undefined>(undefined);

export const useProfileSetup = () => {
  const context = useContext(ProfileSetupContext);
  if (!context) {
    throw new Error('useProfileSetup must be used within ProfileSetupProvider');
  }
  return context;
};

export const ProfileSetupProvider = ({ children }: { children: ReactNode }) => {
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    nickname: '',
    age: '',
    date_of_birth: '',
    gender: '',
    sexual_orientation: '',
    interested_in: '',
    location: '',
    city: '',
    region: '',
    country: '',
    latitude: null,
    longitude: null,
    // Age preferences
    min_age_preference: 18,
    max_age_preference: 30,
    expand_age_range: false,
    // Distance preferences
    max_distance_preference: 25,
    expand_distance_range: false,
    // Additional profile data
    interests: [],
    personality_prompts: {},
    languages_spoken: [],
    hasPhoto: false
  });

  const [dobError, setDobError] = useState<string | null>(null);

  const calculateAge = (birthDate: string): number => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const updateField = (field: keyof ProfileFormData, value: ProfileFormData[keyof ProfileFormData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validate age when date of birth is updated
    if (field === 'date_of_birth' && value) {
      const age = calculateAge(value as string);
      if (age < 18) {
        setDobError('You must be at least 18 years old to use this app.');
      } else {
        setDobError(null);
      }
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Name
        return Boolean(formData.first_name && formData.last_name && formData.nickname);
      case 2: { // Birthday
        const isOldEnough = formData.date_of_birth ? calculateAge(formData.date_of_birth) >= 18 : false;
        return Boolean(formData.date_of_birth) && isOldEnough && !dobError;
      }
      case 3: // Gender
        return Boolean(formData.gender);
      case 4: // Sexual orientation
        return Boolean(formData.sexual_orientation);
      case 5: // Interested in
        return Boolean(formData.interested_in);
      case 6: // Photos
        return formData.hasPhoto;
      case 7: // Location
        return Boolean(formData.city && formData.country);
      case 8: // Interests
        return formData.interests.length > 0;
      case 9: // Languages (optional)
        return true;
      case 10: // Age/distance preferences (always have sane defaults)
        return Boolean(formData.min_age_preference >= 18 && formData.max_age_preference <= 90 &&
                      formData.min_age_preference <= formData.max_age_preference &&
                      formData.max_distance_preference >= 0 && formData.max_distance_preference <= 100);
      default:
        return false;
    }
  };

  return (
    <ProfileSetupContext.Provider value={{ formData, updateField, validateStep, dobError }}>
      {children}
    </ProfileSetupContext.Provider>
  );
};
