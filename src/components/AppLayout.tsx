import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { supabase } from '@/integrations/supabase/client';
import AuthScreen from './AuthScreen';
import ProfileSetupScreen from './ProfileSetupScreen';
import Navigation from './Navigation';
import type { ProfileLike } from '@/types/domain';

export interface AppLayoutContext {
  userProfile: ProfileLike | null;
  shouldShowOnboarding: boolean;
  onboardingLoading: boolean;
}

const AppLayout = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState<ProfileLike | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const { shouldShowOnboarding, loading: onboardingLoading } = useOnboardingData();

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setProfileComplete(false);
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);

    const checkProfileStatus = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (!error && profile?.is_profile_complete) {
          setUserProfile(profile);
          setProfileComplete(true);
        } else {
          setUserProfile(null);
          setProfileComplete(false);
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    checkProfileStatus();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleProfileSetupComplete = (profile: ProfileLike) => {
    setUserProfile(profile);
    setProfileComplete(true);
    navigate('/onboarding', { replace: true });
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={() => {}} />;
  }

  if (!profileComplete) {
    return <ProfileSetupScreen onComplete={handleProfileSetupComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-pink-50">
      <div className="max-w-md mx-auto min-h-screen bg-white/80 backdrop-blur-sm shadow-xl">
        <Outlet context={{ userProfile, shouldShowOnboarding, onboardingLoading }} />
        {location.pathname !== '/onboarding' && <Navigation />}
      </div>
    </div>
  );
};

export default AppLayout;
