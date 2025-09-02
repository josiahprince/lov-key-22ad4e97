-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily onboarding reset to run every hour
SELECT cron.schedule(
  'reset-daily-onboarding',
  '0 * * * *', -- Run every hour
  $$
  SELECT net.http_post(
    url := 'https://iqgrlpstwxzonnjswefa.supabase.co/functions/v1/reset-daily-onboarding',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZ3JscHN0d3h6b25uanN3ZWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODIxODMsImV4cCI6MjA2NDI1ODE4M30.UBwzpebHdKP93RHuesYHG9IPE2ubfVqkihVLHvEdI14"}'::jsonb
  ) as request_id;
  $$
);

-- Schedule daily match generation to run every 6 hours
SELECT cron.schedule(
  'generate-daily-matches',
  '0 */6 * * *', -- Run every 6 hours
  $$
  SELECT net.http_post(
    url := 'https://iqgrlpstwxzonnjswefa.supabase.co/functions/v1/generate-daily-matches',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZ3JscHN0d3h6b25uanN3ZWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODIxODMsImV4cCI6MjA2NDI1ODE4M30.UBwzpebHdKP93RHuesYHG9IPE2ubfVqkihVLHvEdI14"}'::jsonb
  ) as request_id;
  $$
);