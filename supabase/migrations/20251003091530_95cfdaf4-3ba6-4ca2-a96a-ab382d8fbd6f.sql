-- Update should_show_onboarding function to always show for new users
CREATE OR REPLACE FUNCTION public.should_show_onboarding(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
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
    
    -- Get user's onboarding record (exclude pending records)
    SELECT * INTO onboarding_record
    FROM public.user_onboarding 
    WHERE user_id = user_id_param
      AND mood != 'pending_daily_update'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no onboarding record exists, ALWAYS show onboarding (new user)
    IF onboarding_record IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- For existing users, check if it's after 6 AM
    IF NOT is_after_6am_in_timezone(user_timezone) THEN
        RETURN FALSE;
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
$function$;