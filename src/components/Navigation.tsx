
import { Heart, MessageCircle, User } from 'lucide-react';

interface NavigationProps {
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
}

const Navigation = ({ currentScreen, setCurrentScreen }: NavigationProps) => {
  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-6 py-3">
      <div className="flex justify-around items-center">
        <button
          onClick={() => setCurrentScreen('matches')}
          className={`flex flex-col items-center space-y-1 ${
            currentScreen === 'matches' ? 'text-rose-600' : 'text-gray-500'
          }`}
        >
          <Heart className="h-5 w-5" />
          <span className="text-xs">Matches</span>
        </button>
        
        <button
          onClick={() => setCurrentScreen('chat')}
          className={`flex flex-col items-center space-y-1 ${
            currentScreen === 'chat' ? 'text-rose-600' : 'text-gray-500'
          }`}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-xs">Chat</span>
        </button>
        
        <button
          onClick={() => setCurrentScreen('profile')}
          className={`flex flex-col items-center space-y-1 ${
            currentScreen === 'profile' ? 'text-rose-600' : 'text-gray-500'
          }`}
        >
          <User className="h-5 w-5" />
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </div>
  );
};

export default Navigation;
