-- Create cron job to run the daily onboarding reset function every hour
-- This ensures users get their daily onboarding at 6:00 AM in their timezone

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing cron job if it exists
SELECT cron.unschedule('reset-daily-onboarding-hourly');

-- Schedule the reset function to run every hour
-- This will check all users and reset their onboarding flags if it's after 6 AM in their timezone
SELECT cron.schedule(
  'reset-daily-onboarding-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://iqgrlpstwxzonnjswefa.supabase.co/functions/v1/reset-daily-onboarding',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZ3JscHN0d3h6b25uanN3ZWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODIxODMsImV4cCI6MjA2NDI1ODE4M30.UBwzpebHdKP93RHuesYHG9IPE2ubfVqkihVLHvEdI14"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);