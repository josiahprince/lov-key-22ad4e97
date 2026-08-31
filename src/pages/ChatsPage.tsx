import { useNavigate } from 'react-router-dom';
import ChatsListScreen from '@/components/ChatsListScreen';

const ChatsPage = () => {
  const navigate = useNavigate();

  return (
    <ChatsListScreen
      onStartChat={(matchData) =>
        navigate(`/chats/${matchData.matchId}`, {
          state: {
            matchedUserId: matchData.matchedUserId,
            matchedUserName: matchData.matchedUserName,
            matchedUserVibes: matchData.matchedUserVibes,
            matchedUserPhoto: matchData.matchedUserPhoto,
          },
        })
      }
    />
  );
};

export default ChatsPage;
