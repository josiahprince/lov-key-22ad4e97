import { useOutletContext } from 'react-router-dom';
import SettingsScreen from '@/components/SettingsScreen';
import type { AppLayoutContext } from '@/components/AppLayout';

const SettingsPage = () => {
  const { userProfile } = useOutletContext<AppLayoutContext>();

  return <SettingsScreen userProfile={userProfile} />;
};

export default SettingsPage;
