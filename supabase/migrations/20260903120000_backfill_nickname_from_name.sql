-- Backfill profiles.nickname for rows where it's null/blank but a name is
-- available to derive it from. useMatches.ts/useChats.ts (see
-- src/hooks/useMatches.ts, src/hooks/useChats.ts) now skip any match whose
-- profiles_matched_view row has no nickname, rather than showing the literal
-- placeholder "Unknown User" -- confirmed live against the testkolhi/testnora
-- accounts on 2026-09-03, two of testkolhi's real generate_daily_matches()
-- candidates had a null nickname despite being otherwise-complete, real
-- profiles (is_profile_complete = true), which silently hid them.
--
-- Prefers first_name, falls back to last_name, and only touches rows that
-- currently have no usable nickname -- run any number of times safely.
-- Profiles with neither name field set are left alone (nothing to derive);
-- those still won't surface as a placeholder, per the skip logic above.
UPDATE public.profiles
SET nickname = COALESCE(NULLIF(TRIM(first_name), ''), NULLIF(TRIM(last_name), ''))
WHERE (nickname IS NULL OR TRIM(nickname) = '')
  AND (NULLIF(TRIM(first_name), '') IS NOT NULL OR NULLIF(TRIM(last_name), '') IS NOT NULL);
