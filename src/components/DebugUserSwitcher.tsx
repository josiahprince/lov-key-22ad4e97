import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { User, Settings } from 'lucide-react';

interface TestUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
}

export const DebugUserSwitcher = () => {
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Only show in development or preview mode
  const isDev = import.meta.env.DEV || window.location.hostname.includes('lovableproject.com');
  
  if (!isDev) {
    return null;
  }

  useEffect(() => {
    fetchTestUsers();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user?.id || null);
  };

  const fetchTestUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, nickname')
        .eq('is_profile_complete', true)
        .order('first_name')
        .limit(10);

      if (!error && data) {
        setTestUsers(data);
      }
    } catch (error) {
      console.error('Error fetching test users:', error);
    }
  };

  const switchUser = async (userId: string) => {
    setLoading(true);
    try {
      // Sign out current user
      await supabase.auth.signOut();
      
      // For development, we'll need to simulate signing in as another user
      // This is a simplified approach for testing purposes
      console.log('Switching to user:', userId);
      
      // In a real scenario, you might need to create a special admin function
      // or use a testing token system. For now, we'll just reload and let
      // the user manually sign in as the test user
      
      // Reload the page to reset the app state
      window.location.reload();
      
    } catch (error) {
      console.error('Error switching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = (user: TestUser) => {
    if (user.nickname) return user.nickname;
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
    return `User ${user.id.slice(0, 8)}`;
  };

  return (
    <div className="fixed top-2 right-2 z-50 bg-red-500/10 border border-red-500/20 rounded-lg p-1">
      <div className="text-xs text-red-600 font-mono mb-1 px-2">DEBUG MODE</div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 bg-white/80 hover:bg-white"
            disabled={loading}
          >
            <Settings className="h-3 w-3 mr-1" />
            Switch User
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
            Test Users
          </div>
          <DropdownMenuSeparator />
          {testUsers.map((user) => (
            <DropdownMenuItem
              key={user.id}
              onClick={() => switchUser(user.id)}
              className={`flex items-center gap-2 ${
                currentUser === user.id ? 'bg-accent' : ''
              }`}
            >
              <User className="h-3 w-3" />
              <div className="flex flex-col">
                <span className="text-sm">{getUserDisplayName(user)}</span>
                <span className="text-xs text-muted-foreground">
                  {user.id.slice(0, 8)}...
                </span>
              </div>
              {currentUser === user.id && (
                <span className="ml-auto text-xs text-green-600">Current</span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={fetchTestUsers} className="text-xs">
            Refresh Users
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};