-- Create a cron job to trigger daily onboarding at 6:00 AM for users in different timezones
-- This runs every hour and checks which users need their 6:00 AM trigger
SELECT cron.schedule(
  'daily-onboarding-trigger',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://iqgrlpstwxzonnjswefa.supabase.co/functions/v1/daily-onboarding-trigger',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZ3JscHN0d3h6b25uanN3ZWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODIxODMsImV4cCI6MjA2NDI1ODE4M30.UBwzpebHdKP93RHuesYHG9IPE2ubfVqkihVLHvEdI14"}'::jsonb,
        body:='{"trigger": "hourly_check"}'::jsonb
    ) as request_id;
  $$
);