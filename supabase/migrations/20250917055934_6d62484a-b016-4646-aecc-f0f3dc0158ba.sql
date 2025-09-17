-- Clean up duplicate cron jobs and create proper scheduling
SELECT cron.unschedule('daily-onboarding-trigger');
SELECT cron.unschedule('reset-daily-onboarding-hourly');  
SELECT cron.unschedule('invoke-check-daily-onboarding-hourly');
SELECT cron.unschedule('reset-daily-onboarding');

-- Keep only the generate-daily-matches job but update it for better scheduling
SELECT cron.unschedule('generate-daily-matches');

-- Create optimized cron jobs
SELECT cron.schedule(
  'reset-onboarding-daily',
  '0 6 * * *', -- once daily at 6 AM UTC
  $$
  select
    net.http_post(
        url:='https://iqgrlpstwxzonnjswefa.supabase.co/functions/v1/reset-daily-onboarding',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZ3JscHN0d3h6b25uanN3ZWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODIxODMsImV4cCI6MjA2NDI1ODE4M30.UBwzpebHdKP93RHuesYHG9IPE2ubfVqkihVLHvEdI14"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

SELECT cron.schedule(
  'generate-matches-daily',
  '30 6 * * *', -- once daily at 6:30 AM UTC (after reset)
  $$
  select
    net.http_post(
        url:='https://iqgrlpstwxzonnjswefa.supabase.co/functions/v1/generate-daily-matches',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZ3JscHN0d3h6b25uanN3ZWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODIxODMsImV4cCI6MjA2NDI1ODE4M30.UBwzpebHdKP93RHuesYHG9IPE2ubfVqkihVLHvEdI14"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);