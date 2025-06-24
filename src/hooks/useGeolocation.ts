
import { useState, useEffect } from 'react';

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

  const reverseGeocode = async (lat: number, lng: number): Promise<LocationData> => {
    try {
      // Using OpenStreetMap Nominatim API for reverse geocoding (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'LovKey Dating App',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch location data');
      }

      const data = await response.json();
      
      const city = data.address?.city || data.address?.town || data.address?.village || '';
      const region = data.address?.state || data.address?.region || '';
      const country = data.address?.country || '';
      const fullAddress = data.display_name || `${city}, ${region}, ${country}`;

      return {
        latitude: lat,
        longitude: lng,
        city,
        region,
        country,
        fullAddress,
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw new Error('Failed to get location details');
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
  };
};
