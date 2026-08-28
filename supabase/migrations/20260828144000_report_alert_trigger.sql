-- Email-alert the developer within minutes of any new report so the
-- Apple Guideline 1.2 / Google Play UGC 24-hour response SLA can be met
-- without polling the Supabase dashboard. Mirrors the existing
-- cron -> net.http_post -> edge function pattern used for
-- generate-daily-matches/reset-daily-onboarding (20250902103436_...sql),
-- but row-triggered instead of time-scheduled, and matches the trigger
-- style of notify_new_message() (20260828130000_notify_new_message.sql).
--
-- SECURITY NOTE: the anon key used elsewhere in this repo's cron migrations
-- is public (shipped in the client bundle), so it alone can't authorize
-- this call -- anyone could otherwise spam Resend/the developer's inbox by
-- hitting the function URL directly. A separate webhook secret (below) is
-- required in a custom header and checked independently by the edge
-- function against its own Supabase secret.
--
-- REQUIRED MANUAL STEP before this migration is safe to run: the value
-- below must also be set via
-- `supabase secrets set REPORT_ALERT_WEBHOOK_SECRET=0faceeb51e5fc94fd9882957e65507185abe6c59a2b89747374e5e029bef9bb6`
-- (same random value, generated once for this feature -- rotate it if it's
-- ever suspected to have leaked, updating both this migration and the
-- Supabase secret together).
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_report_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://iqgrlpstwxzonnjswefa.supabase.co/functions/v1/notify-report-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '0faceeb51e5fc94fd9882957e65507185abe6c59a2b89747374e5e029bef9bb6'
    ),
    body := jsonb_build_object(
      'report_id', NEW.id,
      'reporter_id', NEW.reporter_id,
      'reported_id', NEW.reported_id,
      'reason', NEW.reason,
      'details', NEW.details,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_report_alert
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_report_alert();
