
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import AuthScreen from '../components/AuthScreen';
import OnboardingScreen from '../components/OnboardingScreen';
import MatchesScreen from '../components/MatchesScreen';
import ChatScreen from '../components/ChatScreen';
import ProfileScreen from '../components/ProfileScreen';
import Navigation from '../components/Navigation';
import { Heart, Sparkles } from 'lucide-react';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('onboarding');
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    // Auth state will be updated by the listener
    setCurrentScreen('onboarding');
  };

  const handleOnboardingComplete = (profile: any) => {
    setUserProfile(profile);
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
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6">
            {/* Hero Section */}
            <div className="text-center mb-12 space-y-6">
              <div className="flex items-center justify-center mb-6">
                <img 
                  src="/lovable-uploads/c28200aa-e002-4654-86ab-fcb6351cb739.png" 
                  alt="LovKey Logo" 
                  className="w-24 h-24"
                />
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
      case 'matches':
        return <MatchesScreen userProfile={userProfile} onStartChat={handleStartChat} />;
      case 'chat':
        return <ChatScreen />;
      case 'profile':
        return <ProfileScreen userProfile={userProfile} onSignOut={handleSignOut} />;
      default:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6">
            <div className="text-center mb-12 space-y-6">
              <div className="flex items-center justify-center mb-6">
                <img 
                  src="/lovable-uploads/c28200aa-e002-4654-86ab-fcb6351cb739.png" 
                  alt="LovKey Logo" 
                  className="w-24 h-24"
                />
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
        {currentScreen !== 'onboarding' && (
          <Navigation currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
        )}
      </div>
    </div>
  );
};

export default Index;
