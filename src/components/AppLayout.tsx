import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { supabase } from '@/integrations/supabase/client';
import AuthScreen from './AuthScreen';
import ProfileSetupScreen from './ProfileSetupScreen';
import Navigation from './Navigation';
import GradientShell from './GradientShell';
import LoadingState from './LoadingState';
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
    // Deliberately keyed on user?.id, not the user object itself - Supabase's
    // onAuthStateChange hands back a brand-new `user` object reference on
    // every auth event, including a routine background token refresh, not
    // just real sign-in/sign-out. Depending on the object would re-run this
    // check (and flip profileLoading back to true) on every such event,
    // unmounting ProfileSetupScreen and silently wiping all in-progress
    // onboarding form state each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleProfileSetupComplete = (profile: ProfileLike) => {
    setUserProfile(profile);
    setProfileComplete(true);
    navigate('/onboarding', { replace: true });
  };

  if (authLoading || profileLoading) {
    return (
      <GradientShell centered>
        <LoadingState variant="spinner" label="Loading..." />
      </GradientShell>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={() => {}} />;
  }

  if (!profileComplete) {
    return <ProfileSetupScreen onComplete={handleProfileSetupComplete} />;
  }

  return (
    <GradientShell withCard>
      <Outlet context={{ userProfile, shouldShowOnboarding, onboardingLoading }} />
      {location.pathname !== '/onboarding' && <Navigation />}
    </GradientShell>
  );
};

export default AppLayout;
