
import { Card } from '@/components/ui/card';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { useState } from 'react';
import ProfileEditModal from './ProfileEditModal';
import BasicInfoCard from './BasicInfoCard';
import VibeCard from './VibeCard';

interface ProfileInfoProps {
  userProfile: any;
}

const ProfileInfo = ({ userProfile }: ProfileInfoProps) => {
  const { onboardingData, loading: onboardingLoading } = useOnboardingData();
  const [showEditModal, setShowEditModal] = useState(false);

  if (!userProfile) {
    return (
      <Card className="p-4">
        <p className="text-gray-600 text-center">Loading profile information...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Your Profile Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Your Profile</h2>
        <p className="text-gray-600 text-sm mt-1">This is how others see you</p>
      </div>

      {/* Basic Info Card */}
      <BasicInfoCard 
        userProfile={userProfile} 
        onEdit={() => setShowEditModal(true)} 
      />

      {/* Onboarding Data Card */}
      {onboardingData && !onboardingLoading && (
        <VibeCard onboardingData={onboardingData} />
      )}

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        userProfile={userProfile}
      />
    </div>
  );
};

export default ProfileInfo;
