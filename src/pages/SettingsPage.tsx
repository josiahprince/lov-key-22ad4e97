import { useOutletContext } from 'react-router-dom';
import SettingsScreen from '@/components/SettingsScreen';
import type { AppLayoutContext } from '@/components/AppLayout';

const SettingsPage = () => {
  const { userProfile, updateUserProfile } = useOutletContext<AppLayoutContext>();

  return <SettingsScreen userProfile={userProfile} onProfileUpdated={updateUserProfile} />;
};

export default SettingsPage;
