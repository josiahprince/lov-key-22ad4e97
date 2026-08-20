import type { Database } from '@/integrations/supabase/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type MatchedProfile = Database['public']['Tables']['profiles_matched_view']['Row'];
export type OnboardingRow = Database['public']['Tables']['user_onboarding']['Row'];
export type MatchRow = Database['public']['Tables']['matches']['Row'];

// Screens like ProfileHeader/ProfileInfo render either the signed-in user's
// own profile (`profiles`) or a matched user's public profile
// (`profiles_matched_view`) depending on an `isMatchedUser` flag, so they
// accept this permissive shape covering fields from both.
export type ProfileLike = Partial<Profile> & Partial<MatchedProfile>;

// The camelCase shape both useOnboardingData and useMatchedUserOnboardingData
// map their `user_onboarding` rows into.
export interface MappedOnboardingData {
  id?: string;
  mood: string;
  selectedMemes: string[];
  perfectSunday: string;
  createdAt?: string;
  updatedAt?: string;
  lastOnboardingDate?: string;
  onboardingShownToday?: boolean;
}
