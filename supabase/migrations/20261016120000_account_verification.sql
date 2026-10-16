-- New accounts must confirm a mobile number and an email before they can
-- finish their profile, and so before they can be matched or chat
-- (generate_matches_internal() only picks profiles with is_profile_complete).
--
-- The app asks for both (AuthScreen, then VerifyAccountScreen), but the sign-up
-- API is public: someone could create an email-only account straight through
-- it. This trigger is what actually stops that account from going live.
--
-- Accounts created before verification_required_from() were auto-confirmed
-- test accounts and are left alone.
--
-- Client: src/lib/accountVerification.ts (VERIFICATION_REQUIRED_FROM must
-- match the date below).

CREATE OR REPLACE FUNCTION public.verification_required_from()
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT timestamptz '2026-10-16 00:00:00+00';
$$;

CREATE OR REPLACE FUNCTION public.guard_profile_verification()
RETURNS trigger
LANGUAGE plpgsql
-- Reads auth.users, which clients can't.
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Server-side code (service role, SQL editor, the sign-up trigger) is trusted.
  IF coalesce(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Only the moment a profile becomes complete is checked.
  IF NEW.is_profile_complete IS NOT TRUE
     OR (TG_OP = 'UPDATE' AND OLD.is_profile_complete IS TRUE) THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = NEW.id
      AND (
        u.created_at < public.verification_required_from()
        OR (u.phone_confirmed_at IS NOT NULL AND u.email_confirmed_at IS NOT NULL)
      )
  ) THEN
    RAISE EXCEPTION 'account_not_verified';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_verification_trigger ON public.profiles;
CREATE TRIGGER guard_profile_verification_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_verification();
