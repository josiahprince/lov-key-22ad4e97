-- Fix the unique constraint issue for daily onboarding updates
-- Drop the existing unique constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'unique_user_onboarding' 
               AND table_name = 'user_onboarding') THEN
        ALTER TABLE user_onboarding DROP CONSTRAINT unique_user_onboarding;
    END IF;
END $$;

-- For daily onboarding, we need to allow updates to existing records
-- Instead of a unique constraint, we'll handle this in the application logic