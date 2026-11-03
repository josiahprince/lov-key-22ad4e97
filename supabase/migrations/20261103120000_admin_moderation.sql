-- What the admin app does: the report queue, user lookup, and warnings,
-- suspensions and bans. Builds on 20261030120000_staff_roles_and_audit_log.sql.
--
-- Every function here checks authorize() (role + MFA) and writes to
-- admin_audit_log through record_admin_action(). Clients get no direct access
-- to reports, account_restrictions or auth.users.
--
-- A suspension (until a date) or a ban (no end) does three things (owner
-- decision, 2026-11-03):
--   1. Blocks sign-in. That part needs Supabase's admin API, so the admin app
--      goes through the admin-action edge function, which calls
--      admin_restrict_account() / admin_lift_restriction() as the staff member
--      and then sets the auth user's ban to match their active restrictions.
--      A token issued before the ban stays valid until it expires (1 hour).
--   2. Keeps them out of matching, as the person being matched and as a
--      candidate (generate_matches_internal, below).
--   3. Closes their open matches and chats as 'unmatched', exactly like Remove
--      User: the other person isn't told why, and the pair is never re-matched.
-- Lifting a restriction undoes 1 and 2. Closed matches stay closed.
--
-- A warning only sends the person an 'account_warning' notification whose
-- message is the reason, so staff write it for the member to read.
--
-- account_restrictions.user_id is deliberately not a foreign key, like
-- reports, so the record survives account deletion.

-- ---------------------------------------------------------------------------
-- Restrictions
-- ---------------------------------------------------------------------------
CREATE TABLE public.account_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('warning', 'suspension', 'ban')),
  reason text NOT NULL CHECK (length(btrim(reason)) > 0),
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  lifted_at timestamptz,
  lifted_by uuid,
  lift_reason text,
  CONSTRAINT account_restrictions_ends_at CHECK ((kind = 'suspension') = (ends_at IS NOT NULL))
);

COMMENT ON TABLE public.account_restrictions IS
  'Warnings, suspensions and bans. user_id is deliberately NOT a foreign key so the record survives account deletion.';

CREATE INDEX idx_account_restrictions_user ON public.account_restrictions (user_id);

ALTER TABLE public.account_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view account restrictions"
ON public.account_restrictions FOR SELECT TO authenticated
USING (public.authorize('users.view'));

