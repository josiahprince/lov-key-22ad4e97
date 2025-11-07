-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('new_match', 'chat_accepted')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create notification for new match
CREATE OR REPLACE FUNCTION public.notify_new_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notifications for newly created matches
  IF TG_OP = 'INSERT' THEN
    -- Notify user_1
    INSERT INTO public.notifications (user_id, type, title, message, match_id)
    VALUES (
      NEW.user_1,
      'new_match',
      'New Match! 🎉',
      'You have a new match! Check them out and start chatting.',
      NEW.id
    );
    
    -- Notify user_2
    INSERT INTO public.notifications (user_id, type, title, message, match_id)
    VALUES (
      NEW.user_2,
      'new_match',
      'New Match! 🎉',
      'You have a new match! Check them out and start chatting.',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification when chat is accepted
CREATE OR REPLACE FUNCTION public.notify_chat_accepted()
RETURNS TRIGGER AS $$
DECLARE
  other_user_id UUID;
BEGIN
  -- Only notify when chat request status changes to 'accepted'
  IF OLD.chat_request_status != 'accepted' AND NEW.chat_request_status = 'accepted' THEN
    -- Determine who to notify (the one who sent the request)
    IF NEW.chat_request_sender IS NOT NULL THEN
      other_user_id := NEW.chat_request_sender;
      
      -- Create notification for the sender
      INSERT INTO public.notifications (user_id, type, title, message, match_id)
      VALUES (
        other_user_id,
        'chat_accepted',
        'Chat Request Accepted! 💬',
        'Your chat request was accepted! Start the conversation now.',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER trigger_notify_new_match
  AFTER INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_match();

CREATE TRIGGER trigger_notify_chat_accepted
  AFTER UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chat_accepted();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;