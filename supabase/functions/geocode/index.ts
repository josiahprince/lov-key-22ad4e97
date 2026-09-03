// Proxies OpenStreetMap Nominatim geocoding server-side.
//
// Two reasons this can't be called directly from the browser (which is what
// src/hooks/useGeolocation.ts used to do, before this function existed):
// 1. Nominatim's usage policy requires a genuine identifying User-Agent or
//    Referer from the calling application, and explicitly disallows
//    unauthenticated "heavy" client-side use from arbitrary browsers - a
//    request pattern that can get silently rate-limited/blocked per-IP with
//    no warning. `User-Agent` is also a forbidden header browsers strip from
//    fetch()/XHR, so the client could never actually set it anyway.
// 2. Centralizing this here means the client only ever needs one origin
//    (this function) rather than depending on a specific third-party host's
//    CORS behavior.
//
// mode: 'reverse' (lat/lon -> place) is used by the GPS auto-detect path.
// mode: 'forward' (free-text query -> best-match place incl. lat/lon) is
// used by the manual "type your city" fallback so manually-entered
// locations can still get an approximate lat/long for distance-based
// matching (generate_daily_matches falls back to country-only matching
// when lat/long is null, so a failed/empty forward geocode is never fatal
// here - it's best-effort).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOMINATIM_HEADERS = {
  // Identifies the app to Nominatim per their usage policy - not a browser
  // request, so this header is not stripped here.
  'User-Agent': 'LovKey Dating App (contact via app support)',
};

interface NormalizedPlace {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country: string;
  fullAddress: string;
}

function normalize(data: any): NormalizedPlace {
  const address = data.address ?? {};
  return {
    latitude: parseFloat(data.lat),
    longitude: parseFloat(data.lon),
    city: address.city || address.town || address.village || address.county || '',
    region: address.state || address.region || '',
    country: address.country || '',
    fullAddress: data.display_name || '',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, lat, lon, query } = await req.json();

    if (mode === 'reverse') {
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters: lat, lon' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
        { headers: NOMINATIM_HEADERS }
      );

      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: 'Reverse geocoding failed' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await res.json();
      return new Response(
        JSON.stringify(normalize(data)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (mode === 'forward') {
      if (typeof query !== 'string' || !query.trim()) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameter: query' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`,
        { headers: NOMINATIM_HEADERS }
      );

      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: 'Forward geocoding failed' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results = await res.json();
      if (!Array.isArray(results) || results.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No match found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(normalize(results[0])),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid mode - expected 'reverse' or 'forward'" }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in geocode:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
