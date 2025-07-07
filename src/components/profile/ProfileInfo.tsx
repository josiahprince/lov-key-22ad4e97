
import { Card } from '@/components/ui/card';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import VibeCard from './VibeCard';
import BasicInfoCard from './BasicInfoCard';
import ProfileEditModal from './ProfileEditModal';
import { useState } from 'react';

interface ProfileInfoProps {
  userProfile: any;
}

const ProfileInfo = ({ userProfile }: ProfileInfoProps) => {
  const { onboardingData, loading: onboardingLoading } = useOnboardingData();
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
      <BasicInfoCard userProfile={userProfile} onEdit={handleEdit} />
      
      {/* Onboarding Data Card */}
      {onboardingData && !onboardingLoading && (
        <VibeCard onboardingData={onboardingData} />
      )}

      {/* Profile Edit Modal */}
      <ProfileEditModal 
        isOpen={isEditing} 
        onClose={handleCloseEdit} 
        userProfile={userProfile} 
      />
    </div>
  );
};

export default ProfileInfo;
