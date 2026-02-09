-- Drop the existing view
DROP VIEW IF EXISTS public.profiles_matched_view;

-- Recreate the view with security_invoker to respect the caller's permissions
-- The view will use the can_view_matched_profile function to restrict access
CREATE VIEW public.profiles_matched_view
WITH (security_invoker = true, security_barrier = true) AS
SELECT 
  p.id,
  p.nickname,
  p.age,
  p.city,
  p.region,
  p.country,
  p.gender,
  p.sexual_orientation,
  p.interested_in,
  p.interests,
  p.languages,
  p.languages_spoken,
  p.religion,
  p.personality_prompts,
  p.is_profile_complete,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE 
  p.id = auth.uid() 
  OR public.can_view_matched_profile(p.id);