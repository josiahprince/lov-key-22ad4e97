-- Fix duplicate matches issue - ensure users get 2 DIFFERENT matches per day
-- Using a different approach to avoid immutability issues

-- 1. Drop the existing partial index
DROP INDEX IF EXISTS matches_unique_pair_idx;

-- 2. Remove ALL duplicate matches for today (keep only the most recent for each pair)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY LEAST(user_1, user_2), GREATEST(user_1, user_2)
      ORDER BY created_at DESC
    ) as rn
  FROM matches
  WHERE matched_on >= date_trunc('day', now())
    AND status IN ('active', 'chatting')
)
DELETE FROM matches
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 3. Create a simpler unique constraint for active/chatting matches
-- The per-day logic will be handled by the function
CREATE UNIQUE INDEX matches_unique_active_pair_idx 
ON matches (LEAST(user_1, user_2), GREATEST(user_1, user_2))
WHERE status IN ('active', 'chatting');

-- 4. Update generate_daily_matches with improved duplicate prevention
CREATE OR REPLACE FUNCTION public.generate_daily_matches()
 RETURNS TABLE(matches_created integer, users_processed integer, users_skipped_chat_limit integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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
  distance_km NUMERIC;
  cos_calc NUMERIC;
  match_exists_today BOOLEAN;
BEGIN
  -- First, clean up expired matches (24-hour expiration for matches with no action)
  DELETE FROM matches 
  WHERE expires_at < now() 
    AND chat_request_status = 'none' 
    AND status = 'active';
  
  -- Mark chats as inactive if no interaction for 48 hours
  UPDATE matches 
  SET status = 'inactive'
  WHERE chat_request_status = 'accepted' 
    AND last_interaction_at < (now() - INTERVAL '48 hours')
    AND status IN ('active', 'chatting');

  -- Loop through all users who have complete profiles
  FOR user_record IN 
    SELECT uo.user_id, uo.mood, uo.selected_memes, p.city, p.region, p.country, 
           p.gender, p.sexual_orientation, p.interested_in, p.latitude, p.longitude,
           p.max_distance_preference, p.min_age_preference, p.max_age_preference, p.age
    FROM user_onboarding uo
    JOIN profiles p ON uo.user_id = p.id
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
    
    -- Check how many active chats this user has
    SELECT COUNT(*) INTO user_active_chats
    FROM matches 
    WHERE (user_1 = user_record.user_id OR user_2 = user_record.user_id)
      AND status IN ('active', 'chatting')
      AND chat_request_status = 'accepted';
    
    -- Skip if user already has 6 or more active chats
    IF user_active_chats >= 6 THEN
      users_skipped_chat_limit_count := users_skipped_chat_limit_count + 1;
      CONTINUE;
    END IF;
    
    -- Check how many active, non-expired matches this user has today
    SELECT COUNT(*) INTO user_matches_today
    FROM matches 
    WHERE (user_1 = user_record.user_id OR user_2 = user_record.user_id)
      AND matched_on >= today_start 
      AND matched_on < today_end
      AND status = 'active'
      AND chat_request_status = 'none'
      AND expires_at > now();
    
    -- Skip if user already has 2 new matches today
    IF user_matches_today >= 2 THEN
      CONTINUE;
    END IF;
    
    -- Find potential matches for this user (using DISTINCT to avoid duplicates)
    FOR potential_match IN
      SELECT DISTINCT ON (uo2.user_id) 
             uo2.user_id, uo2.mood, uo2.selected_memes, pr2.city, pr2.region, pr2.country,
             pr2.gender, pr2.sexual_orientation, pr2.interested_in, pr2.latitude, pr2.longitude,
             pr2.max_distance_preference, pr2.age
      FROM user_onboarding uo2
      JOIN profiles pr2 ON uo2.user_id = pr2.id
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
        -- Gender/Sexual Orientation compatibility
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
      -- CRITICAL: Check if this pair already has a match today
      SELECT EXISTS(
        SELECT 1 FROM matches 
        WHERE ((user_1 = user_record.user_id AND user_2 = potential_match.user_id) OR 
               (user_1 = potential_match.user_id AND user_2 = user_record.user_id))
          AND matched_on >= today_start
          AND matched_on < today_end
      ) INTO match_exists_today;
      
      IF match_exists_today THEN
        CONTINUE;
      END IF;
      
      -- Distance check
      IF user_record.latitude IS NOT NULL AND user_record.longitude IS NOT NULL 
         AND potential_match.latitude IS NOT NULL AND potential_match.longitude IS NOT NULL THEN
        
        BEGIN
          cos_calc := cos(radians(user_record.latitude)) * 
                     cos(radians(potential_match.latitude)) * 
                     cos(radians(potential_match.longitude) - radians(user_record.longitude)) + 
                     sin(radians(user_record.latitude)) * 
                     sin(radians(potential_match.latitude));
          
          cos_calc := GREATEST(-1, LEAST(1, cos_calc));
          distance_km := 6371 * acos(cos_calc);
          
          IF distance_km > user_record.max_distance_preference OR 
             distance_km > potential_match.max_distance_preference THEN
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
      
      -- Calculate compatibility score
      match_score_calc := 0;
      
      IF user_record.mood = potential_match.mood THEN
        match_score_calc := match_score_calc + 30;
      END IF;
      
      SELECT (
        (SELECT COUNT(*) FROM unnest(user_record.selected_memes) AS meme1
         WHERE meme1 = ANY(potential_match.selected_memes)) * 10
      ) INTO match_score_calc;
      
      match_score_calc := LEAST(match_score_calc + 30, 100);
      
      IF match_score_calc >= 20 THEN
        -- Check if potential match already has 2 matches today
        SELECT COUNT(*) INTO user_matches_today
        FROM matches 
        WHERE (user_1 = potential_match.user_id OR user_2 = potential_match.user_id)
          AND matched_on >= today_start 
          AND matched_on < today_end
          AND status = 'active'
          AND chat_request_status = 'none'
          AND expires_at > now();
        
        IF user_matches_today >= 2 THEN
          CONTINUE;
        END IF;
        
        -- Create the match
        BEGIN
          INSERT INTO matches (
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
          
          -- Re-check this user's matches today
          SELECT COUNT(*) INTO user_matches_today
          FROM matches 
          WHERE (user_1 = user_record.user_id OR user_2 = user_record.user_id)
            AND matched_on >= today_start 
            AND matched_on < today_end
            AND status = 'active'
            AND chat_request_status = 'none'
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