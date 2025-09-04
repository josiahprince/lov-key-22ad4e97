-- Fix the daily matches generation by adjusting the matching logic
-- The issue is that with limited users, most compatible pairs already have matches

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
  distance_km NUMERIC;
  cos_calc NUMERIC;
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

  -- Clean up old rejected/skipped matches older than 7 days to allow re-matching
  DELETE FROM matches 
  WHERE status IN ('skipped', 'rejected')
    AND matched_on < (now() - INTERVAL '7 days');

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
    FROM public.matches 
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
    FROM public.matches 
    WHERE (user_1 = user_record.user_id OR user_2 = user_record.user_id)
      AND matched_on >= today_start 
      AND matched_on < today_end
      AND status = 'active'
      AND chat_request_status = 'none'
      AND expires_at > now();
    
    -- Skip if user already has 3 new matches today
    IF user_matches_today >= 3 THEN
      CONTINUE;
    END IF;
    
    -- Find potential matches for this user
    -- Only exclude matches where there's an active relationship or recent activity
    FOR potential_match IN
      SELECT uo2.user_id, uo2.mood, uo2.selected_memes, pr2.city, pr2.region, pr2.country,
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
        -- Gender/Sexual Orientation compatibility checks
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
        -- Only exclude if there's an active match or recent activity (within 7 days)
        AND NOT EXISTS (
          SELECT 1 FROM public.matches 
          WHERE ((user_1 = user_record.user_id AND user_2 = uo2.user_id) OR 
                 (user_1 = uo2.user_id AND user_2 = user_record.user_id))
            AND (status IN ('active', 'chatting') 
                 OR chat_request_status = 'accepted'
                 OR matched_on > (now() - INTERVAL '7 days'))
        )
      ORDER BY RANDOM()
      LIMIT 10
    LOOP
      -- Distance check: if both users have location data, check distance
      IF user_record.latitude IS NOT NULL AND user_record.longitude IS NOT NULL 
         AND potential_match.latitude IS NOT NULL AND potential_match.longitude IS NOT NULL THEN
        
        -- Safe Haversine distance calculation with bounds checking
        BEGIN
          cos_calc := cos(radians(user_record.latitude)) * 
                     cos(radians(potential_match.latitude)) * 
                     cos(radians(potential_match.longitude) - radians(user_record.longitude)) + 
                     sin(radians(user_record.latitude)) * 
                     sin(radians(potential_match.latitude));
          
          -- Ensure the value is within valid range for acos function (-1 to 1)
          cos_calc := GREATEST(-1, LEAST(1, cos_calc));
          
          distance_km := 6371 * acos(cos_calc);
          
          -- Skip if outside distance preferences
          IF distance_km > user_record.max_distance_preference OR 
             distance_km > potential_match.max_distance_preference THEN
            CONTINUE;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- If distance calculation fails, fall back to location hierarchy
          IF user_record.country != potential_match.country THEN
            CONTINUE;
          END IF;
        END;
      ELSE
        -- If no location data, match based on location hierarchy (country > region > city)
        IF user_record.country != potential_match.country THEN
          CONTINUE;
        END IF;
      END IF;
      
      -- Calculate compatibility score based on mood and memes
      match_score_calc := 0;
      
      -- Mood compatibility (30 points for exact match)
      IF user_record.mood = potential_match.mood THEN
        match_score_calc := match_score_calc + 30;
      END IF;
      
      -- Meme compatibility (up to 70 points based on overlap)
      SELECT (
        (SELECT COUNT(*) FROM unnest(user_record.selected_memes) AS meme1
         WHERE meme1 = ANY(potential_match.selected_memes)) * 10
      ) INTO match_score_calc;
      
      match_score_calc := LEAST(match_score_calc + 30, 100); -- Cap at 100
      
      -- Only create matches with reasonable compatibility (minimum 20% match)
      IF match_score_calc >= 20 THEN
        -- Check if potential match already has 3 matches today
        SELECT COUNT(*) INTO user_matches_today
        FROM public.matches 
        WHERE (user_1 = potential_match.user_id OR user_2 = potential_match.user_id)
          AND matched_on >= today_start 
          AND matched_on < today_end
          AND status = 'active'
          AND chat_request_status = 'none'
          AND expires_at > now();
        
        -- Skip if potential match already has 3 matches today
        IF user_matches_today >= 3 THEN
          CONTINUE;
        END IF;
        
        -- Create the match
        BEGIN
          INSERT INTO public.matches (
            user_1, user_2, matched_on, expires_at, match_score, status, chat_request_status
          ) VALUES (
            user_record.user_id, 
            potential_match.user_id, 
            now(), 
            now() + INTERVAL '24 hours',
            match_score_calc,
            'active',
            'none'
          );
          
          matches_created_count := matches_created_count + 1;
          
          -- Update user's matches today count
          user_matches_today := user_matches_today + 1;
          
          -- Stop if this user now has 3 matches for today
          IF user_matches_today >= 3 THEN
            EXIT;
          END IF;
        EXCEPTION WHEN unique_violation THEN
          -- Skip if constraint violation occurs (duplicate match attempt)
          CONTINUE;
        END;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT matches_created_count, users_processed_count, users_skipped_chat_limit_count;
END;
$function$;