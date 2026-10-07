-- Location can only change through set_my_location(), so a profile's location
-- always came from a checked server function rather than a direct PATCH.
--
-- What this stops: editing city/country/coordinates through the REST API, and
-- teleporting (moving faster than a plane between two updates).
-- What it can't stop: a browser that reports fake GPS coordinates, or a city
-- name that doesn't match the coordinates (checking that needs a paid
-- server-side geocoder). No web or mobile app can fully prevent GPS spoofing.
--
-- Client: src/lib/location.ts (saveProfileLocation) and ProfileSetupScreen.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

-- ---------------------------------------------------------------------------
-- The only write path for location columns
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_my_location(
  p_latitude double precision,
  p_longitude double precision,
  p_city text,
  p_region text,
  p_country text,
  p_location text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old record;
  v_lat double precision;
  v_lon double precision;
  v_km double precision;
  v_hours double precision;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_latitude IS NULL OR p_longitude IS NULL
     OR p_latitude NOT BETWEEN -90 AND 90
     OR p_longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'invalid_coordinates';
  END IF;

  IF coalesce(btrim(p_country), '') = ''
     OR length(p_country) > 100
     OR length(coalesce(p_city, '')) > 100
     OR length(coalesce(p_region, '')) > 100
     OR length(coalesce(p_location, '')) > 300 THEN
    RAISE EXCEPTION 'invalid_place';
  END IF;

  -- About 1.1 km. The Privacy Policy promises approximate coordinates.
  v_lat := round(p_latitude::numeric, 2)::double precision;
  v_lon := round(p_longitude::numeric, 2)::double precision;

  SELECT latitude, longitude, location_updated_at INTO v_old
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  -- Impossible travel: more than 50 km (ignores GPS/IP jitter) at more than
  -- 1000 km/h (faster than a commercial flight) since the last update.
  IF v_old.latitude IS NOT NULL AND v_old.longitude IS NOT NULL AND v_old.location_updated_at IS NOT NULL THEN
    v_km := 6371 * 2 * asin(sqrt(
      power(sin(radians(v_lat - v_old.latitude) / 2), 2)
      + cos(radians(v_old.latitude)) * cos(radians(v_lat))
        * power(sin(radians(v_lon - v_old.longitude) / 2), 2)
    ));
    v_hours := greatest(extract(epoch FROM now() - v_old.location_updated_at) / 3600.0, 0.01);
    IF v_km > 50 AND v_km / v_hours > 1000 THEN
      RAISE EXCEPTION 'implausible_location_change';
    END IF;
  END IF;

  -- Lets guard_profile_location() tell this write apart from a direct one.
  -- Local to this transaction, and set_config isn't reachable through the API.
  PERFORM set_config('lovkey.location_write', 'on', true);

  UPDATE public.profiles
  SET latitude = v_lat,
      longitude = v_lon,
      city = nullif(btrim(p_city), ''),
      region = nullif(btrim(p_region), ''),
      country = btrim(p_country),
      location = nullif(btrim(p_location), ''),
      location_updated_at = now()
  WHERE id = v_uid;

  PERFORM set_config('lovkey.location_write', 'off', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_my_location(double precision, double precision, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_location(double precision, double precision, text, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Reject direct client writes to location columns
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_location()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Server-side code (service role, SQL editor, the sign-up trigger) is trusted.
  IF coalesce(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF current_setting('lovkey.location_write', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.latitude IS NOT NULL OR NEW.longitude IS NOT NULL OR NEW.city IS NOT NULL
       OR NEW.region IS NOT NULL OR NEW.country IS NOT NULL OR NEW.location IS NOT NULL
       OR NEW.location_updated_at IS NOT NULL THEN
      RAISE EXCEPTION 'location_must_use_set_my_location';
    END IF;
  ELSIF NEW.latitude IS DISTINCT FROM OLD.latitude
     OR NEW.longitude IS DISTINCT FROM OLD.longitude
     OR NEW.city IS DISTINCT FROM OLD.city
     OR NEW.region IS DISTINCT FROM OLD.region
     OR NEW.country IS DISTINCT FROM OLD.country
     OR NEW.location IS DISTINCT FROM OLD.location
     OR NEW.location_updated_at IS DISTINCT FROM OLD.location_updated_at THEN
    RAISE EXCEPTION 'location_must_use_set_my_location';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_location_trigger ON public.profiles;
CREATE TRIGGER guard_profile_location_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_location();
