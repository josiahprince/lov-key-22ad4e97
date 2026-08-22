-- Fix daily-match scoring: stop the mood-match bonus from being silently
-- overwritten by the meme-overlap SELECT INTO, and incorporate previously
-- unused profile signals (interests, languages_spoken, personality_prompts
-- key overlap) into a rebalanced, capped, null-safe scoring formula.
--
-- Weighting (max 100), informed by how OkCupid/eHarmony weight compatibility:
-- mood match (+25) and meme/vibe overlap (+10/item, cap 40) dominate at 65%
-- of the max score, matching LovKey's "personality/vibe first" premise.
-- Interests (+5/item, cap 20) and languages (+5/item, cap 10) are real but
-- secondary signals. Personality-prompt key overlap (+5/item, cap 5) is
-- capped very low: it only shows both users picked the same prompt to
-- answer, not that their answers align -- a weak signal, unlike meme
-- overlap which is a genuine shared-taste comparison.
--
-- Scope: scoring logic only. Daily cap (2/day), 6:30 UTC cron cadence,
-- timezone handling, candidate pool query, distance/country filtering,
-- insert/exception handling, and RLS are all unchanged from the prior
-- definition in 20260316062550_a343558e-c06a-417c-9fff-2097693cdf18.sql.

CREATE OR REPLACE FUNCTION public.generate_daily_matches()
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
  today_start TIMESTAMP WITH TIME ZONE := date_trunc('day', now());
  today_end TIMESTAMP WITH TIME ZONE := today_start + INTERVAL '1 day';
  user_matches_today INTEGER;
  user_active_chats INTEGER;
  match_score_calc INTEGER;
  meme_overlap_count INTEGER;
  interest_overlap_count INTEGER;
  language_overlap_count INTEGER;
  prompt_overlap_count INTEGER;
  distance_km NUMERIC;
  cos_calc NUMERIC;
