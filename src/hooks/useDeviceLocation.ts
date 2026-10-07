import { useCallback, useState } from 'react';
import { getDeviceLocation, LocationError, type LocationData, type LocationFailure } from '@/lib/location';
import { logError } from '@/lib/errorLogger';

// One "find my location" action with its progress, for the sign-up Location
// step and Settings → Update location.
export const useDeviceLocation = () => {
  const [locating, setLocating] = useState(false);
  const [failure, setFailure] = useState<LocationFailure | null>(null);

  const locate = useCallback(async (): Promise<LocationData | null> => {
    setLocating(true);
    setFailure(null);
    try {
      return await getDeviceLocation();
    } catch (error) {
      const kind = error instanceof LocationError ? error.kind : 'lookup';
      if (kind !== 'denied') logError(`useDeviceLocation:${kind}`, error);
      setFailure(kind);
      return null;
    } finally {
      setLocating(false);
    }
  }, []);

  return { locate, locating, failure };
};
