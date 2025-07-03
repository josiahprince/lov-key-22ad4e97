-- Add new columns to profiles table for interests, personality prompts, and languages
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS interests TEXT[],
ADD COLUMN IF NOT EXISTS personality_prompts JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS languages_spoken TEXT[];

-- Add some sample interests if needed
COMMENT ON COLUMN public.profiles.interests IS 'Array of user interests/hobbies like music, travel, pets, etc.';
COMMENT ON COLUMN public.profiles.personality_prompts IS 'JSON object storing personality Q&As like "Two truths and a lie"';
COMMENT ON COLUMN public.profiles.languages_spoken IS 'Array of languages the user speaks';