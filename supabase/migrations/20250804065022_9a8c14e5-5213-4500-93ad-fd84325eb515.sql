-- Add timezone and onboarding tracking fields to support daily 6:00 AM onboarding workflow
-- Add timezone field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN timezone TEXT DEFAULT 'Asia/Kolkata';

-- Add onboarding tracking fields to user_onboarding table
ALTER TABLE public.user_onboarding 
ADD COLUMN last_onboarding_date DATE,
ADD COLUMN onboarding_shown_today BOOLEAN DEFAULT FALSE,
ADD COLUMN last_6am_reset TIMESTAMP WITH TIME ZONE;

-- Create indexes for efficient daily queries
CREATE INDEX idx_user_onboarding_last_onboarding_date ON public.user_onboarding(last_onboarding_date);
CREATE INDEX idx_user_onboarding_reset_needed ON public.user_onboarding(onboarding_shown_today, last_6am_reset);
CREATE INDEX idx_profiles_timezone ON public.profiles(timezone);

-- Create function to detect if it's after 6 AM in user's timezone
CREATE OR REPLACE FUNCTION public.is_after_6am_in_timezone(user_timezone TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_time_in_tz TIME;
BEGIN
    -- Get current time in user's timezone
    current_time_in_tz := (now() AT TIME ZONE user_timezone)::TIME;
    
    -- Return true if current time is 6:00 AM or later
    RETURN current_time_in_tz >= '06:00:00'::TIME;
END;
$$ LANGUAGE plpgsql;

-- Create function to get today's date in user's timezone
CREATE OR REPLACE FUNCTION public.get_date_in_timezone(user_timezone TEXT)
RETURNS DATE AS $$
BEGIN
    RETURN (now() AT TIME ZONE user_timezone)::DATE;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if user needs onboarding today
CREATE OR REPLACE FUNCTION public.should_show_onboarding(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_timezone TEXT;
    today_in_tz DATE;
    onboarding_record RECORD;
BEGIN
    -- Get user's timezone
    SELECT timezone INTO user_timezone 
    FROM public.profiles 
    WHERE id = user_id_param;
    
    -- Default to UTC if no timezone found
    IF user_timezone IS NULL THEN
        user_timezone := 'UTC';
    END IF;
    
    -- Get today's date in user's timezone
    today_in_tz := get_date_in_timezone(user_timezone);
    
    -- Check if it's after 6 AM in user's timezone
    IF NOT is_after_6am_in_timezone(user_timezone) THEN
        RETURN FALSE;
    END IF;
    
    -- Get user's onboarding record
    SELECT * INTO onboarding_record
    FROM public.user_onboarding 
    WHERE user_id = user_id_param
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no onboarding record exists, show onboarding
    IF onboarding_record IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- If last onboarding date is not today, show onboarding
    IF onboarding_record.last_onboarding_date IS NULL OR 
       onboarding_record.last_onboarding_date < today_in_tz THEN
        RETURN TRUE;
    END IF;
    
    -- If already shown today after 6 AM, don't show again
    IF onboarding_record.onboarding_shown_today = TRUE AND 
       onboarding_record.last_onboarding_date = today_in_tz THEN
        RETURN FALSE;
    END IF;
    
    -- Otherwise, show onboarding
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Update existing user onboarding records to set timezone detection needed
UPDATE public.user_onboarding 
SET onboarding_shown_today = FALSE,
    last_6am_reset = NULL,
    last_onboarding_date = NULL;