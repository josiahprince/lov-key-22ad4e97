-- "Remove" on the Chats screen, and a cooldown after "Skip" on Matches.
--
-- Remove matches the big apps' unmatch: the chat disappears for both people,
-- the other person isn't notified, and the two are never matched again. No
-- new messages can be sent (the messages INSERT policy requires an open
-- chat). Existing messages stay in the database and the messages SELECT
-- policy still lets the sender and receiver read them, but no screen shows a
-- closed chat.
--
-- matches has an open UPDATE policy, so the status write itself goes through
-- a SECURITY DEFINER function that checks the caller is in the match.
--
-- Skip used to have no cooldown: a skipped pair could be suggested again on
-- the next run. It now gets the same 7 days as an expired match.

ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE public.matches
  ADD CONSTRAINT matches_status_check
  CHECK (status IN ('active', 'chatting', 'inactive', 'skipped', 'rejected', 'expired', 'blocked', 'unmatched'));

-- Idempotent: removing a chat that's already closed (say both people pressed
-- Remove at once, or it just hit the 48h limit) succeeds quietly. Only a
-- match the caller isn't part of is an error.
CREATE OR REPLACE FUNCTION public.remove_match(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.matches
  SET status = 'unmatched', updated_at = now()
  WHERE id = p_match_id
    AND auth.uid() IN (user_1, user_2)
    AND status IN ('active', 'chatting');

  IF NOT FOUND AND NOT EXISTS (
    SELECT 1 FROM public.matches
    WHERE id = p_match_id AND auth.uid() IN (user_1, user_2)
  ) THEN
    RAISE EXCEPTION 'match_not_found';
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.remove_match(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_match(uuid) TO authenticated;

-- The rematch cooldowns are measured from updated_at, but matches has no
-- updated_at trigger and the client's Skip writes status alone. Stamp it on
-- every status change, whoever makes it.
CREATE OR REPLACE FUNCTION public.stamp_match_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS stamp_match_status_change_trigger ON public.matches;
CREATE TRIGGER stamp_match_status_change_trigger
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_match_status_change();

-- ---------------------------------------------------------------------------
-- Match generation: never re-suggest a removed pair, wait 7 days after a skip
-- ---------------------------------------------------------------------------
-- Identical to 20261005130000_per_user_match_generation.sql except for the
-- "already matched" check: 'unmatched' joins the permanent exclusions, and
-- 'skipped' joins the 7-day cooldown with 'expired' and 'inactive'.
-- The wrappers (generate_daily_matches, generate_my_daily_matches) and their
-- grants are unchanged.
CREATE OR REPLACE FUNCTION public.generate_matches_internal(p_only_user uuid)
RETURNS TABLE(matches_created integer, users_processed integer, users_skipped_chat_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  potential_match RECORD;
  matches_created_count INTEGER := 0;
  users_processed_count INTEGER := 0;
  users_skipped_chat_limit_count INTEGER := 0;
  user_day_start TIMESTAMP WITH TIME ZONE;
  candidate_day_start TIMESTAMP WITH TIME ZONE;
  user_live_matches INTEGER;
  user_matches_today INTEGER;
  match_score_calc INTEGER;
  meme_overlap_count INTEGER;
  interest_overlap_count INTEGER;
  language_overlap_count INTEGER;
  prompt_overlap_count INTEGER;
  distance_km NUMERIC;
  cos_calc NUMERIC;
BEGIN
  -- The full hourly pass tidies up first. A single-user run skips it: the
  -- live-match counts below already ignore anything past expires_at, and the
  -- hourly cleanup sends the expiry notifications.
  IF p_only_user IS NULL THEN
    PERFORM public.cleanup_expired_matches_and_inactive_chats();
  END IF;

  FOR user_record IN
    SELECT uo.user_id, uo.mood, uo.selected_memes, p.city, p.region, p.country,
           p.gender, p.sexual_orientation, p.interested_in, p.latitude, p.longitude,
           p.max_distance_preference, p.min_age_preference, p.max_age_preference, p.age,
           p.interests, p.languages_spoken, p.personality_prompts, p.timezone
    FROM public.user_onboarding uo
    JOIN public.profiles p ON uo.user_id = p.id
    WHERE uo.mood IS NOT NULL
      AND uo.mood != 'pending_daily_update'
      AND uo.selected_memes IS NOT NULL
      AND NOT (array_length(uo.selected_memes, 1) = 1 AND uo.selected_memes[1] = 'pending')
      AND uo.perfect_sunday IS NOT NULL
      AND uo.perfect_sunday != 'pending_daily_update'
      AND array_length(uo.selected_memes, 1) > 0
      AND p.is_profile_complete = true
      AND p.gender IS NOT NULL
      AND p.sexual_orientation IS NOT NULL
      AND p.interested_in IS NOT NULL
      AND uo.last_onboarding_date IS NOT NULL
      AND uo.last_onboarding_date >= public.current_onboarding_day(p.timezone)
      AND (p_only_user IS NULL OR uo.user_id = p_only_user)
  LOOP
    users_processed_count := users_processed_count + 1;

    IF public.active_chat_count(user_record.user_id) >= public.max_active_chats() THEN
      users_skipped_chat_limit_count := users_skipped_chat_limit_count + 1;
      CONTINUE;
    END IF;

    user_day_start := public.current_match_day_start(user_record.timezone);

    SELECT
      COUNT(*) FILTER (
        WHERE status = 'active'
          AND COALESCE(chat_request_status, 'none') IN ('none', 'pending')
          AND expires_at > now()
      ),
      COUNT(*) FILTER (
        WHERE matched_on >= user_day_start
          AND status <> 'expired'
      )
    INTO user_live_matches, user_matches_today
    FROM public.matches
    WHERE user_1 = user_record.user_id OR user_2 = user_record.user_id;

    IF user_live_matches >= 2 OR user_matches_today >= 2 THEN
      CONTINUE;
    END IF;

    FOR potential_match IN
      SELECT DISTINCT ON (uo2.user_id)
             uo2.user_id, uo2.mood, uo2.selected_memes, pr2.city, pr2.region, pr2.country,
             pr2.gender, pr2.sexual_orientation, pr2.interested_in, pr2.latitude, pr2.longitude,
             pr2.max_distance_preference, pr2.min_age_preference, pr2.max_age_preference, pr2.age,
             pr2.interests, pr2.languages_spoken, pr2.personality_prompts, pr2.timezone
      FROM public.user_onboarding uo2
      JOIN public.profiles pr2 ON uo2.user_id = pr2.id
      WHERE uo2.user_id != user_record.user_id
        AND uo2.mood IS NOT NULL
        AND uo2.mood != 'pending_daily_update'
        AND uo2.selected_memes IS NOT NULL
        AND NOT (array_length(uo2.selected_memes, 1) = 1 AND uo2.selected_memes[1] = 'pending')
        AND uo2.perfect_sunday IS NOT NULL
        AND uo2.perfect_sunday != 'pending_daily_update'
        AND array_length(uo2.selected_memes, 1) > 0
        AND pr2.is_profile_complete = true
        AND pr2.gender IS NOT NULL
        AND pr2.sexual_orientation IS NOT NULL
        AND pr2.interested_in IS NOT NULL
        -- Skip pairs that are already matched, or whose match expired / chat
        -- closed or was skipped recently - a "replacement" must be someone
        -- new. A pair where either person removed the other is never matched
        -- again.
        AND NOT EXISTS (
          SELECT 1
          FROM public.matches mx
          WHERE (
            (mx.user_1 = user_record.user_id AND mx.user_2 = uo2.user_id)
            OR
            (mx.user_1 = uo2.user_id AND mx.user_2 = user_record.user_id)
          )
          AND (
            mx.status IN ('active', 'chatting', 'unmatched')
            OR (mx.status IN ('expired', 'inactive', 'skipped') AND mx.updated_at > now() - INTERVAL '7 days')
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.blocked_users bu
          WHERE (bu.blocker_id = user_record.user_id AND bu.blocked_id = uo2.user_id)
             OR (bu.blocker_id = uo2.user_id AND bu.blocked_id = user_record.user_id)
        )
        -- Gender/interest compatibility
        AND (
          (user_record.interested_in = 'men' AND pr2.gender = 'male') OR
          (user_record.interested_in = 'women' AND pr2.gender = 'female') OR
          (user_record.interested_in = 'non_binary' AND pr2.gender = 'non_binary') OR
          (user_record.interested_in = 'everyone')
        )
        AND (
          (pr2.interested_in = 'men' AND user_record.gender = 'male') OR
          (pr2.interested_in = 'women' AND user_record.gender = 'female') OR
          (pr2.interested_in = 'non_binary' AND user_record.gender = 'non_binary') OR
          (pr2.interested_in = 'everyone')
        )
        -- Age preferences
        AND pr2.age >= user_record.min_age_preference
        AND pr2.age <= user_record.max_age_preference
        AND user_record.age >= pr2.min_age_preference
        AND user_record.age <= pr2.max_age_preference
      ORDER BY uo2.user_id, RANDOM()
      LIMIT 30
    LOOP
      -- Distance check
      IF user_record.latitude IS NOT NULL
         AND user_record.longitude IS NOT NULL
         AND potential_match.latitude IS NOT NULL
         AND potential_match.longitude IS NOT NULL THEN
        BEGIN
          cos_calc := cos(radians(user_record.latitude)) *
                     cos(radians(potential_match.latitude)) *
                     cos(radians(potential_match.longitude) - radians(user_record.longitude)) +
                     sin(radians(user_record.latitude)) *
                     sin(radians(potential_match.latitude));

          cos_calc := GREATEST(-1, LEAST(1, cos_calc));
          distance_km := 6371 * acos(cos_calc);

          IF distance_km > user_record.max_distance_preference
             OR distance_km > potential_match.max_distance_preference THEN
            CONTINUE;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          IF user_record.country != potential_match.country THEN
            CONTINUE;
          END IF;
        END;
      ELSE
        IF user_record.country != potential_match.country THEN
          CONTINUE;
        END IF;
      END IF;

      match_score_calc := 0;

      IF user_record.mood = potential_match.mood THEN
        match_score_calc := match_score_calc + 25;
      END IF;

      SELECT COUNT(*) INTO meme_overlap_count
      FROM unnest(user_record.selected_memes) AS meme1
      WHERE meme1 = ANY(potential_match.selected_memes);

      match_score_calc := match_score_calc + LEAST(meme_overlap_count * 10, 40);

      SELECT COUNT(*) INTO interest_overlap_count
      FROM unnest(COALESCE(user_record.interests, '{}'::text[])) AS interest1
      WHERE interest1 = ANY(COALESCE(potential_match.interests, '{}'::text[]));

      match_score_calc := match_score_calc + LEAST(interest_overlap_count * 5, 20);

      SELECT COUNT(*) INTO language_overlap_count
      FROM unnest(COALESCE(user_record.languages_spoken, '{}'::text[])) AS lang1
      WHERE lang1 = ANY(COALESCE(potential_match.languages_spoken, '{}'::text[]));

      match_score_calc := match_score_calc + LEAST(language_overlap_count * 5, 10);

      SELECT COUNT(*) INTO prompt_overlap_count
      FROM jsonb_object_keys(COALESCE(user_record.personality_prompts, '{}'::jsonb)) AS key1
      WHERE key1 IN (
        SELECT jsonb_object_keys(COALESCE(potential_match.personality_prompts, '{}'::jsonb))
      );

      match_score_calc := match_score_calc + LEAST(prompt_overlap_count * 5, 5);

      match_score_calc := LEAST(match_score_calc, 100);

      IF match_score_calc >= 30 THEN
        -- The candidate must be under both limits too, counted on their own day.
        IF public.active_chat_count(potential_match.user_id) >= public.max_active_chats() THEN
          CONTINUE;
        END IF;

        candidate_day_start := public.current_match_day_start(potential_match.timezone);

        SELECT
          COUNT(*) FILTER (
            WHERE status = 'active'
              AND COALESCE(chat_request_status, 'none') IN ('none', 'pending')
              AND expires_at > now()
          ),
          COUNT(*) FILTER (
            WHERE matched_on >= candidate_day_start
              AND status <> 'expired'
          )
        INTO user_live_matches, user_matches_today
        FROM public.matches
        WHERE user_1 = potential_match.user_id OR user_2 = potential_match.user_id;

        IF user_live_matches >= 2 OR user_matches_today >= 2 THEN
          CONTINUE;
        END IF;

        BEGIN
          INSERT INTO public.matches (
            user_1, user_2, matched_on, expires_at, match_score, status, chat_request_status
          ) VALUES (
            LEAST(user_record.user_id, potential_match.user_id),
            GREATEST(user_record.user_id, potential_match.user_id),
            now(),
            now() + INTERVAL '24 hours',
            match_score_calc,
            'active',
            'none'
          );

          matches_created_count := matches_created_count + 1;

          SELECT
            COUNT(*) FILTER (
              WHERE status = 'active'
                AND COALESCE(chat_request_status, 'none') IN ('none', 'pending')
                AND expires_at > now()
            ),
            COUNT(*) FILTER (
              WHERE matched_on >= user_day_start
                AND status <> 'expired'
            )
          INTO user_live_matches, user_matches_today
          FROM public.matches
          WHERE user_1 = user_record.user_id OR user_2 = user_record.user_id;

          IF user_live_matches >= 2 OR user_matches_today >= 2 THEN
            EXIT;
          END IF;
        EXCEPTION WHEN unique_violation THEN
          CONTINUE;
        END;
      END IF;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT matches_created_count, users_processed_count, users_skipped_chat_limit_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.generate_matches_internal(uuid) FROM PUBLIC, anon, authenticated;
