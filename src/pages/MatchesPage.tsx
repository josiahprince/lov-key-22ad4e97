import { useNavigate, useOutletContext } from 'react-router-dom';
import MatchesScreen from '@/components/MatchesScreen';
import type { AppLayoutContext } from '@/components/AppLayout';

const MatchesPage = () => {
  const { userProfile } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();

  return (
    <MatchesScreen
      userProfile={userProfile}
      onNavigateToChats={() => navigate('/chats')}
    />
  );
};

export default MatchesPage;
