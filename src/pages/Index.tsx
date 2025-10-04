
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
  const [currentScreen, setCurrentScreen] = useState('onboarding');
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
      console.log('Navigation state detected, setting screen to:', location.state.screen);
      setCurrentScreen(location.state.screen);
      // Clear the state to prevent it from persisting
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state]);

  useEffect(() => {
    console.log('Index component mounted, setting up auth listener...');
    
    // Set up auth state listener
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('User found, checking profile status...');
        // Use setTimeout to prevent blocking the auth state change
        setTimeout(() => {
          checkProfileStatus(session.user.id);
        }, 0);
      } else {
        console.log('No user, resetting profile state');
        setProfileComplete(false);
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Check for existing session
    const initializeAuth = async () => {
      console.log('Checking for existing session...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        console.log('Session check result:', session?.user?.id);
        
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
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();
    
    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  // Separate effect to handle onboarding screen logic after both profile and onboarding data are loaded
  useEffect(() => {
    // Only make screen decisions when both loading states are complete
    if (loading || onboardingLoading) {
      console.log('Still loading...', { loading, onboardingLoading });
      return;
    }

    // Don't override navigation state
    if (location.state?.screen) {
      console.log('Navigation state present, skipping auto screen decision');
      return;
    }

    // Only proceed if profile is complete
    if (!profileComplete) {
      console.log('Profile not complete, will show profile setup');
      return;
    }

    // Now make the onboarding decision
    console.log('Making onboarding decision:', { 
      shouldShowOnboarding, 
      loading, 
      onboardingLoading, 
      profileComplete,
      currentScreen 
    });

    if (shouldShowOnboarding) {
      console.log('✅ SHOWING ONBOARDING SCREEN');
      setCurrentScreen('onboarding');
    } else {
      console.log('✅ SHOWING MATCHES SCREEN');
      setCurrentScreen('matches');
    }
  }, [loading, onboardingLoading, profileComplete, shouldShowOnboarding, location.state]);

  const checkProfileStatus = async (userId: string) => {
    console.log('Checking profile status for user:', userId);
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log('Profile query result:', { profile, error });

      if (error) {
        console.error('Error checking profile status:', error);
        // If there's an error fetching profile, assume incomplete
        setProfileComplete(false);
        setCurrentScreen('profile-setup');
        setLoading(false);
        return;
      }

      if (profile) {
        console.log('Profile found:', profile);
        
        // Check if profile is complete
        const isComplete = profile.is_profile_complete === true;
        console.log('Profile complete status:', isComplete);
        
        if (isComplete) {
          setUserProfile(profile);
          setProfileComplete(true);
          // Don't set screen here - let useEffect handle it after onboarding data loads
          if (location.state?.screen) {
            setCurrentScreen(location.state.screen);
          }
        } else {
          setProfileComplete(false);
          setCurrentScreen('profile-setup');
        }
      } else {
        console.log('No profile found, showing profile setup');
        setProfileComplete(false);
        setCurrentScreen('profile-setup');
      }
    } catch (error) {
      console.error('Unexpected error checking profile status:', error);
      // On unexpected error, show profile setup to be safe
      setProfileComplete(false);
      setCurrentScreen('profile-setup');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    console.log('Auth success callback triggered');
    // Auth state will be updated by the listener
  };

  const handleProfileSetupComplete = (profile: any) => {
    console.log('Profile setup completed:', profile);
    setUserProfile(profile);
    setProfileComplete(true);
    setCurrentScreen('onboarding');
  };

  const handleOnboardingComplete = async (profile: any) => {
    console.log('Onboarding completed:', profile);
    
    // Navigate to matches screen immediately
    setCurrentScreen('matches');
    
    // Generate matches in background (already handled by useOnboardingData hook)
    console.log('Match generation triggered by onboarding completion');
  };

  const handleStartChat = (matchData: {
    matchId: string;
    matchedUserId: string;
    matchedUserName: string;
    matchedUserVibes: string;
  }) => {
    console.log('Navigating to chat screen with data:', matchData);
    setCurrentChat(matchData);
    setCurrentScreen('chat');
  };

  const handleBackToChats = () => {
    console.log('Navigating back to chats screen');
    setCurrentScreen('chats');
    setCurrentChat(null);
  };

  const handleNavigateToChats = () => {
    console.log('Navigating to chats screen');
    setCurrentScreen('chats');
  };

  const handleSignOut = async () => {
    console.log('Signing out user');
    setLoading(true);
    await supabase.auth.signOut();
    setCurrentScreen('onboarding');
    setUserProfile(null);
    setProfileComplete(false);
    setLoading(false);
  };

  console.log('Current render state:', { loading, user: !!user, profileComplete, currentScreen });

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
    console.log('Rendering auth screen');
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Show profile setup if user hasn't completed their profile
  if (!profileComplete) {
    console.log('Rendering profile setup screen');
    return <ProfileSetupScreen onComplete={handleProfileSetupComplete} />;
  }

  const renderScreen = () => {
    console.log('Rendering screen:', currentScreen);
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
