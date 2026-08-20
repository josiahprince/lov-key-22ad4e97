import { useOutletContext } from 'react-router-dom';
import ProfileScreen from '@/components/ProfileScreen';
import type { AppLayoutContext } from '@/components/AppLayout';

const ProfilePage = () => {
  const { userProfile } = useOutletContext<AppLayoutContext>();

  return <ProfileScreen userProfile={userProfile} />;
};

export default ProfilePage;
