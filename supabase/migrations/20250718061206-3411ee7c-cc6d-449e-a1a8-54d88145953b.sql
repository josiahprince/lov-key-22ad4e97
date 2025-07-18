-- First, let's keep only the latest onboarding record for each user
WITH latest_onboarding AS (
  SELECT DISTINCT ON (user_id) 
    id, user_id, created_at
  FROM user_onboarding 
  ORDER BY user_id, created_at DESC
)
DELETE FROM user_onboarding 
WHERE id NOT IN (SELECT id FROM latest_onboarding);

-- Add a unique constraint to prevent future duplicates
ALTER TABLE user_onboarding 
ADD CONSTRAINT unique_user_onboarding 
UNIQUE (user_id);