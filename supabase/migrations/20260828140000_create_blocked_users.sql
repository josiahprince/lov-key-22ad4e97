-- Add a blocked_users table as the source of truth for user-initiated blocks
-- (Apple Guideline 1.2 / Google Play UGC policy require an in-app block
-- mechanism). Deliberately independent of the matches table lifecycle: a
-- block must survive even if the underlying match row is later deleted via
-- the existing "Users can delete their own matches (unmatch/block)" DELETE
-- policy (20260226071141_...sql), and it needs to persist so
-- generate_daily_matches() (20260822120000_...sql) can permanently exclude
-- the pair from future candidate matching.
--
-- RLS intentionally has no policy letting the blocked party see they've been
-- blocked (every clause gates on blocker_id = auth.uid()) to avoid
-- retaliation.

CREATE TABLE public.blocked_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blocked_users_not_self CHECK (blocker_id <> blocked_id),
  CONSTRAINT blocked_users_unique UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON public.blocked_users(blocked_id);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
ON public.blocked_users FOR SELECT
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create their own blocks"
ON public.blocked_users FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks"
ON public.blocked_users FOR DELETE
USING (auth.uid() = blocker_id);
