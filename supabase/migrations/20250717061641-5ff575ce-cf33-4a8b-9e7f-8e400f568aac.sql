-- Create trigger to update match interaction when messages are sent
CREATE OR REPLACE FUNCTION public.update_match_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_interaction_at in matches table when a message is sent
  UPDATE public.matches 
  SET last_interaction_at = now()
  WHERE id = NEW.match_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_match_on_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_match_on_message();