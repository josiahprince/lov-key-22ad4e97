-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to trigger daily match generation at 9:00 AM UTC
-- This will run every day at 9 AM UTC
SELECT cron.schedule(
  'daily-match-generation',
  '0 9 * * *', -- 9:00 AM UTC every day
  $$
  SELECT
    net.http_post(
        url:='https://iqgrlpstwxzonnjswefa.supabase.co/functions/v1/daily-match-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZ3JscHN0d3h6b25uanN3ZWZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY4MjE4MywiZXhwIjoyMDY0MjU4MTgzfQ.kJjCFW7dRdO4XHR8DYOiEQwKEg5-6yI_B4kF4dQtI7E"}'::jsonb,
        body:='{"trigger": "cron", "time": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);