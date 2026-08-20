import { useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import ChatScreen from '@/components/ChatScreen';

interface ChatNavState {
  matchedUserId: string;
  matchedUserName: string;
  matchedUserVibes: string;
}

const ChatPage = () => {
  const { matchId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ChatNavState | null;

  useEffect(() => {
    // Reached directly (e.g. a fresh load/bookmark) without the chat partner's
    // details - there's nothing to render, so send the user back to the list.
    if (!state) {
      navigate('/chats', { replace: true });
    }
  }, [state, navigate]);

  if (!matchId || !state) {
    return null;
  }

  return (
    <ChatScreen
      matchId={matchId}
      matchedUserId={state.matchedUserId}
      matchedUserName={state.matchedUserName}
      matchedUserVibes={state.matchedUserVibes}
      onBackToChats={() => navigate('/chats')}
    />
  );
};

export default ChatPage;
