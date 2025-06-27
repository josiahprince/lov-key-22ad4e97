
-- Create matches table
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  matched_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  match_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT matches_no_self_match CHECK (user_1 != user_2),
  CONSTRAINT matches_unique_pair UNIQUE (user_1, user_2)
);

-- Enable RLS on matches table
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own matches
CREATE POLICY "Users can view their own matches" 
  ON public.matches 
  FOR SELECT 
  USING (auth.uid() = user_1 OR auth.uid() = user_2);

-- Create policy for inserting matches (will be used by the matching function)
CREATE POLICY "System can create matches" 
  ON public.matches 
  FOR INSERT 
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_matches_user_1 ON public.matches(user_1);
CREATE INDEX idx_matches_user_2 ON public.matches(user_2);
CREATE INDEX idx_matches_matched_on ON public.matches(matched_on);

-- Create function to generate daily matches
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
  -- Loop through all users who have complete profiles
  FOR user_record IN 
    SELECT p.id, p.mood, p.selected_memes, p.city, p.region, p.country
    FROM user_onboarding p
    WHERE p.mood IS NOT NULL 
      AND p.selected_memes IS NOT NULL 
      AND array_length(p.selected_memes, 1) > 0
  LOOP
    users_processed_count := users_processed_count + 1;
    
    -- Check how many matches this user already has today
    SELECT COUNT(*) INTO user_matches_today
    FROM public.matches 
    WHERE (user_1 = user_record.id OR user_2 = user_record.id)
      AND matched_on >= today_start 
      AND matched_on < today_end;
    
    -- Skip if user already has 3 matches today
    IF user_matches_today >= 3 THEN
      CONTINUE;
    END IF;
    
    -- Find potential matches for this user
    FOR potential_match IN
      SELECT DISTINCT p2.user_id, uo2.mood, uo2.selected_memes, pr2.city, pr2.region, pr2.country
      FROM user_onboarding uo2
      JOIN profiles pr2 ON uo2.user_id = pr2.id
      WHERE uo2.user_id != user_record.id  -- Not themselves
        AND uo2.mood IS NOT NULL
        AND uo2.selected_memes IS NOT NULL
        AND array_length(uo2.selected_memes, 1) > 0
        AND NOT EXISTS (  -- Not already matched
          SELECT 1 FROM public.matches m 
          WHERE (m.user_1 = user_record.id AND m.user_2 = uo2.user_id)
             OR (m.user_1 = uo2.user_id AND m.user_2 = user_record.id)
        )
      ORDER BY
        -- Prioritize by location match
        CASE 
          WHEN pr2.city = (SELECT city FROM profiles WHERE id = user_record.id) THEN 3
          WHEN pr2.region = (SELECT region FROM profiles WHERE id = user_record.id) THEN 2
          WHEN pr2.country = (SELECT country FROM profiles WHERE id = user_record.id) THEN 1
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
      IF potential_match.city = (SELECT city FROM profiles WHERE id = user_record.id) THEN
        match_score_calc := match_score_calc + 30;
      ELSIF potential_match.region = (SELECT region FROM profiles WHERE id = user_record.id) THEN
        match_score_calc := match_score_calc + 20;
      ELSIF potential_match.country = (SELECT country FROM profiles WHERE id = user_record.id) THEN
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
      
      -- Insert the match
      INSERT INTO public.matches (user_1, user_2, match_score, matched_on)
      VALUES (user_record.id, potential_match.user_id, match_score_calc, now());
      
      matches_created_count := matches_created_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT matches_created_count, users_processed_count;
END;
$$;
