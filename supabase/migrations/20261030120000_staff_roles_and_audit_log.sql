-- Staff roles for the admin tools, and an audit log of everything staff do.
--
-- This is the groundwork for a separate admin app. Nothing here changes what
-- members can see or do, and no existing table gets staff access yet: each
-- admin feature (report queue, bans, photo review) will add its own
-- SECURITY DEFINER functions that check authorize() and write to the audit
-- log.
--
-- Roles, least to most power: analyst, support, verifier, moderator, ts_lead,
-- admin, super_admin. A person holds at most one role (user_roles.user_id is
-- the primary key). What each role may do is the role_permissions table, so
-- changing a role's powers is data, not code.
--
-- authorize(permission) reads user_roles itself rather than trusting the
-- login token, so revoking a role takes effect at once instead of when the
-- token expires. It also requires a second factor (aal2): a staff account
-- without MFA has no powers at all.
--
-- custom_access_token_hook() copies the role into the login token as
-- `user_role`, so the admin app knows which screens to show without a query.
-- It only takes effect once switched on in Supabase → Authentication → Hooks
-- → Customize Access Token (JWT) Claims → public.custom_access_token_hook.
-- It runs on every sign-in, members included, so keep it trivial: if it
-- errors, nobody can sign in.
--
-- The first super admins are added by hand in the SQL editor (the change is
-- still written to the audit log):
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'super_admin' FROM auth.users
--   WHERE email IN ('admin@yourdomain', 'breakglass@yourdomain');
-- After that, use grant_staff_role() / revoke_staff_role().
--
-- admin_audit_log is append-only for everyone, the service role and the SQL
-- editor included: a trigger rejects UPDATE, DELETE and TRUNCATE. Like
-- reports, its user ids are not foreign keys, so the record survives account
-- deletion.

CREATE TYPE public.app_role AS ENUM (
  'super_admin', 'admin', 'ts_lead', 'moderator', 'verifier', 'support', 'analyst'
);

CREATE TYPE public.app_permission AS ENUM (
  'reports.view',              -- see the report queue
  'reports.resolve',           -- mark a report reviewed, actioned or dismissed
  'messages.read_reported',    -- read the message snapshot attached to a report
  'photos.review',             -- override the automatic photo check
  'users.view',                -- look up a user, contact details masked
  'users.view_contact',        -- reveal a phone number or email (logged)
  'users.warn',
  'users.suspend',             -- temporary, with an end date
  'users.ban',                 -- permanent
  'appeals.decide',
  'verification.review',       -- selfie / ID checks
  'support.tickets',
  'accounts.request_deletion', -- start a deletion on a user's behalf
  'grievances.handle',         -- Grievance Officer inbox (India IT Rules)
  'legal.requests',            -- law-enforcement and takedown requests
  'data.export',               -- bulk exports
  'settings.manage',           -- app configuration
  'metrics.view',              -- aggregated dashboards only
  'audit.view',
  'roles.manage'               -- grant and revoke staff roles
);

-- ---------------------------------------------------------------------------
-- Who has which role, and what each role may do
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_by uuid, -- NULL when granted from the SQL editor
  granted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.role_permissions (
  role public.app_role NOT NULL,
  permission public.app_permission NOT NULL,
  PRIMARY KEY (role, permission)
);

INSERT INTO public.role_permissions (role, permission)
SELECT 'super_admin', p FROM unnest(enum_range(NULL::public.app_permission)) AS p;

INSERT INTO public.role_permissions (role, permission)
SELECT r::public.app_role, p::public.app_permission
FROM (VALUES
  ('admin', 'reports.view'), ('admin', 'reports.resolve'), ('admin', 'photos.review'),
  ('admin', 'users.view'), ('admin', 'users.warn'), ('admin', 'users.suspend'),
  ('admin', 'support.tickets'), ('admin', 'accounts.request_deletion'),
  ('admin', 'settings.manage'), ('admin', 'metrics.view'), ('admin', 'audit.view'),

  ('ts_lead', 'reports.view'), ('ts_lead', 'reports.resolve'), ('ts_lead', 'messages.read_reported'),
  ('ts_lead', 'photos.review'), ('ts_lead', 'users.view'), ('ts_lead', 'users.view_contact'),
  ('ts_lead', 'users.warn'), ('ts_lead', 'users.suspend'), ('ts_lead', 'users.ban'),
  ('ts_lead', 'appeals.decide'), ('ts_lead', 'verification.review'),
  ('ts_lead', 'grievances.handle'), ('ts_lead', 'legal.requests'), ('ts_lead', 'audit.view'),

  ('moderator', 'reports.view'), ('moderator', 'reports.resolve'), ('moderator', 'messages.read_reported'),
  ('moderator', 'photos.review'), ('moderator', 'users.view'), ('moderator', 'users.warn'),
  ('moderator', 'users.suspend'),

  ('verifier', 'verification.review'),

  ('support', 'users.view'), ('support', 'support.tickets'), ('support', 'accounts.request_deletion'),

  ('analyst', 'metrics.view')
) AS t(r, p);

-- Clients only ever read these tables; every change goes through the
-- functions below or the SQL editor.
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- authorize()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.authorize(p_permission public.app_permission)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      WHERE ur.user_id = auth.uid()
        AND rp.permission = p_permission
    );
$$;

REVOKE EXECUTE ON FUNCTION public.authorize(public.app_permission) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.authorize(public.app_permission) TO authenticated;

-- Staff see their own role and its permissions, so the admin app can tell a
-- signed-in staff member what they may do (and that MFA is still needed).
CREATE POLICY "Staff can view their own role"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.authorize('roles.manage'));

