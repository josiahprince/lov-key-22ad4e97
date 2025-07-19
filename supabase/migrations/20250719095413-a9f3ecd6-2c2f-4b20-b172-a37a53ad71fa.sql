-- First, let's clean up any old expired matches to reduce clutter
DELETE FROM matches WHERE expires_at < now() AND chat_request_status = 'none';

-- Create fresh matches for the current user (193b86ef-a4fc-498a-9439-f20505597bd6)
-- Let's find some users they haven't matched with yet and create matches

INSERT INTO matches (user_1, user_2, match_score, matched_on, expires_at, status, chat_request_status)
SELECT 
  '193b86ef-a4fc-498a-9439-f20505597bd6' as user_1,
  p.id as user_2,
  CASE 
    WHEN p.city = (SELECT city FROM profiles WHERE id = '193b86ef-a4fc-498a-9439-f20505597bd6') THEN 75
    WHEN p.region = (SELECT region FROM profiles WHERE id = '193b86ef-a4fc-498a-9439-f20505597bd6') THEN 60
    ELSE 45
  END as match_score,
  now() as matched_on,
  now() + INTERVAL '24 hours' as expires_at,
  'active' as status,
  'none' as chat_request_status
FROM profiles p 
WHERE p.id != '193b86ef-a4fc-498a-9439-f20505597bd6'
  AND p.is_profile_complete = true
  AND NOT EXISTS (
    SELECT 1 FROM matches m 
    WHERE (m.user_1 = '193b86ef-a4fc-498a-9439-f20505597bd6' AND m.user_2 = p.id)
       OR (m.user_1 = p.id AND m.user_2 = '193b86ef-a4fc-498a-9439-f20505597bd6')
  )
  AND EXISTS (
    SELECT 1 FROM user_onboarding uo 
    WHERE uo.user_id = p.id 
      AND uo.mood IS NOT NULL 
      AND uo.selected_memes IS NOT NULL
  )
LIMIT 3;