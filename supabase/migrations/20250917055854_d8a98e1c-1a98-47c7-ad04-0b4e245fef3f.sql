-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to reset daily onboarding every hour
SELECT cron.schedule(
  'reset-daily-onboarding-hourly',
  '0 * * * *', -- every hour at minute 0
  $$
  select
    net.http_post(
        url:='https://iqgrlpstwxzonnjswefa.supabase.co/functions/v1/reset-daily-onboarding',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZ3JscHN0d3h6b25uanN3ZWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODIxODMsImV4cCI6MjA2NDI1ODE4M30.UBwzpebHdKP93RHuesYHG9IPE2ubfVqkihVLHvEdI14"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Create a cron job to generate daily matches every 6 hours
SELECT cron.schedule(
  'generate-daily-matches',
  '0 6,12,18,0 * * *', -- every 6 hours
  $$
  select
    net.http_post(
        url:='https://iqgrlpstwxzonnjswefa.supabase.co/functions/v1/generate-daily-matches',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZ3JscHN0d3h6b25uanN3ZWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODIxODMsImV4cCI6MjA2NDI1ODE4M30.UBwzpebHdKP93RHuesYHG9IPE2ubfVqkihVLHvEdI14"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);