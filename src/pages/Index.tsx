
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import AuthScreen from '../components/AuthScreen';
import OnboardingScreen from '../components/OnboardingScreen';
import ProfileOnboardingScreen from '../components/ProfileOnboardingScreen';
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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check if user has completed their profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            setUserProfile(profile);
            setProfileComplete(profile.is_profile_complete || false);
            
            if (profile.is_profile_complete) {
              setCurrentScreen('matches');
            } else {
              setCurrentScreen('profile-onboarding');
            }
          } else {
            setCurrentScreen('profile-onboarding');
          }
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check if user has completed their profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setUserProfile(profile);
          setProfileComplete(profile.is_profile_complete || false);
          
          if (profile.is_profile_complete) {
            setCurrentScreen('matches');
          } else {
            setCurrentScreen('profile-onboarding');
          }
        } else {
          setCurrentScreen('profile-onboarding');
        }
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    // Auth state will be updated by the listener
    // The listener will determine the correct screen based on profile completion
  };

  const handleOnboardingComplete = (profile: any) => {
    setUserProfile(profile);
    setCurrentScreen('profile-onboarding');
  };

  const handleProfileOnboardingComplete = () => {
    setProfileComplete(true);
    setCurrentScreen('matches');
  };

  const handleStartChat = () => {
    console.log('Navigating to chat screen');
    setCurrentScreen('chat');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentScreen('onboarding');
    setUserProfile(null);
    setProfileComplete(false);
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

  const renderScreen = () => {
    switch (currentScreen) {
      case 'onboarding':
        return <OnboardingScreen onComplete={handleOnboardingComplete} />;
      case 'profile-onboarding':
        return <ProfileOnboardingScreen onComplete={handleProfileOnboardingComplete} />;
      case 'matches':
        return <MatchesScreen userProfile={userProfile} onStartChat={handleStartChat} />;
      case 'chat':
        return <ChatScreen />;
      case 'profile':
        return <ProfileScreen userProfile={userProfile} onSignOut={handleSignOut} />;
      default:
        return <OnboardingScreen onComplete={handleOnboardingComplete} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-pink-50">
      <div className="max-w-md mx-auto min-h-screen bg-white/80 backdrop-blur-sm shadow-xl">
        {renderScreen()}
        {currentScreen !== 'onboarding' && currentScreen !== 'profile-onboarding' && (
          <Navigation currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
        )}
      </div>
    </div>
  );
};

export default Index;
