
import { Card } from '@/components/ui/card';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import VibeCard from './VibeCard';
import BasicInfoCard from './BasicInfoCard';
import { useState } from 'react';

interface ProfileInfoProps {
  userProfile: any;
}

const ProfileInfo = ({ userProfile }: ProfileInfoProps) => {
  const { onboardingData, loading: onboardingLoading } = useOnboardingData();
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = () => {
    // TODO: Implement edit functionality
    console.log('Edit profile clicked');
    setIsEditing(true);
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
      <BasicInfoCard userProfile={userProfile} onEdit={handleEdit} />
      
      {/* Onboarding Data Card */}
      {onboardingData && !onboardingLoading && (
        <VibeCard onboardingData={onboardingData} />
      )}
    </div>
  );
};

export default ProfileInfo;