CREATE POLICY "Staff can view their role's permissions"
ON public.role_permissions FOR SELECT TO authenticated
USING (
  role = (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  OR public.authorize('roles.manage')
);

-- ---------------------------------------------------------------------------
-- Login token hook
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  staff_role public.app_role;
BEGIN
  SELECT ur.role INTO staff_role
  FROM public.user_roles ur
  WHERE ur.user_id = (event ->> 'user_id')::uuid;

  -- Members' tokens are left exactly as they were.
  IF staff_role IS NOT NULL THEN
    event := jsonb_set(event, '{claims,user_role}', to_jsonb(staff_role));
  END IF;

  RETURN event;
END;
$$;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_roles TO supabase_auth_admin;

CREATE POLICY "Auth can read roles for the login token"
ON public.user_roles FOR SELECT TO supabase_auth_admin
USING (true);

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
CREATE TABLE public.admin_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid,                -- NULL = SQL editor or service role
  actor_role public.app_role,
  action text NOT NULL,         -- e.g. 'role.granted', 'user.banned'
  target_user_id uuid,
  target_id text,               -- the report, photo, appeal... acted on
  reason text NOT NULL CHECK (length(btrim(reason)) > 0),
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_audit_log IS
  'Append-only record of staff actions. Ids are deliberately NOT foreign keys so entries survive account deletion.';

CREATE INDEX idx_admin_audit_log_created ON public.admin_audit_log (created_at DESC);
CREATE INDEX idx_admin_audit_log_target ON public.admin_audit_log (target_user_id);
CREATE INDEX idx_admin_audit_log_actor ON public.admin_audit_log (actor_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff with audit access can view the log"
ON public.admin_audit_log FOR SELECT TO authenticated
USING (public.authorize('audit.view'));

CREATE OR REPLACE FUNCTION public.reject_audit_log_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log_is_append_only';
END;
$$;

CREATE TRIGGER admin_audit_log_append_only
  BEFORE UPDATE OR DELETE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.reject_audit_log_change();

CREATE TRIGGER admin_audit_log_no_truncate
  BEFORE TRUNCATE ON public.admin_audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION public.reject_audit_log_change();

-- Writes one entry as the calling user. For other SQL functions only:
-- clients can't call it, so staff can't write entries of their own choosing.
CREATE OR REPLACE FUNCTION public.record_admin_action(
  p_action text,
  p_reason text,
  p_target_user_id uuid DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entry_id bigint;
BEGIN
  INSERT INTO public.admin_audit_log (actor_id, actor_role, action, target_user_id, target_id, reason, details)
  VALUES (
    auth.uid(),
    (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = auth.uid()),
    p_action, p_target_user_id, p_target_id, p_reason, p_details
  )
  RETURNING id INTO entry_id;
  RETURN entry_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_admin_action(text, text, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Every role change is logged, however it was made. grant_staff_role() and
-- revoke_staff_role() pass their reason through the transaction-local setting
-- lovkey.audit_reason.
CREATE OR REPLACE FUNCTION public.log_user_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  change_reason text := nullif(btrim(coalesce(current_setting('lovkey.audit_reason', true), '')), '');
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF change_reason IS NULL AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = OLD.user_id) THEN
      change_reason := 'Account deleted';
    END IF;
    PERFORM public.record_admin_action(
      'role.revoked',
      coalesce(change_reason, 'Changed directly in the database'),
      OLD.user_id, NULL,
      jsonb_build_object('role', OLD.role)
    );
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  PERFORM public.record_admin_action(
    CASE WHEN TG_OP = 'INSERT' THEN 'role.granted' ELSE 'role.changed' END,
    coalesce(change_reason, 'Changed directly in the database'),
    NEW.user_id, NULL,
    CASE WHEN TG_OP = 'INSERT'
      THEN jsonb_build_object('role', NEW.role)
      ELSE jsonb_build_object('from', OLD.role, 'to', NEW.role)
    END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_user_role_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_user_role_change();

-- ---------------------------------------------------------------------------
-- Granting and revoking roles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_staff_role(
  p_user_id uuid,
  p_role public.app_role,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.authorize('roles.manage') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF coalesce(btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  -- Moving the last super admin to a lower role would leave nobody able to
  -- manage roles from the admin app.
  IF p_role <> 'super_admin'
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'super_admin')
    AND (SELECT count(*) FROM public.user_roles WHERE role = 'super_admin') = 1
  THEN
    RAISE EXCEPTION 'last_super_admin';
  END IF;

  PERFORM set_config('lovkey.audit_reason', p_reason, true);

  INSERT INTO public.user_roles (user_id, role, granted_by, granted_at)
  VALUES (p_user_id, p_role, auth.uid(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role, granted_by = EXCLUDED.granted_by, granted_at = EXCLUDED.granted_at
    WHERE public.user_roles.role IS DISTINCT FROM EXCLUDED.role;

  PERFORM set_config('lovkey.audit_reason', '', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_staff_role(p_user_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.authorize('roles.manage') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF coalesce(btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'super_admin')
    AND (SELECT count(*) FROM public.user_roles WHERE role = 'super_admin') = 1
  THEN
    RAISE EXCEPTION 'last_super_admin';
  END IF;

  PERFORM set_config('lovkey.audit_reason', p_reason, true);
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  PERFORM set_config('lovkey.audit_reason', '', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_staff_role(uuid, public.app_role, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_staff_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_staff_role(uuid, public.app_role, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_staff_role(uuid, text) TO authenticated;

-- Internal trigger functions are never called directly.
REVOKE EXECUTE ON FUNCTION public.log_user_role_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_audit_log_change() FROM PUBLIC, anon, authenticated;
