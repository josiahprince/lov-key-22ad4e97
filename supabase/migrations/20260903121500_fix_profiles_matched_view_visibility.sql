-- Fix profiles_matched_view returning zero rows for every matched profile
-- except the caller's own -- the actual root cause of matches/chats showing
-- "Unknown User" (src/hooks/useMatches.ts, src/hooks/useChats.ts), confirmed
-- live on 2026-09-03: a direct REST call to
-- profiles_matched_view?id=eq.<matchedUserId>, authenticated as a user with
-- a real status='active' match to that id, returned 200 OK with an empty
-- array.
--
-- 20260209092403_0b5ee756-ee88-43b6-ab03-59de00e378bf.sql recreated this
-- view with security_invoker = true, presumably to address a Supabase
-- linter "Security Definer View" warning. But security_invoker = true also
-- makes the view subject to the underlying public.profiles table's own RLS,
-- not just the view's WHERE clause -- and that table's only SELECT policy
-- ("Users can view their own profile", from
-- 20260130094746_fc3253b0-e2f5-46e2-a4ff-fb4b17d13e23.sql) is auth.uid() =
-- id, self only. So regardless of what this view's WHERE clause allows, RLS
-- on the base table silently blocked every other row -- the view has been
-- unable to show anyone's matched profile but their own since that
-- migration landed.
--
-- The fix is to drop security_invoker so the view runs as its owner (the
-- default for views, and what the original pre-Feb version did with no
-- WITH clause at all) -- RLS on public.profiles no longer applies inside
-- it, and the view's own WHERE clause (self OR can_view_matched_profile())
-- becomes the real, and only, access control again, exactly as originally
-- intended. can_view_matched_profile() is already SECURITY DEFINER and
-- re-derives access from the matches table itself, so this is not a
-- widening of scope -- it's undoing an accidental regression.
--
-- IMPORTANT for anyone re-running the Supabase linter: it will likely flag
-- this view again as "Security Definer View". Do NOT re-add
-- security_invoker = true to silence it -- that is precisely what breaks
-- matched-profile visibility. This view's WHERE clause is the intended
-- access control; keep security_barrier = true for defense in depth
-- instead.
DROP VIEW IF EXISTS public.profiles_matched_view;

CREATE VIEW public.profiles_matched_view
WITH (security_barrier = true) AS
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

GRANT SELECT ON public.profiles_matched_view TO authenticated;
