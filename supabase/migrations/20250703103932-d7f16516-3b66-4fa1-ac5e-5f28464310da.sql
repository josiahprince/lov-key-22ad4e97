-- Add age and distance preference columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN min_age_preference integer DEFAULT 18,
ADD COLUMN max_age_preference integer DEFAULT 30,
ADD COLUMN max_distance_preference integer DEFAULT 25;