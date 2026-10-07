import { useCallback, useEffect, useRef, useState } from 'react';
import { getDeviceLocation, isLocationPermissionDenied, LocationError, saveProfileLocation } from '@/lib/location';
import { getOnboardingDay } from '@/lib/onboardingWeek';
import { logError } from '@/lib/errorLogger';
import type { ProfileLike } from '@/types/domain';

const dayKey = (userId: string) => `lovkey-location-day:${userId}`;

const readDay = (userId: string) => {
  try {
    return localStorage.getItem(dayKey(userId));
  } catch {
    return null;
  }
};

const writeDay = (userId: string, day: string) => {
  try {
    localStorage.setItem(dayKey(userId), day);
  } catch {
    // Without storage we just check again on the next open.
  }
};

// Refreshes the profile's location from the device once per day, on the first
// open after 06:00 local time (the same boundary as the daily onboarding), and
// again whenever the app comes back to the foreground on a new day.
//
// `blocked` is true while location access is turned off: AppLayout shows a
// screen asking to turn it back on. Other failures (no signal, timeout, lookup
// down) never block; the last saved location stays and we retry next open.
export const useDailyLocation = (
  userId: string | undefined,
  enabled: boolean,
  onSaved: (patch: Partial<ProfileLike>) => void
) => {
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const runningRef = useRef(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  // `force` skips the once-a-day check, for the blocked screen's "Try again".
  const refresh = useCallback(async (force = false) => {
    if (!userId || !enabled || runningRef.current) return;
    const today = getOnboardingDay();
    if (!force && readDay(userId) === today) return;

    runningRef.current = true;
    setChecking(true);
    try {
      // Block straight away if the browser has already refused, rather than
      // letting the app open and then snapping shut.
      if (await isLocationPermissionDenied()) throw new LocationError('denied');

      const location = await getDeviceLocation();
      const patch = await saveProfileLocation(userId, location);
      onSavedRef.current(patch);
      writeDay(userId, today);
      setBlocked(false);
    } catch (error) {
      if (error instanceof LocationError && error.kind === 'denied') {
        setBlocked(true);
      } else {
        logError('useDailyLocation:refresh', error);
      }
    } finally {
      runningRef.current = false;
      setChecking(false);
    }
  }, [userId, enabled]);

  useEffect(() => {
    // A different (or no) account starts unblocked until its own check runs.
    setBlocked(false);
    if (!userId || !enabled) return;
    refresh();

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    // If the person turns location back on in browser settings, pick it up
    // without making them press anything.
    let permission: PermissionStatus | undefined;
    const onPermissionChange = () => {
      if (permission?.state !== 'denied') refresh(true);
    };
    navigator.permissions?.query({ name: 'geolocation' }).then((status) => {
      permission = status;
      status.addEventListener('change', onPermissionChange);
    }).catch(() => {});

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      permission?.removeEventListener('change', onPermissionChange);
    };
  }, [userId, enabled, refresh]);

  return { blocked, checking, retry: () => refresh(true) };
};
