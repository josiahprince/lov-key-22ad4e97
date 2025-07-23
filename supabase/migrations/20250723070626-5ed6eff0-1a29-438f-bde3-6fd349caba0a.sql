-- Remove the existing cron job for daily match generation
SELECT cron.unschedule('daily-match-generation');