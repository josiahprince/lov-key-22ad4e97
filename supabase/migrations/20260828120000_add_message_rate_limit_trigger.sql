-- Enforce the 15-second-per-conversation message rate limit server-side.
-- The client (ChatScreen.tsx) already gates this via local state, but that's
-- trivially bypassable (direct sendMessage()/insert() calls skip it), so the
-- real limit needs to live in the DB. Scoped per (match_id, sender_id) so it
-- only throttles a user's own consecutive messages within one conversation -
-- it never blocks normal back-and-forth between two people, or messaging a
-- different match right after this one.
CREATE OR REPLACE FUNCTION public.enforce_message_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  last_sent_at TIMESTAMPTZ;
BEGIN
  SELECT MAX(created_at) INTO last_sent_at
  FROM public.messages
  WHERE match_id = NEW.match_id
    AND sender_id = NEW.sender_id;

  IF last_sent_at IS NOT NULL AND NEW.created_at - last_sent_at < INTERVAL '15 seconds' THEN
    RAISE EXCEPTION 'rate_limit_exceeded: wait a moment before sending another message';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_message_rate_limit_trigger
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_message_rate_limit();
