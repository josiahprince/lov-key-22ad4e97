-- Fix the unique constraint issue for daily onboarding updates
-- The constraint should allow multiple entries per user but not multiple entries per user per day

-- First, drop the existing unique constraint if it exists
ALTER TABLE user_onboarding DROP CONSTRAINT IF EXISTS unique_user_onboarding;

-- Add a new constraint that allows one entry per user per day
ALTER TABLE user_onboarding ADD CONSTRAINT unique_user_onboarding_per_day 
UNIQUE (user_id, DATE(updated_at));