import { useState, useEffect, useCallback } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { supabase } from '@/integrations/supabase/client';
import AuthScreen from './AuthScreen';
import ProfileSetupScreen from './ProfileSetupScreen';
import Navigation from './Navigation';
import GradientShell from './GradientShell';
import LoadingState from './LoadingState';
import LocationRequiredScreen from './LocationRequiredScreen';
import { useDailyLocation } from '@/hooks/useDailyLocation';
import type { ProfileLike } from '@/types/domain';

export interface AppLayoutContext {
  userProfile: ProfileLike | null;
  // Merge a saved change into userProfile, so other screens don't show stale values.
  updateUserProfile: (patch: Partial<ProfileLike>) => void;
  shouldShowOnboarding: boolean;
  onboardingLoading: boolean;
  // The single useOnboardingData instance for the signed-in user. The daily
  // onboarding gate below reads shouldShowOnboarding from it, so the
  // onboarding screen must save through this same instance or the gate
  // would never see the answer and would bounce the user straight back.
  onboarding: ReturnType<typeof useOnboardingData>;
}

const AppLayout = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState<ProfileLike | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const onboarding = useOnboardingData();
  const { shouldShowOnboarding, loading: onboardingLoading, refetch: refetchOnboarding } = onboarding;

  // The daily prompt is due on the first open after 06:00 local time. An app
  // left open overnight never remounts, so re-check whenever it comes back
  // to the foreground.
  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') refetchOnboarding();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user, refetchOnboarding]);

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

  const updateUserProfile = useCallback((patch: Partial<ProfileLike>) => {
    setUserProfile(prev => (prev ? { ...prev, ...patch } : prev));
  }, []);

  // Location is required and refreshed once a day; see useDailyLocation.
  const dailyLocation = useDailyLocation(user?.id, profileComplete, updateUserProfile);

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

  if (dailyLocation.blocked) {
    return <LocationRequiredScreen checking={dailyLocation.checking} onRetry={dailyLocation.retry} />;
  }

  // Existing users answer the onboarding flow once a day, and their answer
  // decides that day's matches, so no screen is reachable until it's done.
  if (!onboardingLoading && shouldShowOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // An open chat (/chats/:matchId) renders its own message input anchored to
  // the bottom of the screen - the fixed bottom nav would sit on top of it
  // and hide it, so skip the nav there too.
  const isOpenChat = /^\/chats\/[^/]+$/.test(location.pathname);
  const hideNavigation = location.pathname === '/onboarding' || isOpenChat;

  return (
    <GradientShell withCard>
      <Outlet context={{ userProfile, updateUserProfile, shouldShowOnboarding, onboardingLoading, onboarding }} />
      {!hideNavigation && <Navigation />}
    </GradientShell>
  );
};

export default AppLayout;
