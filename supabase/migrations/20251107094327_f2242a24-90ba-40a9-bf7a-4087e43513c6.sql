-- Fix search_path for new notification functions
CREATE OR REPLACE FUNCTION public.notify_new_match()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.notify_chat_accepted()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;