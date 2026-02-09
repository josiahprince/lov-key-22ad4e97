
-- Fix the match uniqueness constraint to allow re-matching on different days
-- Current: UNIQUE (user_1, user_2) - too restrictive, prevents same pair ever matching again
-- New approach: Create a unique index using expression casting to date

-- Step 1: Drop the old overly restrictive unique constraint
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_unique_pair;

-- Step 2: Add a regular date column (not generated) for matched_on date
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS matched_date date;

-- Step 3: Populate the new column with existing data
UPDATE public.matches SET matched_date = matched_on::date WHERE matched_date IS NULL;

-- Step 4: Create a trigger to auto-populate matched_date on insert
CREATE OR REPLACE FUNCTION public.set_matched_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.matched_date := NEW.matched_on::date;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS set_matched_date_trigger ON public.matches;
CREATE TRIGGER set_matched_date_trigger
  BEFORE INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_matched_date();

-- Step 5: Create a unique constraint on the pair + date to allow same pair on different days
CREATE UNIQUE INDEX IF NOT EXISTS matches_unique_pair_per_day 
  ON public.matches (LEAST(user_1, user_2), GREATEST(user_1, user_2), matched_date);

-- Step 6: Update generate_daily_matches function to handle same-day uniqueness properly
-- The function already has EXCEPT WHEN unique_violation handling, so it should work
