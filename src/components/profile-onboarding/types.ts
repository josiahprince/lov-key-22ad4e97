
import type { Database } from '@/integrations/supabase/types';

export type GenderType = Database['public']['Enums']['gender_type'];
export type OrientationType = Database['public']['Enums']['orientation_type'];
export type InterestedInType = Database['public']['Enums']['interested_in_type'];

export interface ProfileData {
  firstName: string;
  lastName: string;
  dateOfBirth: Date | undefined;
  gender: GenderType | null;
  sexualOrientation: OrientationType | null;
  interestedIn: InterestedInType | null;
}

export interface StepProps {
  profileData: ProfileData;
  updateProfileData: (field: keyof ProfileData, value: any) => void;
}
