-- Notify a user when they receive a new message. Debounced per conversation:
-- only inserts a new notification if there isn't already an unread
-- 'new_message' notification for this (user, match) pair, so an active
-- back-and-forth conversation doesn't spam the notification list - the next
-- one only fires after the existing one is marked read.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('new_match', 'chat_accepted', 'new_message'));

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = NEW.receiver_id
      AND match_id = NEW.match_id
      AND type = 'new_message'
      AND is_read = false
  ) THEN
    INSERT INTO public.notifications (user_id, type, title, message, match_id)
    VALUES (
      NEW.receiver_id,
      'new_message',
      'New Message 💌',
      'You have a new message! Check it out.',
      NEW.match_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();
