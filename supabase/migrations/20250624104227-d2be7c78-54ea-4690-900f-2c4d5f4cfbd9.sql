
-- Add location columns to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Update the existing location column to be more descriptive
COMMENT ON COLUMN public.profiles.location IS 'Full location string for display purposes';
COMMENT ON COLUMN public.profiles.city IS 'City name from geolocation';
COMMENT ON COLUMN public.profiles.region IS 'State/Region from geolocation';
COMMENT ON COLUMN public.profiles.country IS 'Country from geolocation';
COMMENT ON COLUMN public.profiles.latitude IS 'Latitude coordinate';
COMMENT ON COLUMN public.profiles.longitude IS 'Longitude coordinate';
