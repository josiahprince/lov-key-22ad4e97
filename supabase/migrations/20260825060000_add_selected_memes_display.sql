-- Persist the exact {id, title, emoji} the user picked at onboarding time.
-- selected_memes (ids only) stays as-is for generate_daily_matches' array
-- intersection scoring; this column lets the UI show the real text/emoji
-- the user saw, since cultural vibes are AI-generated per country and only
-- cached client-side (not reconstructible later from the id alone).
ALTER TABLE public.user_onboarding
  ADD COLUMN selected_memes_display JSONB;