BEGIN
  -- First, clean up expired matches (including pending requests)
  DELETE FROM public.matches
  WHERE expires_at < now()
    AND chat_request_status IN ('none', 'pending')
    AND status = 'active';

  -- Mark stale accepted chats inactive
  UPDATE public.matches
  SET status = 'inactive'
  WHERE chat_request_status = 'accepted'
    AND last_interaction_at < (now() - INTERVAL '48 hours')
    AND status IN ('active', 'chatting');

  -- Loop through all users who have complete profiles
  FOR user_record IN
    SELECT uo.user_id, uo.mood, uo.selected_memes, p.city, p.region, p.country,
           p.gender, p.sexual_orientation, p.interested_in, p.latitude, p.longitude,
           p.max_distance_preference, p.min_age_preference, p.max_age_preference, p.age,
           p.interests, p.languages_spoken, p.personality_prompts
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
  LOOP
    users_processed_count := users_processed_count + 1;

    -- Skip users with too many active chats
    SELECT COUNT(*) INTO user_active_chats
    FROM public.matches
    WHERE (user_1 = user_record.user_id OR user_2 = user_record.user_id)
      AND status IN ('active', 'chatting')
      AND chat_request_status = 'accepted';

    IF user_active_chats >= 6 THEN
      users_skipped_chat_limit_count := users_skipped_chat_limit_count + 1;
      CONTINUE;
    END IF;

    -- Keep strict daily cap of 2 visible daily matches (none/pending)
    SELECT COUNT(*) INTO user_matches_today
    FROM public.matches
    WHERE (user_1 = user_record.user_id OR user_2 = user_record.user_id)
      AND matched_on >= today_start
      AND matched_on < today_end
      AND status = 'active'
      AND chat_request_status IN ('none', 'pending')
      AND expires_at > now();

    IF user_matches_today >= 2 THEN
      CONTINUE;
    END IF;

    FOR potential_match IN
      SELECT DISTINCT ON (uo2.user_id)
             uo2.user_id, uo2.mood, uo2.selected_memes, pr2.city, pr2.region, pr2.country,
             pr2.gender, pr2.sexual_orientation, pr2.interested_in, pr2.latitude, pr2.longitude,
             pr2.max_distance_preference, pr2.min_age_preference, pr2.max_age_preference, pr2.age,
             pr2.interests, pr2.languages_spoken, pr2.personality_prompts
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
        -- Skip if an active/chatting pair already exists (allows rematch after expiration/inactive)
        AND NOT EXISTS (
          SELECT 1
          FROM public.matches mx
          WHERE (
            (mx.user_1 = user_record.user_id AND mx.user_2 = uo2.user_id)
            OR
            (mx.user_1 = uo2.user_id AND mx.user_2 = user_record.user_id)
          )
          AND mx.status IN ('active', 'chatting')
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

      -- Compatibility score: additive across signals, each capped before
      -- summing, defensive final clamp to 100.
      match_score_calc := 0;

      -- Mood match: flat bonus (max 25) -- core "vibe" identity signal
      IF user_record.mood = potential_match.mood THEN
        match_score_calc := match_score_calc + 25;
      END IF;

      -- Meme/vibe overlap: 10 pts per shared meme, capped at 40 --
      -- dominant signal, matches the app's "personality/vibe first" premise
      SELECT COUNT(*) INTO meme_overlap_count
      FROM unnest(user_record.selected_memes) AS meme1
      WHERE meme1 = ANY(potential_match.selected_memes);

      match_score_calc := match_score_calc + LEAST(meme_overlap_count * 10, 40);

      -- Interests overlap: 5 pts per shared interest, capped at 20
      -- (interests is an optional field; COALESCE to empty array so
      -- users who haven't filled it in contribute 0, never crash/error)
      SELECT COUNT(*) INTO interest_overlap_count
      FROM unnest(COALESCE(user_record.interests, '{}'::text[])) AS interest1
      WHERE interest1 = ANY(COALESCE(potential_match.interests, '{}'::text[]));

      match_score_calc := match_score_calc + LEAST(interest_overlap_count * 5, 20);

      -- Languages spoken overlap: 5 pts per shared language, capped at 10
      SELECT COUNT(*) INTO language_overlap_count
      FROM unnest(COALESCE(user_record.languages_spoken, '{}'::text[])) AS lang1
      WHERE lang1 = ANY(COALESCE(potential_match.languages_spoken, '{}'::text[]));

      match_score_calc := match_score_calc + LEAST(language_overlap_count * 5, 10);

      -- Personality prompt selection overlap (which prompt keys both users
      -- chose to answer -- not semantic comparison of the free-text answers):
      -- weak signal, capped very low. 5 pts per shared prompt key, capped at 5.
      SELECT COUNT(*) INTO prompt_overlap_count
      FROM jsonb_object_keys(COALESCE(user_record.personality_prompts, '{}'::jsonb)) AS key1
      WHERE key1 IN (
        SELECT jsonb_object_keys(COALESCE(potential_match.personality_prompts, '{}'::jsonb))
      );

      match_score_calc := match_score_calc + LEAST(prompt_overlap_count * 5, 5);

      -- Defensive final cap (weights above already sum to a max of 100)
      match_score_calc := LEAST(match_score_calc, 100);

      -- Genuine minimum-quality bar: previously always true (old floor was
      -- always >= 30 due to the bug), now requires real combined signal.
      IF match_score_calc >= 30 THEN
        -- Respect potential match's daily limit too
        SELECT COUNT(*) INTO user_matches_today
        FROM public.matches
        WHERE (user_1 = potential_match.user_id OR user_2 = potential_match.user_id)
          AND matched_on >= today_start
          AND matched_on < today_end
          AND status = 'active'
          AND chat_request_status IN ('none', 'pending')
          AND expires_at > now();

        IF user_matches_today >= 2 THEN
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

          SELECT COUNT(*) INTO user_matches_today
          FROM public.matches
          WHERE (user_1 = user_record.user_id OR user_2 = user_record.user_id)
            AND matched_on >= today_start
            AND matched_on < today_end
            AND status = 'active'
            AND chat_request_status IN ('none', 'pending')
            AND expires_at > now();

          IF user_matches_today >= 2 THEN
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
