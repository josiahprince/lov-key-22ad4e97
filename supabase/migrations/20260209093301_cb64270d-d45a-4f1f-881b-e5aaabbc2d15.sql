-- Fix Function Search Path Mutable warnings by adding SET search_path = public

-- 1. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, phone_number)
  VALUES (
    NEW.id, 
    NEW.phone
  );
  RETURN NEW;
END;
$function$;

-- 3. ensure_single_main_photo
CREATE OR REPLACE FUNCTION public.ensure_single_main_photo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.is_main = TRUE THEN
    UPDATE public.user_photos 
    SET is_main = FALSE 
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. update_match_interaction
CREATE OR REPLACE FUNCTION public.update_match_interaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF OLD.chat_request_status IS DISTINCT FROM NEW.chat_request_status THEN
    NEW.last_interaction_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. update_match_on_message
CREATE OR REPLACE FUNCTION public.update_match_on_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  UPDATE public.matches 
  SET last_interaction_at = now()
  WHERE id = NEW.match_id;
  
  RETURN NEW;
END;
$function$;

-- 6. is_after_6am_in_timezone
CREATE OR REPLACE FUNCTION public.is_after_6am_in_timezone(user_timezone text)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    current_time_in_tz TIME;
BEGIN
    current_time_in_tz := (now() AT TIME ZONE user_timezone)::TIME;
    RETURN current_time_in_tz >= '06:00:00'::TIME;
END;
$function$;

-- 7. get_date_in_timezone
CREATE OR REPLACE FUNCTION public.get_date_in_timezone(user_timezone text)
RETURNS date
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    RETURN (now() AT TIME ZONE user_timezone)::DATE;
END;
$function$;

-- 8. should_show_onboarding
CREATE OR REPLACE FUNCTION public.should_show_onboarding(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    user_timezone TEXT;
    today_in_tz DATE;
    onboarding_record RECORD;
BEGIN
    SELECT timezone INTO user_timezone 
    FROM public.profiles 
    WHERE id = user_id_param;
    
    IF user_timezone IS NULL THEN
        user_timezone := 'UTC';
    END IF;
    
    today_in_tz := public.get_date_in_timezone(user_timezone);
    
    SELECT * INTO onboarding_record
    FROM public.user_onboarding 
    WHERE user_id = user_id_param
      AND mood != 'pending_daily_update'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF onboarding_record IS NULL THEN
        RETURN TRUE;
    END IF;
    
    IF NOT public.is_after_6am_in_timezone(user_timezone) THEN
        RETURN FALSE;
    END IF;
    
    IF onboarding_record.last_onboarding_date IS NULL OR 
       onboarding_record.last_onboarding_date < today_in_tz THEN
        RETURN TRUE;
    END IF;
    
    IF onboarding_record.onboarding_shown_today = TRUE AND 
       onboarding_record.last_onboarding_date = today_in_tz THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$function$;

-- Clean up duplicate RLS policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of their matches via view only" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- The remaining policies are:
-- "Users can view their own profile" - SELECT
-- "Users can insert their own profile" - INSERT  
-- "Users can update their own profile" - UPDATE