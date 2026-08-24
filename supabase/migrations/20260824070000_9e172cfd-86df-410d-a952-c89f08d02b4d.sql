-- Move daily match generation from 6:30 AM UTC to exactly 6:00 AM UTC.
-- Daily cap (2/day) and per-user timezone handling are unchanged --
-- this remains a single fixed UTC time for all users, not per-user local.
-- cron.schedule() upserts by job name, so this updates the existing
-- 'generate-daily-matches-db' job in place rather than creating a duplicate.

SELECT cron.schedule(
  'generate-daily-matches-db',
  '0 6 * * *',
  $$SELECT public.generate_daily_matches();$$
);
