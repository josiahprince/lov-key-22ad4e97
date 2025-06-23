
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
  gender: GenderType | '';
  sexual_orientation: OrientationType | '';
  interested_in: InterestedInType | '';
  location: string;
  interests: string[];
  religion: string;
  languages: string[];
}

interface ProfileSetupContextType {
  formData: ProfileFormData;
  updateField: (field: keyof ProfileFormData, value: any) => void;
  toggleArrayItem: (field: 'interests' | 'languages', value: string) => void;
  validateStep: (step: number) => boolean;
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
    gender: '',
    sexual_orientation: '',
    interested_in: '',
    location: '',
    interests: [],
    religion: '',
    languages: []
  });

  const updateField = (field: keyof ProfileFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: 'interests' | 'languages', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return formData.first_name && formData.last_name && formData.nickname && formData.age;
      case 2:
        return formData.gender && formData.sexual_orientation && formData.interested_in;
      case 3:
        return formData.location;
      case 4:
        return formData.interests.length > 0;
      case 5:
        return formData.religion;
      case 6:
        return formData.languages.length > 0;
      default:
        return false;
    }
  };

  return (
    <ProfileSetupContext.Provider value={{ formData, updateField, toggleArrayItem, validateStep }}>
      {children}
    </ProfileSetupContext.Provider>
  );
};
