import { Card } from '@/components/ui/card';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { useMatchedUserOnboardingData } from '@/hooks/useMatchedUserOnboardingData';
import VibeCard from './VibeCard';
import BasicInfoCard from './BasicInfoCard';
import ProfileEditModal from './ProfileEditModal';
import { useState } from 'react';
import type { ProfileLike } from '@/types/domain';

interface ProfileInfoProps {
  userProfile: ProfileLike | null;
  isMatchedUser?: boolean;
  matchedUserId?: string;
}

const ProfileInfo = ({ userProfile, isMatchedUser = false, matchedUserId }: ProfileInfoProps) => {
  // Fetch current user's onboarding data (for own profile)
  const { onboardingData: ownOnboardingData, loading: ownOnboardingLoading } = useOnboardingData();
  
  // Fetch matched user's onboarding data (for matched user profile)
  const { onboardingData: matchedOnboardingData, loading: matchedOnboardingLoading } = useMatchedUserOnboardingData(
    isMatchedUser ? matchedUserId : undefined
  );

  // Use the appropriate onboarding data based on whether viewing own or matched profile
  const onboardingData = isMatchedUser ? matchedOnboardingData : ownOnboardingData;
  const onboardingLoading = isMatchedUser ? matchedOnboardingLoading : ownOnboardingLoading;

  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCloseEdit = () => {
    setIsEditing(false);
  };

  if (!userProfile) {
    return (
      <Card className="p-4">
        <p className="text-gray-600 text-center">Loading profile information...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Basic Profile Information Card */}
      <BasicInfoCard 
        userProfile={userProfile} 
        onEdit={isMatchedUser ? undefined : handleEdit} 
      />
      
      {/* Onboarding Data Card */}
      {onboardingData && !onboardingLoading && (
        <VibeCard 
          onboardingData={onboardingData} 
          isMatchedUser={isMatchedUser}
          matchedUserId={matchedUserId}
        />
      )}

      {/* Profile Edit Modal - only show for own profile */}
      {!isMatchedUser && (
        <ProfileEditModal 
          isOpen={isEditing} 
          onClose={handleCloseEdit} 
          userProfile={userProfile} 
        />
      )}
    </div>
  );
};

export default ProfileInfo;
