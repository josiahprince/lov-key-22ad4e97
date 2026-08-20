
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import AuthScreen from '../components/AuthScreen';
import OnboardingScreen from '../components/OnboardingScreen';
import ProfileSetupScreen from '../components/ProfileSetupScreen';
import MatchesScreen from '../components/MatchesScreen';
import ChatScreen from '../components/ChatScreen';
import ChatsListScreen from '../components/ChatsListScreen';
import ProfileScreen from '../components/ProfileScreen';
import Navigation from '../components/Navigation';
import { useOnboardingData } from '@/hooks/useOnboardingData';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<string>('');
  const location = useLocation();
  const [userProfile, setUserProfile] = useState(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [currentChat, setCurrentChat] = useState<{
    matchId: string;
    matchedUserId: string;
    matchedUserName: string;
    matchedUserVibes: string;
  } | null>(null);
  
  const { shouldShowOnboarding, loading: onboardingLoading } = useOnboardingData();

  // Handle navigation from match profile back to matches
  useEffect(() => {
    if (location.state?.screen) {
      setCurrentScreen(location.state.screen);
      // Clear the state to prevent it from persisting
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state?.screen]);

  useEffect(() => {
    
    // Set up auth state listener
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Use setTimeout to prevent blocking the auth state change
        setTimeout(() => {
          checkProfileStatus(session.user.id);
        }, 0);
      } else {
        setProfileComplete(false);
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          setLoading(false);
          return;
        }

        if (session?.user) {
          setSession(session);
          setUser(session.user);
          await checkProfileStatus(session.user.id);
        } else {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      } catch (error) {
        setLoading(false);
      }
    };

    initializeAuth();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Separate effect to handle onboarding screen logic after both profile and onboarding data are loaded
  useEffect(() => {
    // Only make screen decisions when both loading states are complete
    if (loading || onboardingLoading) {
      return;
    }

    // Only proceed if profile is complete
    if (!profileComplete) {
      return;
    }

    // Don't override user-initiated navigation (like back from profile view)
    if (location.state?.screen && currentScreen !== '') {
      return;
    }

    // Now make the onboarding decision

    if (shouldShowOnboarding) {
      setCurrentScreen('onboarding');
    } else if (!currentScreen || currentScreen === '') {
      setCurrentScreen('matches');
    }
  }, [loading, onboardingLoading, profileComplete, shouldShowOnboarding]);

  const checkProfileStatus = async (userId: string) => {
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // If there's an error fetching profile, assume incomplete
        setProfileComplete(false);
        setCurrentScreen('profile-setup');
        setLoading(false);
        return;
      }

      if (profile) {
        
        // Check if profile is complete
        const isComplete = profile.is_profile_complete === true;
        
        if (isComplete) {
          setUserProfile(profile);
          setProfileComplete(true);
          // Don't set screen here - let useEffect handle it after onboarding data loads
        } else {
          setProfileComplete(false);
          setCurrentScreen('profile-setup');
        }
      } else {
        setProfileComplete(false);
        setCurrentScreen('profile-setup');
      }
    } catch (error) {
      // On unexpected error, show profile setup to be safe
      setProfileComplete(false);
      setCurrentScreen('profile-setup');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    // Auth state will be updated by the listener
  };

  const handleProfileSetupComplete = (profile: any) => {
    setUserProfile(profile);
    setProfileComplete(true);
    setCurrentScreen('onboarding');
  };

  const handleOnboardingComplete = async (profile: any) => {
    
    // Navigate to matches screen immediately
    setCurrentScreen('matches');
    
    // Generate matches in background (already handled by useOnboardingData hook)
  };

  const handleStartChat = (matchData: {
    matchId: string;
    matchedUserId: string;
    matchedUserName: string;
    matchedUserVibes: string;
  }) => {
    setCurrentChat(matchData);
    setCurrentScreen('chat');
  };

  const handleBackToChats = () => {
    setCurrentScreen('chats');
    setCurrentChat(null);
  };

  const handleNavigateToChats = () => {
    setCurrentScreen('chats');
    setCurrentChat(null); // Clear any previous chat state
  };

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setCurrentScreen('onboarding');
    setUserProfile(null);
    setProfileComplete(false);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth screen if user is not authenticated
  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Show profile setup if user hasn't completed their profile
  if (!profileComplete) {
    return <ProfileSetupScreen onComplete={handleProfileSetupComplete} />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'onboarding':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6">
            {/* Hero Section */}
            <div className="text-center mb-6 space-y-3">
              <div className="flex items-center justify-center mb-4">
                <img src="/lovable-uploads/c28200aa-e002-4654-86ab-fcb6351cb739.png" alt="LovKey Logo" className="w-20 h-20" />
              </div>
              
              <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 bg-clip-text text-transparent md:text-4xl">
                Welcome to LovKey
              </h1>
              
              <p className="text-xl text-4xl font-semibold text-red-900 md:font-bold">
                Low-key matching minds — before photos.
              </p>
            </div>

            <OnboardingScreen onComplete={handleOnboardingComplete} />
          </div>
        );
      case 'matches':
        return <MatchesScreen userProfile={userProfile} onStartChat={handleStartChat} onNavigateToChats={handleNavigateToChats} />;
      case 'chats':
        return <ChatsListScreen onStartChat={handleStartChat} />;
      case 'chat':
        return currentChat ? (
          <ChatScreen 
            matchId={currentChat.matchId}
            matchedUserId={currentChat.matchedUserId}
            matchedUserName={currentChat.matchedUserName}
            matchedUserVibes={currentChat.matchedUserVibes}
            onBackToChats={handleBackToChats}
          />
        ) : (
          <ChatsListScreen onStartChat={handleStartChat} />
        );
      case 'profile':
        return <ProfileScreen userProfile={userProfile} onSignOut={handleSignOut} />;
      default:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6">
            <div className="text-center mb-6 space-y-3">
              <div className="flex items-center justify-center mb-4">
                <img src="/lovable-uploads/c28200aa-e002-4654-86ab-fcb6351cb739.png" alt="LovKey Logo" className="w-20 h-20" />
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                Welcome to LovKey
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-700 font-medium italic">
                Low-key matching minds — before photos.
              </p>
              
              <div className="w-24 h-1 bg-gradient-to-r from-rose-500 to-orange-500 mx-auto rounded-full"></div>
            </div>

            <OnboardingScreen onComplete={handleOnboardingComplete} />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-pink-50">
      <div className="max-w-md mx-auto min-h-screen bg-white/80 backdrop-blur-sm shadow-xl">
        {renderScreen()}
        {currentScreen !== 'onboarding' && currentScreen !== 'profile-setup' && (
          <Navigation currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
        )}
      </div>
    </div>
  );
};

export default Index;
