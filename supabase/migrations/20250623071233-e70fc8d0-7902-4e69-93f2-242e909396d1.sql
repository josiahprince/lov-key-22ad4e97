
-- Create a table to store user onboarding responses
CREATE TABLE public.user_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mood TEXT NOT NULL,
  selected_memes TEXT[] NOT NULL,
  perfect_sunday TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) to ensure users can only see their own data
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to SELECT their own onboarding data
CREATE POLICY "Users can view their own onboarding data" 
  ON public.user_onboarding 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy that allows users to INSERT their own onboarding data
CREATE POLICY "Users can create their own onboarding data" 
  ON public.user_onboarding 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy that allows users to UPDATE their own onboarding data
CREATE POLICY "Users can update their own onboarding data" 
  ON public.user_onboarding 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy that allows users to DELETE their own onboarding data
CREATE POLICY "Users can delete their own onboarding data" 
  ON public.user_onboarding 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create an index for better performance
CREATE INDEX idx_user_onboarding_user_id ON public.user_onboarding(user_id);
