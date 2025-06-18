
-- Create a table to store user descriptions
CREATE TABLE public.user_descriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_descriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for user descriptions
CREATE POLICY "Users can view their own descriptions" 
  ON public.user_descriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own descriptions" 
  ON public.user_descriptions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own descriptions" 
  ON public.user_descriptions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own descriptions" 
  ON public.user_descriptions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create a unique index to ensure one description per user
CREATE UNIQUE INDEX idx_user_descriptions_user_id ON public.user_descriptions(user_id);
