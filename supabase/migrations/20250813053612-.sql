-- 1) Ensure required extensions exist
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 2) Align profiles.timezone column with requirements (no default timezone)
alter table if exists public.profiles
  alter column timezone drop default;

-- 3) Indexes for efficient daily queries
create index if not exists idx_profiles_timezone on public.profiles (timezone);
create index if not exists idx_user_onboarding_user_id on public.user_onboarding (user_id);
create index if not exists idx_user_onboarding_last_date_shown on public.user_onboarding (last_onboarding_date, onboarding_shown_today);
create index if not exists idx_user_onboarding_user_last_date on public.user_onboarding (user_id, last_onboarding_date);
create index if not exists idx_matches_users_status_dates on public.matches (user_1, user_2, matched_on, expires_at, status, chat_request_status);

-- 4) Hourly cron to invoke the edge function check-daily-onboarding
-- Unschedule previous job if it exists to avoid duplicates
DO $$
BEGIN
  PERFORM cron.unschedule('invoke-check-daily-onboarding-hourly');
EXCEPTION WHEN OTHERS THEN
  -- ignore if it didn't exist
  NULL;
END $$;

select
  cron.schedule(
    'invoke-check-daily-onboarding-hourly',
    '0 * * * *', -- every hour at minute 0
    $$
    select
      net.http_post(
          url := 'https://iqgrlpstwxzonnjswefa.supabase.co/functions/v1/check-daily-onboarding',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZ3JscHN0d3h6b25uanN3ZWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODIxODMsImV4cCI6MjA2NDI1ODE4M30.UBwzpebHdKP93RHuesYHG9IPE2ubfVqkihVLHvEdI14'
          ),
          body := jsonb_build_object('triggered_at', now())
      ) as request_id;
    $$
  );