-- True while a suspension or ban is in force.
CREATE OR REPLACE FUNCTION public.is_account_restricted(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_restrictions r
    WHERE r.user_id = p_user_id
      AND r.lifted_at IS NULL
      AND (r.kind = 'ban' OR (r.kind = 'suspension' AND r.ends_at > now()))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_account_restricted(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.require_permission(p_permission public.app_permission)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.authorize(p_permission) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.require_reason(p_reason text)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF coalesce(btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;
END;
$$;

-- "j•••@gmail.com" and "•••• 4821": enough to recognise, not to contact.
CREATE OR REPLACE FUNCTION public.mask_email(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_email IS NULL OR position('@' IN p_email) = 0 THEN NULL
    ELSE left(p_email, 1) || '•••' || substring(p_email FROM position('@' IN p_email))
  END;
$$;

CREATE OR REPLACE FUNCTION public.mask_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN coalesce(p_phone, '') = '' THEN NULL ELSE '•••• ' || right(p_phone, 4) END;
$$;

REVOKE EXECUTE ON FUNCTION public.require_permission(public.app_permission) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.require_reason(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mask_email(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mask_phone(text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Warning notifications
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('new_match', 'chat_accepted', 'new_message', 'match_expired', 'chat_expired', 'account_warning'));

-- ---------------------------------------------------------------------------
-- Dashboard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS TABLE (
  open_reports integer,
  oldest_open_report_at timestamptz,
  bans_this_week integer,
  suspensions_active integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_permission('reports.view');

  RETURN QUERY SELECT
    (SELECT count(*)::integer FROM public.reports WHERE status = 'pending'),
    (SELECT min(created_at) FROM public.reports WHERE status = 'pending'),
    (SELECT count(*)::integer FROM public.account_restrictions
      WHERE kind = 'ban' AND created_at > now() - interval '7 days'),
    (SELECT count(*)::integer FROM public.account_restrictions
      WHERE kind = 'suspension' AND lifted_at IS NULL AND ends_at > now());
END;
$$;

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
-- Open reports oldest first (the 24-hour clock), closed ones newest first.
CREATE OR REPLACE FUNCTION public.admin_list_reports(p_status text DEFAULT 'pending')
RETURNS TABLE (
  id uuid,
  reason text,
  details text,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz,
  reporter_id uuid,
  reporter_nickname text,
  reported_id uuid,
  reported_nickname text,
  has_messages boolean,
  reported_open_reports integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_permission('reports.view');

  RETURN QUERY
  SELECT r.id, r.reason, r.details, r.status, r.created_at, r.reviewed_at,
         r.reporter_id, rp.nickname, r.reported_id, dp.nickname,
         r.message_snapshot IS NOT NULL AND jsonb_array_length(r.message_snapshot) > 0,
         (SELECT count(*)::integer FROM public.reports o
           WHERE o.reported_id = r.reported_id AND o.status = 'pending')
  FROM public.reports r
  LEFT JOIN public.profiles rp ON rp.id = r.reporter_id
  LEFT JOIN public.profiles dp ON dp.id = r.reported_id
  WHERE r.status = p_status
  ORDER BY
    CASE WHEN p_status = 'pending' THEN r.created_at END ASC,
    CASE WHEN p_status <> 'pending' THEN r.created_at END DESC
  LIMIT 200;
END;
$$;

-- One report. The attached messages come back only for staff allowed to read
-- them (messages.read_reported), and each time they do, it is logged.
CREATE OR REPLACE FUNCTION public.admin_get_report(p_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rep public.reports%ROWTYPE;
  can_read boolean;
BEGIN
  PERFORM public.require_permission('reports.view');

  SELECT * INTO rep FROM public.reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'report_not_found';
  END IF;

  can_read := public.authorize('messages.read_reported');
  IF can_read AND rep.message_snapshot IS NOT NULL THEN
    PERFORM public.record_admin_action(
      'report.messages_viewed', 'Reviewing report', rep.reported_id, rep.id::text, NULL);
  END IF;

  RETURN jsonb_build_object(
    'id', rep.id,
    'reason', rep.reason,
    'details', rep.details,
    'status', rep.status,
    'created_at', rep.created_at,
    'reviewed_at', rep.reviewed_at,
    'match_id', rep.match_id,
    'reporter_id', rep.reporter_id,
    'reporter_nickname', (SELECT nickname FROM public.profiles WHERE id = rep.reporter_id),
    'reported_id', rep.reported_id,
    'reported_nickname', (SELECT nickname FROM public.profiles WHERE id = rep.reported_id),
    'messages_hidden', NOT can_read AND rep.message_snapshot IS NOT NULL,
    'messages', CASE WHEN can_read THEN rep.message_snapshot ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolve_report(p_report_id uuid, p_status text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
BEGIN
  PERFORM public.require_permission('reports.resolve');
  PERFORM public.require_reason(p_reason);
  IF p_status NOT IN ('reviewed', 'actioned', 'dismissed') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  UPDATE public.reports
  SET status = p_status, reviewed_at = now()
  WHERE id = p_report_id
  RETURNING reported_id INTO target;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'report_not_found';
  END IF;

  PERFORM public.record_admin_action(
    'report.resolved', p_reason, target, p_report_id::text, jsonb_build_object('status', p_status));
END;
$$;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
-- Finds people by account ID, email, phone (4+ digits) or nickname.
CREATE OR REPLACE FUNCTION public.admin_find_users(p_query text)
RETURNS TABLE (
  id uuid,
  nickname text,
  email_masked text,
  phone_masked text,
  city text,
  country text,
  created_at timestamptz,
  profile_complete boolean,
  restricted boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text := btrim(coalesce(p_query, ''));
  digits text := regexp_replace(coalesce(p_query, ''), '\D', '', 'g');
BEGIN
  PERFORM public.require_permission('users.view');
  IF length(q) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id, p.nickname, public.mask_email(u.email::text), public.mask_phone(u.phone::text),
         p.city, p.country, u.created_at, coalesce(p.is_profile_complete, false),
         public.is_account_restricted(u.id)
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id::text = lower(q)
     OR u.email ILIKE '%' || q || '%'
     OR p.nickname ILIKE '%' || q || '%'
     OR (length(digits) >= 4 AND u.phone LIKE '%' || digits || '%')
  ORDER BY u.created_at DESC
  LIMIT 25;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  PERFORM public.require_permission('users.view');

  SELECT jsonb_build_object(
    'id', u.id,
    'nickname', p.nickname,
    'age', p.age,
    'gender', p.gender,
    'city', p.city,
    'region', p.region,
    'country', p.country,
    'profile_complete', coalesce(p.is_profile_complete, false),
    'created_at', u.created_at,
    'last_sign_in_at', u.last_sign_in_at,
    'banned_until', u.banned_until,
    'email_masked', public.mask_email(u.email::text),
    'phone_masked', public.mask_phone(u.phone::text),
    'description', (SELECT d.description FROM public.user_descriptions d WHERE d.user_id = u.id),
    'staff_role', (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = u.id),
    'restricted', public.is_account_restricted(u.id),
    'open_chats', public.active_chat_count(u.id),
    'reports_filed', (SELECT count(*) FROM public.reports r WHERE r.reporter_id = u.id),
    'reports_about', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'reason', r.reason, 'status', r.status, 'created_at', r.created_at,
        'reporter_nickname', (SELECT nickname FROM public.profiles WHERE id = r.reporter_id)
      ) ORDER BY r.created_at DESC)
      FROM public.reports r WHERE r.reported_id = u.id
    ), '[]'::jsonb),
    'restrictions', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ar.id, 'kind', ar.kind, 'reason', ar.reason, 'ends_at', ar.ends_at,
        'created_at', ar.created_at, 'lifted_at', ar.lifted_at, 'lift_reason', ar.lift_reason,
        'active', ar.lifted_at IS NULL
          AND (ar.kind = 'ban' OR (ar.kind = 'suspension' AND ar.ends_at > now()))
      ) ORDER BY ar.created_at DESC)
      FROM public.account_restrictions ar WHERE ar.user_id = u.id
    ), '[]'::jsonb)
  )
  INTO result
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = p_user_id;

  IF result IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;
  RETURN result;
END;
$$;

-- Full email and phone, for staff allowed to see them. Always logged.
CREATE OR REPLACE FUNCTION public.admin_reveal_contact(p_user_id uuid, p_reason text)
RETURNS TABLE (email text, phone text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_permission('users.view_contact');
  PERFORM public.require_reason(p_reason);

  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  PERFORM public.record_admin_action('user.contact_revealed', p_reason, p_user_id, NULL, NULL);

  RETURN QUERY
  SELECT u.email::text, CASE WHEN coalesce(u.phone, '') = '' THEN NULL ELSE '+' || u.phone END
  FROM auth.users u WHERE u.id = p_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Warnings, suspensions and bans
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_warn_user(p_user_id uuid, p_reason text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  PERFORM public.require_permission('users.warn');
  PERFORM public.require_reason(p_reason);
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  INSERT INTO public.account_restrictions (user_id, kind, reason, created_by)
  VALUES (p_user_id, 'warning', btrim(p_reason), auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (p_user_id, 'account_warning', 'A warning from the LovKey team', btrim(p_reason));

  PERFORM public.record_admin_action('user.warned', p_reason, p_user_id, new_id::text, NULL);
  RETURN new_id;
END;
$$;

-- Called by the admin-action edge function as the staff member; the function
-- then blocks sign-in to match.
CREATE OR REPLACE FUNCTION public.admin_restrict_account(
  p_user_id uuid,
  p_kind text,
  p_ends_at timestamptz,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  closed integer;
BEGIN
  IF p_kind = 'suspension' THEN
    PERFORM public.require_permission('users.suspend');
    IF p_ends_at IS NULL OR p_ends_at <= now() THEN
      RAISE EXCEPTION 'end_date_must_be_in_future';
    END IF;
  ELSIF p_kind = 'ban' THEN
    PERFORM public.require_permission('users.ban');
  ELSE
    RAISE EXCEPTION 'invalid_kind';
  END IF;
  PERFORM public.require_reason(p_reason);

  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;
  -- Staff are removed from their role first, so nobody locks out an admin
  -- (or themselves) by accident.
  IF EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p_user_id) THEN
    RAISE EXCEPTION 'target_is_staff';
  END IF;

  INSERT INTO public.account_restrictions (user_id, kind, reason, ends_at, created_by)
  VALUES (p_user_id, p_kind, btrim(p_reason), CASE WHEN p_kind = 'suspension' THEN p_ends_at END, auth.uid())
  RETURNING id INTO new_id;

  UPDATE public.matches
  SET status = 'unmatched', updated_at = now()
  WHERE p_user_id IN (user_1, user_2)
    AND status IN ('active', 'chatting');
  GET DIAGNOSTICS closed = ROW_COUNT;

  PERFORM public.record_admin_action(
    CASE WHEN p_kind = 'ban' THEN 'user.banned' ELSE 'user.suspended' END,
    p_reason, p_user_id, new_id::text,
    jsonb_build_object('ends_at', CASE WHEN p_kind = 'suspension' THEN p_ends_at END, 'matches_closed', closed)
  );
  RETURN new_id;
END;
$$;

-- Returns the user id, for the edge function to update the sign-in block.
CREATE OR REPLACE FUNCTION public.admin_lift_restriction(p_restriction_id uuid, p_reason text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.account_restrictions%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM public.account_restrictions WHERE id = p_restriction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'restriction_not_found';
  END IF;
  IF rec.kind = 'warning' THEN
    RAISE EXCEPTION 'warnings_cannot_be_lifted';
  END IF;
  PERFORM public.require_permission(CASE WHEN rec.kind = 'ban' THEN 'users.ban' ELSE 'users.suspend' END::public.app_permission);
  PERFORM public.require_reason(p_reason);

  IF rec.lifted_at IS NULL THEN
    UPDATE public.account_restrictions
    SET lifted_at = now(), lifted_by = auth.uid(), lift_reason = btrim(p_reason)
    WHERE id = p_restriction_id;

    PERFORM public.record_admin_action(
      'user.restriction_lifted', p_reason, rec.user_id, rec.id::text, jsonb_build_object('kind', rec.kind));
  END IF;

  RETURN rec.user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Audit log view
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_audit(p_limit integer DEFAULT 100, p_before bigint DEFAULT NULL)
RETURNS TABLE (
  id bigint,
  created_at timestamptz,
  actor_email text,
  actor_role public.app_role,
  action text,
  target_user_id uuid,
  target_nickname text,
  target_id text,
  reason text,
  details jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_permission('audit.view');

  RETURN QUERY
  SELECT l.id, l.created_at, u.email::text, l.actor_role, l.action, l.target_user_id,
         p.nickname, l.target_id, l.reason, l.details
  FROM public.admin_audit_log l
  LEFT JOIN auth.users u ON u.id = l.actor_id
  LEFT JOIN public.profiles p ON p.id = l.target_user_id
  WHERE p_before IS NULL OR l.id < p_before
  ORDER BY l.id DESC
  LIMIT least(greatest(coalesce(p_limit, 100), 1), 500);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_reports(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_report(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_find_users(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reveal_contact(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_warn_user(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_restrict_account(uuid, text, timestamptz, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_lift_restriction(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_audit(integer, bigint) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_reports(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_find_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reveal_contact(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_warn_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restrict_account(uuid, text, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_lift_restriction(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit(integer, bigint) TO authenticated;

-- ---------------------------------------------------------------------------
-- Match generation: nobody suspended or banned is matched
-- ---------------------------------------------------------------------------
-- Identical to 20261005140000_remove_match.sql except for the two
-- is_account_restricted() lines, one for the person being matched and one for
-- the candidate. The wrappers and grants are unchanged.
CREATE OR REPLACE FUNCTION public.generate_matches_internal(p_only_user uuid)
RETURNS TABLE(matches_created integer, users_processed integer, users_skipped_chat_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  potential_match RECORD;
  matches_created_count INTEGER := 0;
  users_processed_count INTEGER := 0;
  users_skipped_chat_limit_count INTEGER := 0;
  user_day_start TIMESTAMP WITH TIME ZONE;
  candidate_day_start TIMESTAMP WITH TIME ZONE;
  user_live_matches INTEGER;
  user_matches_today INTEGER;
  match_score_calc INTEGER;
  meme_overlap_count INTEGER;
  interest_overlap_count INTEGER;
  language_overlap_count INTEGER;
  prompt_overlap_count INTEGER;
  distance_km NUMERIC;
  cos_calc NUMERIC;
BEGIN
  -- The full hourly pass tidies up first. A single-user run skips it: the
  -- live-match counts below already ignore anything past expires_at, and the
  -- hourly cleanup sends the expiry notifications.
  IF p_only_user IS NULL THEN
    PERFORM public.cleanup_expired_matches_and_inactive_chats();
  END IF;

  FOR user_record IN
    SELECT uo.user_id, uo.mood, uo.selected_memes, p.city, p.region, p.country,
           p.gender, p.sexual_orientation, p.interested_in, p.latitude, p.longitude,
           p.max_distance_preference, p.min_age_preference, p.max_age_preference, p.age,
           p.interests, p.languages_spoken, p.personality_prompts, p.timezone
    FROM public.user_onboarding uo
    JOIN public.profiles p ON uo.user_id = p.id
    WHERE uo.mood IS NOT NULL
      AND uo.mood != 'pending_daily_update'
      AND uo.selected_memes IS NOT NULL
      AND NOT (array_length(uo.selected_memes, 1) = 1 AND uo.selected_memes[1] = 'pending')
      AND uo.perfect_sunday IS NOT NULL
      AND uo.perfect_sunday != 'pending_daily_update'
      AND array_length(uo.selected_memes, 1) > 0
      AND p.is_profile_complete = true
      AND p.gender IS NOT NULL
      AND p.sexual_orientation IS NOT NULL
      AND p.interested_in IS NOT NULL
      AND uo.last_onboarding_date IS NOT NULL
      AND uo.last_onboarding_date >= public.current_onboarding_day(p.timezone)
      AND (p_only_user IS NULL OR uo.user_id = p_only_user)
      AND NOT public.is_account_restricted(uo.user_id)
  LOOP
    users_processed_count := users_processed_count + 1;

    IF public.active_chat_count(user_record.user_id) >= public.max_active_chats() THEN
      users_skipped_chat_limit_count := users_skipped_chat_limit_count + 1;
      CONTINUE;
    END IF;

    user_day_start := public.current_match_day_start(user_record.timezone);

    SELECT
      COUNT(*) FILTER (
        WHERE status = 'active'
          AND COALESCE(chat_request_status, 'none') IN ('none', 'pending')
          AND expires_at > now()
      ),
      COUNT(*) FILTER (
        WHERE matched_on >= user_day_start
          AND status <> 'expired'
      )
    INTO user_live_matches, user_matches_today
    FROM public.matches
    WHERE user_1 = user_record.user_id OR user_2 = user_record.user_id;

    IF user_live_matches >= 2 OR user_matches_today >= 2 THEN
      CONTINUE;
    END IF;

    FOR potential_match IN
      SELECT DISTINCT ON (uo2.user_id)
             uo2.user_id, uo2.mood, uo2.selected_memes, pr2.city, pr2.region, pr2.country,
             pr2.gender, pr2.sexual_orientation, pr2.interested_in, pr2.latitude, pr2.longitude,
             pr2.max_distance_preference, pr2.min_age_preference, pr2.max_age_preference, pr2.age,
             pr2.interests, pr2.languages_spoken, pr2.personality_prompts, pr2.timezone
      FROM public.user_onboarding uo2
      JOIN public.profiles pr2 ON uo2.user_id = pr2.id
      WHERE uo2.user_id != user_record.user_id
        AND uo2.mood IS NOT NULL
        AND uo2.mood != 'pending_daily_update'
        AND uo2.selected_memes IS NOT NULL
        AND NOT (array_length(uo2.selected_memes, 1) = 1 AND uo2.selected_memes[1] = 'pending')
        AND uo2.perfect_sunday IS NOT NULL
        AND uo2.perfect_sunday != 'pending_daily_update'
        AND array_length(uo2.selected_memes, 1) > 0
        AND pr2.is_profile_complete = true
        AND pr2.gender IS NOT NULL
        AND pr2.sexual_orientation IS NOT NULL
        AND pr2.interested_in IS NOT NULL
        AND NOT public.is_account_restricted(uo2.user_id)
        -- Skip pairs that are already matched, or whose match expired / chat
        -- closed or was skipped recently - a "replacement" must be someone
        -- new. A pair where either person removed the other is never matched
        -- again.
        AND NOT EXISTS (
          SELECT 1
          FROM public.matches mx
          WHERE (
            (mx.user_1 = user_record.user_id AND mx.user_2 = uo2.user_id)
            OR
            (mx.user_1 = uo2.user_id AND mx.user_2 = user_record.user_id)
          )
          AND (
            mx.status IN ('active', 'chatting', 'unmatched')
            OR (mx.status IN ('expired', 'inactive', 'skipped') AND mx.updated_at > now() - INTERVAL '7 days')
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.blocked_users bu
          WHERE (bu.blocker_id = user_record.user_id AND bu.blocked_id = uo2.user_id)
             OR (bu.blocker_id = uo2.user_id AND bu.blocked_id = user_record.user_id)
        )
        -- Gender/interest compatibility
        AND (
          (user_record.interested_in = 'men' AND pr2.gender = 'male') OR
          (user_record.interested_in = 'women' AND pr2.gender = 'female') OR
          (user_record.interested_in = 'non_binary' AND pr2.gender = 'non_binary') OR
          (user_record.interested_in = 'everyone')
        )
        AND (
          (pr2.interested_in = 'men' AND user_record.gender = 'male') OR
          (pr2.interested_in = 'women' AND user_record.gender = 'female') OR
          (pr2.interested_in = 'non_binary' AND user_record.gender = 'non_binary') OR
          (pr2.interested_in = 'everyone')
        )
        -- Age preferences
        AND pr2.age >= user_record.min_age_preference
        AND pr2.age <= user_record.max_age_preference
        AND user_record.age >= pr2.min_age_preference
        AND user_record.age <= pr2.max_age_preference
      ORDER BY uo2.user_id, RANDOM()
      LIMIT 30
    LOOP
      -- Distance check
      IF user_record.latitude IS NOT NULL
         AND user_record.longitude IS NOT NULL
         AND potential_match.latitude IS NOT NULL
         AND potential_match.longitude IS NOT NULL THEN
        BEGIN
          cos_calc := cos(radians(user_record.latitude)) *
                     cos(radians(potential_match.latitude)) *
                     cos(radians(potential_match.longitude) - radians(user_record.longitude)) +
                     sin(radians(user_record.latitude)) *
                     sin(radians(potential_match.latitude));

          cos_calc := GREATEST(-1, LEAST(1, cos_calc));
          distance_km := 6371 * acos(cos_calc);

          IF distance_km > user_record.max_distance_preference
             OR distance_km > potential_match.max_distance_preference THEN
            CONTINUE;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          IF user_record.country != potential_match.country THEN
            CONTINUE;
          END IF;
        END;
      ELSE
        IF user_record.country != potential_match.country THEN
          CONTINUE;
        END IF;
      END IF;

      match_score_calc := 0;

      IF user_record.mood = potential_match.mood THEN
        match_score_calc := match_score_calc + 25;
      END IF;

      SELECT COUNT(*) INTO meme_overlap_count
      FROM unnest(user_record.selected_memes) AS meme1
      WHERE meme1 = ANY(potential_match.selected_memes);

      match_score_calc := match_score_calc + LEAST(meme_overlap_count * 10, 40);

      SELECT COUNT(*) INTO interest_overlap_count
      FROM unnest(COALESCE(user_record.interests, '{}'::text[])) AS interest1
      WHERE interest1 = ANY(COALESCE(potential_match.interests, '{}'::text[]));

      match_score_calc := match_score_calc + LEAST(interest_overlap_count * 5, 20);

      SELECT COUNT(*) INTO language_overlap_count
      FROM unnest(COALESCE(user_record.languages_spoken, '{}'::text[])) AS lang1
      WHERE lang1 = ANY(COALESCE(potential_match.languages_spoken, '{}'::text[]));

      match_score_calc := match_score_calc + LEAST(language_overlap_count * 5, 10);

      SELECT COUNT(*) INTO prompt_overlap_count
      FROM jsonb_object_keys(COALESCE(user_record.personality_prompts, '{}'::jsonb)) AS key1
      WHERE key1 IN (
        SELECT jsonb_object_keys(COALESCE(potential_match.personality_prompts, '{}'::jsonb))
      );

      match_score_calc := match_score_calc + LEAST(prompt_overlap_count * 5, 5);

      match_score_calc := LEAST(match_score_calc, 100);

      IF match_score_calc >= 30 THEN
        -- The candidate must be under both limits too, counted on their own day.
        IF public.active_chat_count(potential_match.user_id) >= public.max_active_chats() THEN
          CONTINUE;
        END IF;

        candidate_day_start := public.current_match_day_start(potential_match.timezone);

        SELECT
          COUNT(*) FILTER (
            WHERE status = 'active'
              AND COALESCE(chat_request_status, 'none') IN ('none', 'pending')
              AND expires_at > now()
          ),
          COUNT(*) FILTER (
            WHERE matched_on >= candidate_day_start
              AND status <> 'expired'
          )
        INTO user_live_matches, user_matches_today
        FROM public.matches
        WHERE user_1 = potential_match.user_id OR user_2 = potential_match.user_id;

        IF user_live_matches >= 2 OR user_matches_today >= 2 THEN
          CONTINUE;
        END IF;

        BEGIN
          INSERT INTO public.matches (
            user_1, user_2, matched_on, expires_at, match_score, status, chat_request_status
          ) VALUES (
            LEAST(user_record.user_id, potential_match.user_id),
            GREATEST(user_record.user_id, potential_match.user_id),
            now(),
            now() + INTERVAL '24 hours',
            match_score_calc,
            'active',
            'none'
          );

          matches_created_count := matches_created_count + 1;

          SELECT
            COUNT(*) FILTER (
              WHERE status = 'active'
                AND COALESCE(chat_request_status, 'none') IN ('none', 'pending')
                AND expires_at > now()
            ),
            COUNT(*) FILTER (
              WHERE matched_on >= user_day_start
                AND status <> 'expired'
            )
          INTO user_live_matches, user_matches_today
          FROM public.matches
          WHERE user_1 = user_record.user_id OR user_2 = user_record.user_id;

          IF user_live_matches >= 2 OR user_matches_today >= 2 THEN
            EXIT;
          END IF;
        EXCEPTION WHEN unique_violation THEN
          CONTINUE;
        END;
      END IF;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT matches_created_count, users_processed_count, users_skipped_chat_limit_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.generate_matches_internal(uuid) FROM PUBLIC, anon, authenticated;
