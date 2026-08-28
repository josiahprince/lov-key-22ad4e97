-- Widen matches.status to add 'blocked', reusing the existing status-driven
-- visibility/messaging cutoffs: can_view_matched_profile() only grants
-- cross-user profile access for status='active' or (status='chatting' AND
-- chat_request_status='accepted'); the messages INSERT policy
-- (20250717063722-7a92ec08...sql) requires status IN ('active','chatting')
-- AND chat_request_status='accepted'; useMatches.ts/useChats.ts already
-- filter on status='active'/['active','chatting']. None of those match
-- 'blocked', so flipping status revokes profile visibility, blocks new
-- sends, and drops the match from both list screens with zero other code
-- changes.
--
-- NOTE: matches.status's CHECK constraint predates this migration history
-- (there is no CREATE TABLE public.matches anywhere under
-- supabase/migrations/ -- the table was created directly, e.g. via the
-- Supabase SQL editor, before migrations were tracked here).
-- MatchesScreen.tsx's handleSkip() already writes status='skipped' today,
-- so the live constraint is evidently wider than the 3 values documented
-- elsewhere. Rather than guess the exact current definition, drop-if-exists
-- and re-add covering every value referenced anywhere in this app plus
-- 'blocked'.
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE public.matches
  ADD CONSTRAINT matches_status_check
  CHECK (status IN ('active', 'chatting', 'inactive', 'skipped', 'rejected', 'blocked'));

-- block_user(): atomically records the block and neutralizes any existing
-- match row between the two users by flipping it to 'blocked'.
CREATE OR REPLACE FUNCTION public.block_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_block_self';
  END IF;

  INSERT INTO public.blocked_users (blocker_id, blocked_id)
  VALUES (auth.uid(), target_user_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

  UPDATE public.matches
  SET status = 'blocked'
  WHERE ((user_1 = auth.uid() AND user_2 = target_user_id)
      OR (user_1 = target_user_id AND user_2 = auth.uid()))
    AND status <> 'blocked';
END;
$$;

GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated;

-- unblock_user(): removes the block only. Deliberately does NOT revive the
-- match back to 'active'/'chatting' -- the old conversation stays archived
-- as 'blocked'; generate_daily_matches() is free to create a fresh match
-- once both users are eligible candidates for each other again.
CREATE OR REPLACE FUNCTION public.unblock_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.blocked_users
  WHERE blocker_id = auth.uid() AND blocked_id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unblock_user(uuid) TO authenticated;

-- get_blocked_users(): the blocking user needs a sanctioned read path to see
-- who they've blocked, because can_view_matched_profile() (and therefore
-- profiles_matched_view) stops granting access the moment status='blocked'.
-- No photo is returned: photo display goes through get-signed-photo-url,
-- whose auth check requires an active/chatting match, which a blocked pair
-- will never have again -- not worth widening that function for this list.
CREATE OR REPLACE FUNCTION public.get_blocked_users()
RETURNS TABLE(blocked_id uuid, nickname text, blocked_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bu.blocked_id, p.nickname, bu.created_at AS blocked_at
  FROM public.blocked_users bu
  JOIN public.profiles p ON p.id = bu.blocked_id
  WHERE bu.blocker_id = auth.uid()
  ORDER BY bu.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_blocked_users() TO authenticated;
