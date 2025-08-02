-- Update the generate_daily_matches function to properly handle 24-hour expiration
-- and ensure expired matches are removed for both users
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
  -- First, clean up expired matches (24-hour expiration for matches with no action)
  -- This removes expired matches for BOTH users in the match
  DELETE FROM matches 
  WHERE expires_at < now() 
    AND chat_request_status = 'none' 
    AND status = 'active';
  
  -- Mark chats as inactive if no interaction for 48 hours (for both users)
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
    
    -- Check how many active chats this user has (excluding inactive ones)
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
      AND expires_at > now(); -- Only count non-expired matches
    
    -- Skip if user already has 3 new matches today
    IF user_matches_today >= 3 THEN
      CONTINUE;
    END IF;
    
    -- Find potential matches for this user
    FOR potential_match IN
      SELECT uo2.user_id, uo2.mood, uo2.selected_memes, pr2.city, pr2.region, pr2.country,
             pr2.gender, pr2.sexual_orientation, pr2.interested_in, pr2.latitude, pr2.longitude,
             pr2.max_distance_preference, pr2.age
      FROM user_onboarding uo2
      JOIN profiles pr2 ON uo2.user_id = pr2.id
      WHERE uo2.user_id != user_record.user_id  -- Don't match with themselves
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
        -- Gender/Sexual Orientation/Interested In compatibility checks
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
        -- Ensure no existing match exists between these users
        AND NOT EXISTS (
          SELECT 1 FROM matches 
          WHERE ((user_1 = user_record.user_id AND user_2 = uo2.user_id) 
             OR (user_1 = uo2.user_id AND user_2 = user_record.user_id))
            AND status = 'active'
            AND expires_at > now()
        )
      ORDER BY 
        -- Location proximity prioritization
        CASE WHEN pr2.city = user_record.city THEN 0 ELSE 1 END,
        CASE WHEN uo2.mood = user_record.mood THEN 0 ELSE 1 END,
        RANDOM()
      LIMIT (3 - user_matches_today)
    LOOP
      -- Calculate match score
      match_score_calc := 50; -- Base score
      
      -- Location score calculation
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
      
      -- Shared memes score (safely handle null arrays)
      BEGIN
        match_score_calc := match_score_calc + (
          COALESCE(array_length(array(SELECT unnest(user_record.selected_memes) INTERSECT SELECT unnest(potential_match.selected_memes)), 1), 0) * 5
        );
      EXCEPTION WHEN OTHERS THEN
        -- If there's any error with array operations, just skip the meme score
        NULL;
      END;
      
      -- Insert the match with 24-hour expiry
      BEGIN
        INSERT INTO public.matches (user_1, user_2, match_score, matched_on, expires_at)
        VALUES (
          user_record.user_id, 
          potential_match.user_id, 
          match_score_calc, 
          now(), 
          now() + INTERVAL '24 hours'
        );
        
        matches_created_count := matches_created_count + 1;
      EXCEPTION WHEN unique_violation THEN
        -- Skip if constraint violation occurs (duplicate match attempt)
        CONTINUE;
      END;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT matches_created_count, users_processed_count, users_skipped_chat_limit_count;
END;
$function$;