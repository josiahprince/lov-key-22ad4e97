-- Create a secure view for matched user profiles that excludes sensitive data
CREATE VIEW public.profiles_matched_view
WITH (security_invoker = on) AS
SELECT 
  id,
  nickname,
  age,
  city,
  region,
  country,
  gender,
  sexual_orientation,
  interested_in,
  interests,
  languages,
  languages_spoken,
  religion,
  personality_prompts,
  is_profile_complete,
  created_at,
  updated_at
  -- Excluded: phone_number, first_name, last_name, latitude, longitude, date_of_birth, location, min/max_age_preference, max_distance_preference, timezone
FROM public.profiles;

-- Drop the old permissive match viewing policy
DROP POLICY IF EXISTS "Users can view profiles of their matches" ON public.profiles;

-- Create a restrictive policy for matches that denies direct table access
-- Matches must use the view instead
CREATE POLICY "Users can view profiles of their matches via view only"
ON public.profiles
FOR SELECT
USING (
  -- Users can always view their own profile
  auth.uid() = id
);

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.profiles_matched_view TO authenticated;

-- Create RLS-like access control via a function for the view
CREATE OR REPLACE FUNCTION public.can_view_matched_profile(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM matches m
    WHERE (
      (m.user_1 = auth.uid() AND m.user_2 = profile_id) OR
      (m.user_2 = auth.uid() AND m.user_1 = profile_id)
    )
    AND (
      m.status = 'active' OR 
      (m.status = 'chatting' AND m.chat_request_status = 'accepted')
    )
  )
$$;