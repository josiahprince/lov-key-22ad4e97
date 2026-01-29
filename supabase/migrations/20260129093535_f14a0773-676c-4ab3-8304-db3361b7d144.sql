-- Security fix: tighten match-based read access and remove secrets from scheduled jobs

-- 1) Tighten RLS policies so 'chatting' access requires accepted chat
DROP POLICY IF EXISTS "Users can view profiles of their matches" ON public.profiles;
CREATE POLICY "Users can view profiles of their matches"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT m.user_1
    FROM public.matches m
    WHERE m.user_2 = auth.uid()
      AND (
        m.status = 'active'
        OR (m.status = 'chatting' AND m.chat_request_status = 'accepted')
      )
    UNION
    SELECT m.user_2
    FROM public.matches m
    WHERE m.user_1 = auth.uid()
      AND (
        m.status = 'active'
        OR (m.status = 'chatting' AND m.chat_request_status = 'accepted')
      )
  )
);

DROP POLICY IF EXISTS "Users can view onboarding of their matches" ON public.user_onboarding;
CREATE POLICY "Users can view onboarding of their matches"
ON public.user_onboarding
FOR SELECT
USING (
  user_id IN (
    SELECT m.user_1
    FROM public.matches m
    WHERE m.user_2 = auth.uid()
      AND (
        m.status = 'active'
        OR (m.status = 'chatting' AND m.chat_request_status = 'accepted')
      )
    UNION
    SELECT m.user_2
    FROM public.matches m
    WHERE m.user_1 = auth.uid()
      AND (
        m.status = 'active'
        OR (m.status = 'chatting' AND m.chat_request_status = 'accepted')
      )
  )
);

DROP POLICY IF EXISTS "Users can view photos of their matches" ON public.user_photos;
CREATE POLICY "Users can view photos of their matches"
ON public.user_photos
FOR SELECT
USING (
  user_id IN (
    SELECT m.user_1
    FROM public.matches m
    WHERE m.user_2 = auth.uid()
      AND (
        m.status = 'active'
        OR (m.status = 'chatting' AND m.chat_request_status = 'accepted')
      )
    UNION
    SELECT m.user_2
    FROM public.matches m
    WHERE m.user_1 = auth.uid()
      AND (
        m.status = 'active'
        OR (m.status = 'chatting' AND m.chat_request_status = 'accepted')
      )
  )
);

-- 2) Replace pg_cron HTTP jobs (with embedded bearer keys) with DB-native jobs

-- 2a) Helper function: cleanup expired matches + mark inactive chats
CREATE OR REPLACE FUNCTION public.cleanup_expired_matches_and_inactive_chats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Expired matches (no action within 24h)
  DELETE FROM public.matches
  WHERE expires_at < now()
    AND chat_request_status = 'none'
    AND status = 'active';

  -- Mark chats as inactive after 48h inactivity
  UPDATE public.matches
  SET status = 'inactive'
  WHERE chat_request_status = 'accepted'
    AND last_interaction_at < (now() - INTERVAL '48 hours')
    AND status IN ('active', 'chatting');
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_matches_and_inactive_chats() FROM PUBLIC;

-- 2b) Helper function: timezone-aware daily onboarding reset (runs hourly safely)
CREATE OR REPLACE FUNCTION public.reset_daily_onboarding_flags()
RETURNS TABLE(users_reset integer, users_checked integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
  tz TEXT;
  today_in_tz DATE;
  latest_onboarding RECORD;
  last_reset_local_date DATE;
BEGIN
  users_reset := 0;
  users_checked := 0;

  FOR p IN
    SELECT id AS user_id, COALESCE(timezone, 'UTC') AS timezone
    FROM public.profiles
    WHERE timezone IS NOT NULL
  LOOP
    users_checked := users_checked + 1;
    tz := p.timezone;

    -- Only consider resets after local 6 AM
    IF NOT public.is_after_6am_in_timezone(tz) THEN
      CONTINUE;
    END IF;

    today_in_tz := public.get_date_in_timezone(tz);

    -- Latest onboarding row for this user
    SELECT id, last_onboarding_date, onboarding_shown_today, last_6am_reset
    INTO latest_onboarding
    FROM public.user_onboarding
    WHERE user_id = p.user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF latest_onboarding.id IS NULL THEN
      CONTINUE;
    END IF;

    -- Prevent multiple resets within the same local day
    IF latest_onboarding.last_6am_reset IS NOT NULL THEN
      last_reset_local_date := (latest_onboarding.last_6am_reset AT TIME ZONE tz)::date;
      IF last_reset_local_date >= today_in_tz THEN
        CONTINUE;
      END IF;
    END IF;

    -- Reset flag only when day has advanced (or hasn't been set yet)
    IF latest_onboarding.last_onboarding_date IS NULL
       OR latest_onboarding.last_onboarding_date < today_in_tz THEN
      UPDATE public.user_onboarding
      SET onboarding_shown_today = false,
          last_6am_reset = now()
      WHERE id = latest_onboarding.id;

      users_reset := users_reset + 1;
    END IF;
  END LOOP;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_daily_onboarding_flags() FROM PUBLIC;

-- 2c) Unschedule any cron jobs that embed Authorization bearer keys and call Edge Functions
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT jobid
    FROM cron.job
    WHERE command ILIKE '%functions/v1/%'
      AND command ILIKE '%Authorization%'
  LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;

-- 2d) Recreate safe schedules (no embedded secrets)
-- Hourly cleanup
SELECT cron.schedule(
  'cleanup-expired-matches-db',
  '0 * * * *',
  $$SELECT public.cleanup_expired_matches_and_inactive_chats();$$
);

-- Hourly onboarding reset check (timezone-aware)
SELECT cron.schedule(
  'reset-daily-onboarding-db',
  '5 * * * *',
  $$SELECT public.reset_daily_onboarding_flags();$$
);

-- Daily match generation (same cadence as before, but DB-native)
SELECT cron.schedule(
  'generate-daily-matches-db',
  '30 6 * * *',
  $$SELECT public.generate_daily_matches();$$
);
