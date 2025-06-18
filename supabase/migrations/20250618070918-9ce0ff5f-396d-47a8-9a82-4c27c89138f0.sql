
-- Create a table to store photo metadata and maintain photo state
CREATE TABLE public.user_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  photo_slot INTEGER NOT NULL CHECK (photo_slot >= 1 AND photo_slot <= 6),
  is_main BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, photo_slot)
);

-- Enable RLS on user_photos table
ALTER TABLE public.user_photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_photos
CREATE POLICY "Users can view their own photos"
ON public.user_photos
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own photos"
ON public.user_photos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos"
ON public.user_photos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
ON public.user_photos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create function to ensure only one main photo per user
CREATE OR REPLACE FUNCTION public.ensure_single_main_photo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_main = TRUE THEN
    UPDATE public.user_photos 
    SET is_main = FALSE 
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure only one main photo
CREATE TRIGGER trigger_ensure_single_main_photo
  BEFORE INSERT OR UPDATE ON public.user_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_main_photo();
