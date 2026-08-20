import { MessageCircle, User, Search } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';

const Navigation = () => {
  const location = useLocation();
  const navItems = [
    { path: '/matches', label: 'Matches', icon: Search },
    { path: '/chats', label: 'Chats', icon: MessageCircle },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-6 py-3">
      <div className="flex justify-between items-center">
        <div className="flex justify-around flex-1">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          // Treat any /chats/* route (including an open chat) as the chats tab
          const isActive = item.path === '/chats'
            ? location.pathname.startsWith('/chats')
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-rose-50 text-rose-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <IconComponent className={`w-5 h-5 ${isActive ? 'text-rose-600' : ''}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          );
        })}
        </div>
        <NotificationBell />
      </div>
    </div>
  );
};

export default Navigation;
