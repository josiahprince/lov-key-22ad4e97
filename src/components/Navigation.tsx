
import { Heart, MessageCircle, User, Search } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

const Navigation = ({ currentScreen, setCurrentScreen }: { 
  currentScreen: string; 
  setCurrentScreen: (screen: string) => void; 
}) => {
  const navItems = [
    { id: 'matches', label: 'Matches', icon: Search },
    { id: 'chats', label: 'Chats', icon: MessageCircle },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-6 py-3">
      <div className="flex justify-between items-center">
        <div className="flex justify-around flex-1">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          // Handle both 'chats' and 'chat' as active for chats tab
          const isActive = currentScreen === item.id || (item.id === 'chats' && currentScreen === 'chat');
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id)}
              className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-rose-50 text-rose-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <IconComponent className={`w-5 h-5 ${isActive ? 'text-rose-600' : ''}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
        </div>
        <NotificationBell />
      </div>
    </div>
  );
};

export default Navigation;
