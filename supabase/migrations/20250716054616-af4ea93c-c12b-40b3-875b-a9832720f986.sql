-- Add chat request tracking fields to matches table
ALTER TABLE public.matches 
ADD COLUMN chat_request_status TEXT DEFAULT 'none' CHECK (chat_request_status IN ('none', 'pending', 'accepted')),
ADD COLUMN chat_request_sender UUID REFERENCES auth.users(id);

-- Add comment to clarify the fields
COMMENT ON COLUMN public.matches.chat_request_status IS 'Track chat request status: none (no request), pending (request sent), accepted (request accepted)';
COMMENT ON COLUMN public.matches.chat_request_sender IS 'ID of the user who sent the chat request';

-- Update RLS policy to allow updates for chat requests
CREATE POLICY "Users can update chat requests in their matches" 
ON public.matches 
FOR UPDATE 
USING ((auth.uid() = user_1) OR (auth.uid() = user_2));