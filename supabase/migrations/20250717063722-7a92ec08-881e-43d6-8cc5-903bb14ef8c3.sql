-- Fix the RLS policy for messages to allow chatting status
DROP POLICY "Users can send messages in accepted chats" ON public.messages;

CREATE POLICY "Users can send messages in accepted chats" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.matches m 
    WHERE m.id = match_id 
    AND (m.user_1 = auth.uid() OR m.user_2 = auth.uid())
    AND m.status IN ('active', 'chatting')  -- Allow both active and chatting status
    AND m.chat_request_status = 'accepted'
  )
);