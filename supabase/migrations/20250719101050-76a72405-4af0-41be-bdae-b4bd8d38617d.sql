-- Enable extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop and recreate the function with new return signature
DROP FUNCTION IF EXISTS public.generate_daily_matches();

CREATE OR REPLACE FUNCTION public.generate_daily_matches()
 RETURNS TABLE(matches_created integer, users_processed integer, users_skipped_chat_limit integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
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
BEGIN
  -- First, clean up expired matches and inactive chats
  DELETE FROM matches 
  WHERE expires_at < now() 
    AND chat_request_status = 'none' 
    AND status = 'active';
  
  -- Mark chats as inactive if no interaction for 48 hours
  UPDATE matches 
  SET status = 'inactive'
  WHERE chat_request_status = 'accepted' 
    AND last_interaction_at < (now() - INTERVAL '48 hours')
    AND status = 'active';

  -- Loop through all users who have complete profiles
  FOR user_record IN 
    SELECT uo.user_id, uo.mood, uo.selected_memes, p.city, p.region, p.country
    FROM user_onboarding uo
    JOIN profiles p ON uo.user_id = p.id
    WHERE uo.mood IS NOT NULL 
      AND uo.selected_memes IS NOT NULL 
      AND array_length(uo.selected_memes, 1) > 0
      AND p.is_profile_complete = true
  LOOP
    users_processed_count := users_processed_count + 1;
    
    -- Check how many active chats this user has
    SELECT COUNT(*) INTO user_active_chats
    FROM public.matches 
    WHERE (user_1 = user_record.user_id OR user_2 = user_record.user_id)
      AND status = 'active'
      AND chat_request_status = 'accepted';
    
    -- Skip if user already has 6 or more active chats
    IF user_active_chats >= 6 THEN
      users_skipped_chat_limit_count := users_skipped_chat_limit_count + 1;
      CONTINUE;
    END IF;
    
    -- Check how many matches this user already has today
    SELECT COUNT(*) INTO user_matches_today
    FROM public.matches 
    WHERE (user_1 = user_record.user_id OR user_2 = user_record.user_id)
      AND matched_on >= today_start 
      AND matched_on < today_end
      AND status = 'active'
      AND chat_request_status = 'none';
    
    -- Skip if user already has 3 new matches today
    IF user_matches_today >= 3 THEN
      CONTINUE;
    END IF;
    
    -- Find potential matches for this user
    FOR potential_match IN
      SELECT DISTINCT uo2.user_id, uo2.mood, uo2.selected_memes, pr2.city, pr2.region, pr2.country
      FROM user_onboarding uo2
      JOIN profiles pr2 ON uo2.user_id = pr2.id
      WHERE uo2.user_id != user_record.user_id  -- Not themselves
        AND uo2.mood IS NOT NULL
        AND uo2.selected_memes IS NOT NULL
        AND array_length(uo2.selected_memes, 1) > 0
        AND pr2.is_profile_complete = true
        AND NOT EXISTS (  -- Not already matched
          SELECT 1 FROM public.matches m 
          WHERE (m.user_1 = user_record.user_id AND m.user_2 = uo2.user_id)
             OR (m.user_1 = uo2.user_id AND m.user_2 = user_record.user_id)
        )
      ORDER BY
        -- Prioritize by location match
        CASE 
          WHEN pr2.city = user_record.city THEN 3
          WHEN pr2.region = user_record.region THEN 2
          WHEN pr2.country = user_record.country THEN 1
          ELSE 0
        END DESC,
        -- Then by mood compatibility
        CASE 
          WHEN uo2.mood = user_record.mood THEN 2
          WHEN (user_record.mood = 'happy' AND uo2.mood = 'energetic') 
            OR (user_record.mood = 'energetic' AND uo2.mood = 'happy')
            OR (user_record.mood = 'chill' AND uo2.mood = 'sleepy')
            OR (user_record.mood = 'sleepy' AND uo2.mood = 'chill') THEN 1
          ELSE 0
        END DESC,
        -- Then by shared memes/vibes
        array_length(array(SELECT unnest(user_record.selected_memes) INTERSECT SELECT unnest(uo2.selected_memes)), 1) DESC NULLS LAST,
        RANDOM()
      LIMIT (3 - user_matches_today)
    LOOP
      -- Calculate match score
      match_score_calc := 0;
      
      -- Location score
      IF potential_match.city = user_record.city THEN
        match_score_calc := match_score_calc + 30;
      ELSIF potential_match.region = user_record.region THEN
        match_score_calc := match_score_calc + 20;
      ELSIF potential_match.country = user_record.country THEN
        match_score_calc := match_score_calc + 10;
      END IF;
      
      -- Mood score
      IF potential_match.mood = user_record.mood THEN
        match_score_calc := match_score_calc + 25;
      ELSIF (user_record.mood = 'happy' AND potential_match.mood = 'energetic') 
        OR (user_record.mood = 'energetic' AND potential_match.mood = 'happy')
        OR (user_record.mood = 'chill' AND potential_match.mood = 'sleepy')
        OR (user_record.mood = 'sleepy' AND potential_match.mood = 'chill') THEN
        match_score_calc := match_score_calc + 15;
      END IF;
      
      -- Shared memes score
      match_score_calc := match_score_calc + (
        array_length(array(SELECT unnest(user_record.selected_memes) INTERSECT SELECT unnest(potential_match.selected_memes)), 1) * 5
      );
      
      -- Insert the match with expiry
      INSERT INTO public.matches (user_1, user_2, match_score, matched_on, expires_at)
      VALUES (
        user_record.user_id, 
        potential_match.user_id, 
        match_score_calc, 
        now(), 
        now() + INTERVAL '24 hours'
      );
      
      matches_created_count := matches_created_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT matches_created_count, users_processed_count, users_skipped_chat_limit_count;
END;
$function$;

-- Schedule daily match generation at 9:00 AM every day
SELECT cron.schedule(
  'generate-daily-matches',
  '0 9 * * *', -- 9:00 AM every day
  $$
  SELECT generate_daily_matches();
  $$
);