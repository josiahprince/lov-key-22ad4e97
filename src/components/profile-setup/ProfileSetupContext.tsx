
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
  interests: string[];
  religion: string;
  languages: string[];
}

interface ProfileSetupContextType {
  formData: ProfileFormData;
  updateField: (field: keyof ProfileFormData, value: any) => void;
  toggleArrayItem: (field: 'interests' | 'languages', value: string) => void;
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
    interests: [],
    religion: '',
    languages: []
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

  const updateField = (field: keyof ProfileFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validate age when date of birth is updated
    if (field === 'date_of_birth' && value) {
      const age = calculateAge(value);
      if (age < 18) {
        setDobError('You must be at least 18 years old to use this app.');
      } else {
        setDobError(null);
      }
    }
  };

  const toggleArrayItem = (field: 'interests' | 'languages', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        const hasBasicInfo = Boolean(formData.first_name && formData.last_name && formData.nickname && formData.date_of_birth);
        const isOldEnough = formData.date_of_birth ? calculateAge(formData.date_of_birth) >= 18 : false;
        return hasBasicInfo && isOldEnough && !dobError;
      case 2:
        return Boolean(formData.gender && formData.sexual_orientation && formData.interested_in);
      case 3:
        return Boolean(formData.location);
      case 4:
        return formData.interests.length > 0;
      case 5:
        return Boolean(formData.religion);
      case 6:
        return formData.languages.length > 0;
      default:
        return false;
    }
  };

  return (
    <ProfileSetupContext.Provider value={{ formData, updateField, toggleArrayItem, validateStep, dobError }}>
      {children}
    </ProfileSetupContext.Provider>
  );
};
