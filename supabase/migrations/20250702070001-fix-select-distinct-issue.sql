
-- Fix the SELECT DISTINCT ORDER BY issue in generate_daily_matches function
CREATE OR REPLACE FUNCTION public.generate_daily_matches()
RETURNS TABLE(
  matches_created INTEGER,
  users_processed INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  potential_match RECORD;
  matches_created_count INTEGER := 0;
  users_processed_count INTEGER := 0;
  today_start TIMESTAMP WITH TIME ZONE := date_trunc('day', now());
  today_end TIMESTAMP WITH TIME ZONE := today_start + INTERVAL '1 day';
  user_matches_today INTEGER;
  match_score_calc INTEGER;
BEGIN
  -- Loop through all users who have complete profiles and onboarding data
  FOR user_record IN 
    SELECT uo.user_id, uo.mood, uo.selected_memes, p.city, p.region, p.country, p.first_name
    FROM user_onboarding uo
    JOIN profiles p ON uo.user_id = p.id
    WHERE uo.mood IS NOT NULL 
      AND uo.selected_memes IS NOT NULL 
      AND array_length(uo.selected_memes, 1) > 0
      AND p.is_profile_complete = true
  LOOP
    users_processed_count := users_processed_count + 1;
    
    -- Check how many matches this user already has today
    SELECT COUNT(*) INTO user_matches_today
    FROM public.matches 
    WHERE (user_1 = user_record.user_id OR user_2 = user_record.user_id)
      AND matched_on >= today_start 
      AND matched_on < today_end;
    
    -- Skip if user already has 3 matches today
    IF user_matches_today >= 3 THEN
      CONTINUE;
    END IF;
    
    -- Find potential matches for this user using a subquery approach
    FOR potential_match IN
      SELECT user_id, mood, selected_memes, city, region, country, first_name,
             location_score, mood_score, shared_memes_count
      FROM (
        SELECT uo2.user_id, uo2.mood, uo2.selected_memes, pr2.city, pr2.region, pr2.country, pr2.first_name,
               -- Calculate location score
               CASE 
                 WHEN pr2.city = user_record.city THEN 3
                 WHEN pr2.region = user_record.region THEN 2
                 WHEN pr2.country = user_record.country THEN 1
                 ELSE 0
               END as location_score,
               -- Calculate mood score
               CASE 
                 WHEN uo2.mood = user_record.mood THEN 2
                 WHEN (user_record.mood = 'happy' AND uo2.mood = 'energetic') 
                   OR (user_record.mood = 'energetic' AND uo2.mood = 'happy')
                   OR (user_record.mood = 'chill' AND uo2.mood = 'sleepy')
                   OR (user_record.mood = 'sleepy' AND uo2.mood = 'chill') THEN 1
                 ELSE 0
               END as mood_score,
               -- Calculate shared memes count
               COALESCE(array_length(array(SELECT unnest(user_record.selected_memes) INTERSECT SELECT unnest(uo2.selected_memes)), 1), 0) as shared_memes_count,
               RANDOM() as random_order
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
      ) ranked_matches
      ORDER BY location_score DESC, mood_score DESC, shared_memes_count DESC, random_order
      LIMIT (3 - user_matches_today)
    LOOP
      -- Calculate final match score
      match_score_calc := 0;
      
      -- Location score (30 points max)
      IF potential_match.city = user_record.city THEN
        match_score_calc := match_score_calc + 30;
      ELSIF potential_match.region = user_record.region THEN
        match_score_calc := match_score_calc + 20;
      ELSIF potential_match.country = user_record.country THEN
        match_score_calc := match_score_calc + 10;
      END IF;
      
      -- Mood score (25 points max)
      IF potential_match.mood = user_record.mood THEN
        match_score_calc := match_score_calc + 25;
      ELSIF (user_record.mood = 'happy' AND potential_match.mood = 'energetic') 
        OR (user_record.mood = 'energetic' AND potential_match.mood = 'happy')
        OR (user_record.mood = 'chill' AND potential_match.mood = 'sleepy')
        OR (user_record.mood = 'sleepy' AND potential_match.mood = 'chill') THEN
        match_score_calc := match_score_calc + 15;
      END IF;
      
      -- Shared memes score (5 points per shared meme)
      IF user_record.selected_memes IS NOT NULL AND potential_match.selected_memes IS NOT NULL THEN
        match_score_calc := match_score_calc + (
          COALESCE(array_length(array(SELECT unnest(user_record.selected_memes) INTERSECT SELECT unnest(potential_match.selected_memes)), 1), 0) * 5
        );
      END IF;
      
      -- Insert the match
      INSERT INTO public.matches (user_1, user_2, match_score, matched_on)
      VALUES (user_record.user_id, potential_match.user_id, match_score_calc, now());
      
      matches_created_count := matches_created_count + 1;
      
      -- Log the match creation for debugging
      RAISE NOTICE 'Created match: % (%) <-> % (%) with score %', 
        user_record.first_name, user_record.user_id, 
        potential_match.first_name, potential_match.user_id, 
        match_score_calc;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT matches_created_count, users_processed_count;
END;
$$;
