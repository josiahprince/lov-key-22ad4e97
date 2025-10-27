-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to cleanup expired matches and inactive chats every hour
SELECT cron.schedule(
  'cleanup-expired-matches-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://iqgrlpstwxzonnjswefa.supabase.co/functions/v1/cleanup-expired-matches',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZ3JscHN0d3h6b25uanN3ZWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODIxODMsImV4cCI6MjA2NDI1ODE4M30.UBwzpebHdKP93RHuesYHG9IPE2ubfVqkihVLHvEdI14"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);