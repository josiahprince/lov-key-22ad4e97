-- Keep the daily onboarding fresh.
--
-- 1. Question of the week. The fixed "Describe your perfect Sunday" becomes a
--    rotating question that everyone answers in the same week. Weeks start on
--    Monday of the onboarding day (06:00 local rollover, see
--    current_onboarding_day()). The answer still lives in
--    user_onboarding.perfect_sunday, so generate_daily_matches() and its
--    'pending_daily_update' filters stay untouched. The question is recorded
--    alongside it as prompt_id + prompt_question, a snapshot of the text the
--    user actually answered, same idea as selected_memes_display.
--
-- 2. Shared weekly vibe sets. Vibes used to be generated per device, with
--    positional ids (vibe1..vibe15), so two users' "vibe3" could be
--    completely different vibes and the overlap score in
--    generate_daily_matches() was meaningless. The generate-cultural-vibes
--    edge function now generates one set per country per week, stores it
--    here, and gives vibes slug ids derived from their titles.

-- ---------------------------------------------------------------------------
-- Question of the week
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_prompts (
  id text PRIMARY KEY,
  question text NOT NULL,
  placeholder text NOT NULL DEFAULT '',
  sort integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read onboarding prompts" ON public.onboarding_prompts;
CREATE POLICY "Authenticated users can read onboarding prompts"
  ON public.onboarding_prompts
  FOR SELECT
  TO authenticated
  USING (true);

-- Order is the rotation order. perfect-sunday is first so the week this ships
-- (starting 2026-09-28) keeps the question people already answered.
INSERT INTO public.onboarding_prompts (id, question, placeholder, sort) VALUES
  ('perfect-sunday', 'Describe your perfect Sunday', 'Maybe sleeping in, reading a book, trying a new recipe, or exploring a local market...', 1),
  ('comfort-food', 'What''s your ultimate comfort food, and when do you reach for it?', 'Maggi at 2 AM, my mum''s rajma chawal, anything with cheese...', 2),
  ('small-joy', 'What small thing made you smile this week?', 'A stranger''s dog, a perfectly timed song, finally fixing my sleep...', 3),
  ('hidden-talent', 'What''s a talent of yours that people wouldn''t guess?', 'I can name any song in three notes, I fold a mean fitted sheet...', 4),
  ('dream-trip', 'If you could leave for a trip tomorrow, where would you go?', 'A quiet hill station, a food crawl in Tokyo, a beach with no Wi-Fi...', 5),
  ('green-flag', 'What''s a green flag you always notice in people?', 'They''re kind to waiters, they remember small details...', 6),
  ('first-date', 'Describe your idea of a great first date', 'Street food and a long walk, a board game café, a sunset spot...', 7),
  ('guilty-pleasure', 'What''s your most harmless guilty pleasure?', 'Reality shows, pineapple on pizza, rewatching the same sitcom...', 8),
  ('learning-now', 'What are you trying to get better at right now?', 'Cooking without a recipe, running 5k, saying no...', 9),
  ('unpopular-opinion', 'Share an unpopular opinion you''ll happily defend', 'Mornings are the best part of the day, sequels can be better...', 10),
  ('rainy-day', 'How do you spend a rainy day?', 'Chai, pakoras and a window seat, a movie marathon, a nap...', 11),
  ('song-on-repeat', 'What song is on repeat for you lately, and why?', 'It reminds me of a road trip, the beat just hits...', 12),
  ('best-advice', 'What''s the best advice anyone ever gave you?', 'Done is better than perfect, call your parents more...', 13),
  ('childhood-memory', 'What''s a childhood memory that still makes you happy?', 'Summer holidays at my grandparents'', my first cycle...', 14),
  ('weekend-plan', 'What''s your ideal plan for a free Saturday night?', 'House party, quiet dinner, night drive, early night...', 15),
  ('proudest-moment', 'What''s something you''re quietly proud of?', 'Learning to swim as an adult, a friendship I kept going...', 16),
  ('superpower', 'If you could have one everyday superpower, what would it be?', 'Never being stuck in traffic, always finding parking...', 17),
  ('perfect-evening', 'Describe a perfect evening in', 'Home-cooked dinner, a good book, a long call with a friend...', 18),
  ('bucket-list', 'What''s one thing on your bucket list?', 'See the northern lights, run a marathon, learn to dance...', 19),
  ('love-language', 'How do you like to show someone you care?', 'Cooking for them, sending memes, remembering the little things...', 20),
  ('last-laugh', 'What made you laugh really hard recently?', 'A meme, my friend''s terrible joke, my own clumsiness...', 21),
  ('home-town', 'What''s one thing you''d show a visitor in your city?', 'The best chaat stall, a secret viewpoint, the old market...', 22),
  ('morning-ritual', 'What does your ideal morning look like?', 'Filter coffee, a walk, reading the news, snoozing five times...', 23),
  ('fav-festival', 'What''s your favourite festival or celebration, and why?', 'The food, the lights, the family chaos...', 24),
  ('dealbreaker-funny', 'What''s a funny (non-serious) dealbreaker for you?', 'Doesn''t like dogs, puts ketchup on everything...', 25),
  ('next-adventure', 'What''s the next adventure you''re planning?', 'A solo trip, a new hobby, finally learning to cook...', 26)
ON CONFLICT (id) DO NOTHING;

-- Monday of the current onboarding week in the user's timezone.
CREATE OR REPLACE FUNCTION public.current_week_start(user_timezone text)
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT date_trunc('week', public.current_onboarding_day(user_timezone))::date;
$function$;

-- The same question for everyone in a given week. The rotation is anchored to
-- 2026-09-28 (the week this ships) so that week is perfect-sunday. Adding or
-- deactivating prompts reshuffles the rotation from that point, which is fine.
CREATE OR REPLACE FUNCTION public.current_weekly_prompt(user_timezone text)
RETURNS SETOF public.onboarding_prompts
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  WITH active_count AS (
    SELECT GREATEST(COUNT(*), 1)::integer AS n
    FROM public.onboarding_prompts
    WHERE active
  ),
  week_index AS (
    SELECT ((public.current_week_start(user_timezone) - DATE '2026-09-28') / 7) AS w
  )
  SELECT p.*
  FROM public.onboarding_prompts p
  WHERE p.active
  ORDER BY p.sort, p.id
  OFFSET (SELECT ((w % n) + n) % n FROM week_index, active_count)
  LIMIT 1;
$function$;

ALTER TABLE public.user_onboarding
  ADD COLUMN IF NOT EXISTS prompt_id text REFERENCES public.onboarding_prompts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prompt_question text;

COMMENT ON COLUMN public.user_onboarding.perfect_sunday IS
  'Answer to the question of the week (prompt_question). Name kept from when the question was always "Describe your perfect Sunday".';

UPDATE public.user_onboarding
SET prompt_id = 'perfect-sunday',
    prompt_question = 'Describe your perfect Sunday'
WHERE prompt_id IS NULL;

-- ---------------------------------------------------------------------------
-- Shared weekly vibe sets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vibe_sets (
  country text NOT NULL,
  week_start date NOT NULL,
  vibes jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (country, week_start)
);

ALTER TABLE public.vibe_sets ENABLE ROW LEVEL SECURITY;

-- Read-only for users. Rows are only written by the generate-cultural-vibes
-- edge function with the service role, which bypasses RLS.
DROP POLICY IF EXISTS "Authenticated users can read vibe sets" ON public.vibe_sets;
CREATE POLICY "Authenticated users can read vibe sets"
  ON public.vibe_sets
  FOR SELECT
  TO authenticated
  USING (true);
