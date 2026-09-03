
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country: string;
  fullAddress: string;
}

export interface GeolocationState {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    loading: false,
    error: null,
    permissionDenied: false,
  });

  // Reverse/forward geocoding go through the `geocode` edge function rather
  // than calling Nominatim directly from the browser - Nominatim's usage
  // policy requires a genuine identifying User-Agent (a forbidden header
  // browsers strip from fetch()) and disallows unauthenticated client-side
  // "heavy" use, which risks silent per-IP rate limiting/blocking.
  const reverseGeocode = async (lat: number, lng: number): Promise<LocationData> => {
    const { data, error } = await supabase.functions.invoke('geocode', {
      body: { mode: 'reverse', lat, lon: lng },
    });

    if (error || !data || data.error) {
      throw new Error('Failed to get location details');
    }

    return data as LocationData;
  };

  // Best-effort forward geocode for a manually-typed location (e.g. "Bengaluru,
  // Karnataka, India") - used to fill in an approximate latitude/longitude for
  // distance-based matching. Returns null on any failure; callers should treat
  // that as "no coordinates available", not an error - generate_daily_matches
  // already falls back to country-only matching when lat/long is null, so a
  // manual entry is always usable even without this succeeding.
  const forwardGeocode = async (query: string): Promise<LocationData | null> => {
    if (!query.trim()) return null;
    try {
      const { data, error } = await supabase.functions.invoke('geocode', {
        body: { mode: 'forward', query },
      });
      if (error || !data || data.error) return null;
      return data as LocationData;
    } catch {
      return null;
    }
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser',
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const locationData = await reverseGeocode(latitude, longitude);
          
          setState(prev => ({
            ...prev,
            location: locationData,
            loading: false,
            error: null,
          }));
        } catch (error) {
          setState(prev => ({
            ...prev,
            error: 'Failed to get location details',
            loading: false,
          }));
        }
      },
      (error) => {
        let errorMessage = 'Failed to get location';
        let permissionDenied = false;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            permissionDenied = true;
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }

        setState(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
          permissionDenied,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  const resetLocation = () => {
    setState({
      location: null,
      loading: false,
      error: null,
      permissionDenied: false,
    });
  };

  return {
    ...state,
    getCurrentLocation,
    resetLocation,
    forwardGeocode,
  };
};
