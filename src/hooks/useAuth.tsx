import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // supabase-js re-emits auth events (e.g. on tab focus / token refresh
    // checks) with freshly-parsed session/user objects even when nothing
    // meaningful changed. Replacing state unconditionally on every event
    // gives consumers a new `user` reference each time, which in turn
    // invalidates any useCallback/useEffect keyed on `user` and causes
    // spurious refetches (visible as loading-state flicker on screens like
    // Matches/Chats). Only swap in a new reference when the actual
    // identity/token changed.
    const applySession = (nextSession: Session | null) => {
      setSession((prev) => (
        prev?.access_token === nextSession?.access_token && prev?.user?.id === nextSession?.user?.id
          ? prev
          : nextSession
      ));
      setUser((prev) => {
        const nextUser = nextSession?.user ?? null;
        return prev?.id === nextUser?.id ? prev : nextUser;
      });
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, session, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
