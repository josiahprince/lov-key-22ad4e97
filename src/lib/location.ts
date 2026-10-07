import { supabase } from '@/integrations/supabase/client';
import type { ProfileLike } from '@/types/domain';

// Location always comes from the device; it can't be typed in, so a profile's
// city and country are where the person actually is. It's set at sign-up and
// refreshed once a day (useDailyLocation), and the app is blocked while
// location access is turned off. See "Location" in CLAUDE.md.

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  // Common English name ("Germany", "United Kingdom"), because country is
  // compared as text across the app: country-only matching, the weekly vibe
  // set per country, and the local-language list in src/lib/languages.ts.
  country: string;
  fullAddress: string;
}

export type LocationFailure = 'denied' | 'unsupported' | 'unavailable' | 'timeout' | 'lookup';

export class LocationError extends Error {
  constructor(public kind: LocationFailure) {
    super(LOCATION_FAILURE_MESSAGES[kind]);
  }
}

export const LOCATION_FAILURE_MESSAGES: Record<LocationFailure, string> = {
  denied: 'Location access is turned off for LovKey.',
  unsupported: "This browser can't share your location.",
  unavailable: "Your device couldn't work out where you are right now.",
  timeout: 'Finding your location took too long.',
  lookup: "We found your position but couldn't look up the city.",
};

const getPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new LocationError('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (error) => {
      const kind: LocationFailure =
        error.code === error.PERMISSION_DENIED ? 'denied'
        : error.code === error.TIMEOUT ? 'timeout'
        : 'unavailable';
      reject(new LocationError(kind));
    }, {
      // City-level accuracy is all matching needs, and it's much faster.
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 10 * 60 * 1000,
    });
  });

// BigDataCloud's free reverse-geocoding endpoint is made to be called from
// the browser with the device's own coordinates (no key, no server). We used to
// go through Nominatim in an edge function, but Nominatim blocks requests from
// Supabase's shared servers, so every lookup failed.
const REVERSE_GEOCODE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

interface ReverseGeocodeResult {
  countryName?: string;
  countryCode?: string;
  principalSubdivision?: string;
  city?: string;
  locality?: string;
}

// The service returns formal names ("United Kingdom of Great Britain and
// Northern Ireland"), so turn the ISO code into the everyday English name.
const countryNameFromCode = (code: string, fallback: string) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || fallback;
  } catch {
    return fallback;
  }
};

// 'Berlin, Berlin, Germany' reads as a typo, so drop repeated parts.
const joinPlace = (parts: (string | null | undefined)[]) =>
  [...new Set(parts.filter(Boolean))].join(', ');

// Development only, opt-in with VITE_DEV_IP_LOCATION=true in .env.local: when
// the browser won't share location (the Claude browser pane always refuses,
// with no way to allow it), use the approximate location of your internet
// connection instead. Vite strips this from production builds.
const DEV_IP_FALLBACK = import.meta.env.DEV && import.meta.env.VITE_DEV_IP_LOCATION === 'true';

interface ReverseGeocodeWithPosition extends ReverseGeocodeResult {
  latitude?: number;
  longitude?: number;
}

// Device position -> city/region/country.
export const getDeviceLocation = async (): Promise<LocationData> => {
  let coords: { latitude: number; longitude: number } | null = null;
  try {
    coords = (await getPosition()).coords;
  } catch (error) {
    if (!DEV_IP_FALLBACK) throw error;
    console.warn('[dev] Device location unavailable, using approximate IP location (VITE_DEV_IP_LOCATION).');
  }

  let place: ReverseGeocodeWithPosition;
  try {
    // Without coordinates the service locates the caller by IP (dev fallback only).
    const url = coords
      ? `${REVERSE_GEOCODE_URL}?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`
      : `${REVERSE_GEOCODE_URL}?localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`reverse geocode ${res.status}`);
    place = await res.json();
  } catch {
    throw new LocationError('lookup');
  }

  const country = place.countryCode
    ? countryNameFromCode(place.countryCode.toUpperCase(), place.countryName ?? '')
    : place.countryName ?? '';
  if (!country) throw new LocationError('lookup');

  const city = place.city || place.locality || '';
  const region = place.principalSubdivision || '';

  const latitude = coords?.latitude ?? place.latitude;
  const longitude = coords?.longitude ?? place.longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') throw new LocationError('lookup');

  return {
    latitude,
    longitude,
    city,
    region,
    country,
    fullAddress: joinPlace([city, region, country]),
  };
};

// About 1.1 km at the equator. Distance matching needs no more, and the
// Privacy Policy promises approximate coordinates.
const roundCoordinate = (value: number) => Math.round(value * 100) / 100;

export const toProfileLocation = (location: LocationData) => ({
  location: location.fullAddress,
  city: location.city,
  region: location.region,
  country: location.country,
  latitude: roundCoordinate(location.latitude),
  longitude: roundCoordinate(location.longitude),
});

export type ProfileLocationFields = ReturnType<typeof toProfileLocation>;

export const LOCATION_SAVE_REJECTED_MESSAGE =
  "That location is too far from your last one to be real. If you've just travelled, try again in a few hours.";

export const isImplausibleLocationError = (error: unknown) =>
  String((error as { message?: string })?.message ?? error).includes('implausible_location_change');

// Location columns can only be written through set_my_location(), which checks
// the values and rejects impossible jumps (20261007120000_location_guard.sql).
// Until that migration is applied the function doesn't exist, so fall back to
// a direct update; once it is, direct writes are rejected by a trigger.
export const writeProfileLocation = async (userId: string, fields: ProfileLocationFields) => {
  const { error } = await supabase.rpc('set_my_location', {
    p_latitude: fields.latitude,
    p_longitude: fields.longitude,
    p_city: fields.city,
    p_region: fields.region,
    p_country: fields.country,
    p_location: fields.location,
  });
  if (!error) return;
  const missingFunction = error.code === 'PGRST202' || error.code === '42883';
  if (!missingFunction) throw error;

  const { error: directError } = await supabase.from('profiles').update(fields).eq('id', userId);
  if (directError) throw directError;
};

// Saves a fresh device location and returns what was written, so callers can
// merge it into the profile they already hold.
export const saveProfileLocation = async (userId: string, location: LocationData): Promise<Partial<ProfileLike>> => {
  const fields = toProfileLocation(location);
  await writeProfileLocation(userId, fields);
  return fields;
};

// Whether the browser has already said no, without triggering a prompt.
// Unknown (no Permissions API, e.g. older Safari) counts as not denied.
export const isLocationPermissionDenied = async () => {
  if (DEV_IP_FALLBACK) return false;
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' });
    return status?.state === 'denied';
  } catch {
    return false;
  }
};

export const formatPlace = (profile: Pick<ProfileLike, 'city' | 'region' | 'country'> | null | undefined) =>
  joinPlace([profile?.city, profile?.region, profile?.country]);
