-- Reports must outlive the accounts they involve. Both id columns were
-- REFERENCES auth.users ON DELETE CASCADE (20260828142000_...sql), so the
-- delete-account edge function erased every report a user filed or received
-- (including the message_snapshot evidence) along with their login. A
-- reported user could destroy the evidence just by deleting their account.
--
-- The columns stay NOT NULL uuid. They simply stop being foreign keys, so the
-- id remains as a pseudonymous reference once the auth user is gone.
-- match_id is already ON DELETE SET NULL, and message_snapshot holds the
-- evidence, so nothing else needs to change.
--
-- blocked_users is deliberately left cascading: a block only stops a pair
-- being matched, and a deleted account's uuid is never reused.
--
-- Constraint names are Postgres's defaults for the inline REFERENCES in the
-- original CREATE TABLE.
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reported_id_fkey;

COMMENT ON TABLE public.reports IS
  'User reports. reporter_id/reported_id are deliberately NOT foreign keys so reports survive account deletion - do not re-add ON DELETE CASCADE.';
