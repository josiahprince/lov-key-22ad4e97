
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import AuthScreen from '../components/AuthScreen';
import OnboardingScreen from '../components/OnboardingScreen';
import ProfileSetupScreen from '../components/ProfileSetupScreen';
import MatchesScreen from '../components/MatchesScreen';
import ChatScreen from '../components/ChatScreen';
import ProfileScreen from '../components/ProfileScreen';
import Navigation from '../components/Navigation';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('onboarding');
  const [userProfile, setUserProfile] = useState(null);
  const [profileComplete, setProfileComplete] = useState(false);

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
        await checkProfileStatus(session.user.id);
      } else {
        console.log('No user, resetting profile state');
        setProfileComplete(false);
        setUserProfile(null);
      }
      
      console.log('Setting loading to false');
      setLoading(false);
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
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await checkProfileStatus(session.user.id);
        }
        
        setLoading(false);
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

  const checkProfileStatus = async (userId: string) => {
    console.log('Checking profile status for user:', userId);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking profile status:', error);
        return;
      }

      console.log('Profile data:', profile);

      if (profile && profile.is_profile_complete) {
        console.log('Profile is complete, setting up user profile');
        setUserProfile(profile);
        setProfileComplete(true);
        setCurrentScreen('onboarding');
      } else {
        console.log('Profile incomplete or not found, showing profile setup');
        setProfileComplete(false);
        setCurrentScreen('profile-setup');
      }
    } catch (error) {
      console.error('Error checking profile status:', error);
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

  const handleOnboardingComplete = (profile: any) => {
    console.log('Onboarding completed:', profile);
    setUserProfile(profile);
    setCurrentScreen('matches');
  };

  const handleStartChat = () => {
    console.log('Navigating to chat screen');
    setCurrentScreen('chat');
  };

  const handleSignOut = async () => {
    console.log('Signing out user');
    await supabase.auth.signOut();
    setCurrentScreen('onboarding');
    setUserProfile(null);
    setProfileComplete(false);
  };

  console.log('Current state:', { loading, user: !!user, profileComplete, currentScreen });

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>;
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
        return <div className="min-h-screen flex flex-col items-center justify-center p-6">
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
          </div>;
      case 'matches':
        return <MatchesScreen userProfile={userProfile} onStartChat={handleStartChat} />;
      case 'chat':
        return <ChatScreen />;
      case 'profile':
        return <ProfileScreen userProfile={userProfile} onSignOut={handleSignOut} />;
      default:
        return <div className="min-h-screen flex flex-col items-center justify-center p-6">
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
          </div>;
    }
  };

  return <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-pink-50">
      <div className="max-w-md mx-auto min-h-screen bg-white/80 backdrop-blur-sm shadow-xl">
        {renderScreen()}
        {currentScreen !== 'onboarding' && currentScreen !== 'profile-setup' && <Navigation currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />}
      </div>
    </div>;
};

export default Index;
