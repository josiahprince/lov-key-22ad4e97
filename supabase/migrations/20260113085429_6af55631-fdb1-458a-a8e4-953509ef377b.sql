-- Fix Issue 1: Drop permissive notification INSERT policy
-- Notifications should only be created by SECURITY DEFINER triggers
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Fix Issue 2: Add message content validation constraint
-- Limit messages to 5000 characters and require non-empty content
ALTER TABLE public.messages ADD CONSTRAINT content_length_check 
  CHECK (length(content) <= 5000 AND length(trim(content)) > 0);