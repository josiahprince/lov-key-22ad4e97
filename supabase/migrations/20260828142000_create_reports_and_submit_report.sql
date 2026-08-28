-- reports table: user-submitted reports of harassment/spam/etc. No client
-- UPDATE/DELETE and no direct INSERT -- there's no admin panel yet (solo
-- developer), so status transitions happen manually via the Supabase
-- dashboard, and all inserts must go through submit_report() below.
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN (
    'harassment', 'inappropriate_content', 'fake_profile', 'spam', 'underage', 'other'
  )),
  details text,
  message_snapshot jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewed', 'actioned', 'dismissed'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT reports_not_self CHECK (reporter_id <> reported_id)
);

CREATE INDEX idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX idx_reports_pending ON public.reports(status) WHERE status = 'pending';

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports"
ON public.reports FOR SELECT
USING (auth.uid() = reporter_id);

CREATE POLICY "No direct report creation by users"
ON public.reports FOR INSERT
WITH CHECK (false);

-- submit_report(): snapshots up to the last 200 messages for the given
-- match into the report row at submission time. This exists because
-- messages.match_id is ON DELETE CASCADE (20250711090824-...sql) and
-- matches has a client-facing DELETE policy literally named "unmatch/block"
-- (20260226071141_...sql) that EITHER party can invoke at any time,
-- including right after being reported -- without a snapshot, evidence
-- could vanish before the developer reviews it within the 24h App
-- Store/Play SLA.
--
-- SECURITY: this function is SECURITY DEFINER and therefore bypasses RLS on
-- messages -- it MUST independently verify the caller is a participant in
-- p_match_id before reading it, otherwise a caller could pass an unrelated
-- match_id and have someone else's private conversation copied into their
-- own (readable) report row.
CREATE OR REPLACE FUNCTION public.submit_report(
  reported_user_id uuid,
  p_match_id uuid,
  p_reason text,
  p_details text DEFAULT NULL,
  also_block boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_report_id uuid;
  snapshot jsonb;
BEGIN
  IF reported_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_report_self';
  END IF;

  IF p_match_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.matches mx
      WHERE mx.id = p_match_id
        AND (mx.user_1 = auth.uid() OR mx.user_2 = auth.uid())
    ) THEN
      RAISE EXCEPTION 'match_not_found_or_not_authorized';
    END IF;

    SELECT jsonb_agg(jsonb_build_object(
             'sender_id', m.sender_id,
             'content', m.content,
             'created_at', m.created_at
           ) ORDER BY m.created_at DESC)
    INTO snapshot
    FROM (
      SELECT sender_id, content, created_at
      FROM public.messages
      WHERE match_id = p_match_id
      ORDER BY created_at DESC
      LIMIT 200
    ) m;
  END IF;

  INSERT INTO public.reports (reporter_id, reported_id, match_id, reason, details, message_snapshot)
  VALUES (auth.uid(), reported_user_id, p_match_id, p_reason, p_details, snapshot)
  RETURNING id INTO new_report_id;

  IF also_block THEN
    PERFORM public.block_user(reported_user_id);
  END IF;

  RETURN new_report_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_report(uuid, uuid, text, text, boolean) TO authenticated;
