-- Mutual, opt-in photo reveal.
--
-- Replaces the old unilateral rule (60 messages exchanged => photos unblur
-- for both people automatically) with a consent handshake: when a pair hits
-- the round's message threshold, each person is asked whether to reveal
-- photos now or wait. Photos unblur only when BOTH choose to reveal. If
-- either chooses to wait, the round advances and the pair must exchange
-- another 30 messages before being asked again, repeating until both agree.
--
-- The state deliberately lives in its own table rather than as columns on
-- matches: matches carries a blanket "Users can update chat requests in
-- their matches" UPDATE policy (20250716054616-af4ea93c-...sql) with no
-- column restriction, so a participant can PATCH any column of their own
-- match row straight through PostgREST. A reveal flag stored there would be
-- self-grantable, which defeats the entire point of requiring mutual
-- consent. photo_reveals instead has RLS enabled with NO policies at all, so
-- `authenticated` can neither read nor write it directly - every access goes
-- through the SECURITY DEFINER functions below, which enforce match
-- participation, the message threshold, and the both-must-agree rule.

CREATE TABLE public.photo_reveals (
  match_id uuid NOT NULL PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
  round integer NOT NULL DEFAULT 1,
  user_1_choice text,
  user_2_choice text,
  revealed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT photo_reveals_round_positive CHECK (round >= 1),
  CONSTRAINT photo_reveals_user_1_choice_valid CHECK (user_1_choice IN ('reveal', 'wait')),
  CONSTRAINT photo_reveals_user_2_choice_valid CHECK (user_2_choice IN ('reveal', 'wait'))
);

ALTER TABLE public.photo_reveals ENABLE ROW LEVEL SECURITY;

-- Round 1 asks at 60 messages, every round after that adds another 30.
CREATE OR REPLACE FUNCTION public.photo_reveal_threshold(p_round integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 60 + 30 * (GREATEST(COALESCE(p_round, 1), 1) - 1);
$$;

-- Read the caller's own view of the handshake. The other person's pending
-- choice is deliberately never returned: knowing they already said yes
-- before you answer turns a free choice into social pressure.
CREATE OR REPLACE FUNCTION public.get_photo_reveal_state(p_match_id uuid)
RETURNS TABLE(
  reveal_round integer,
  my_choice text,
  revealed boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user_1 uuid;
  v_user_2 uuid;
  v_round integer;
  v_revealed_at timestamptz;
  v_my_choice text;
BEGIN
  SELECT m.user_1, m.user_2 INTO v_user_1, v_user_2
  FROM public.matches m
  WHERE m.id = p_match_id;

  IF v_user_1 IS NULL THEN
    RAISE EXCEPTION 'match_not_found';
  END IF;

  IF v_uid IS NULL OR (v_uid <> v_user_1 AND v_uid <> v_user_2) THEN
    RAISE EXCEPTION 'not_a_participant';
  END IF;

  SELECT pr.round,
         pr.revealed_at,
         CASE WHEN v_uid = v_user_1 THEN pr.user_1_choice ELSE pr.user_2_choice END
    INTO v_round, v_revealed_at, v_my_choice
  FROM public.photo_reveals pr
  WHERE pr.match_id = p_match_id;

  -- No row yet simply means nobody has been asked anything so far.
  v_round := COALESCE(v_round, 1);

  RETURN QUERY SELECT v_round, v_my_choice, v_revealed_at IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_photo_reveal_choice(p_match_id uuid, p_choice text)
RETURNS TABLE(
  reveal_round integer,
  my_choice text,
  revealed boolean
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user_1 uuid;
  v_user_2 uuid;
  v_status text;
  v_is_user_1 boolean;
  v_round integer;
  v_revealed_at timestamptz;
  v_my_choice text;
  v_their_choice text;
  v_message_count integer;
BEGIN
  IF p_choice IS NULL OR p_choice NOT IN ('reveal', 'wait') THEN
    RAISE EXCEPTION 'invalid_choice';
  END IF;

  SELECT m.user_1, m.user_2, m.status INTO v_user_1, v_user_2, v_status
  FROM public.matches m
  WHERE m.id = p_match_id;

  IF v_user_1 IS NULL THEN
    RAISE EXCEPTION 'match_not_found';
  END IF;

  IF v_uid IS NULL OR (v_uid <> v_user_1 AND v_uid <> v_user_2) THEN
    RAISE EXCEPTION 'not_a_participant';
  END IF;

  IF v_status NOT IN ('active', 'chatting') THEN
    RAISE EXCEPTION 'match_not_active';
  END IF;

  v_is_user_1 := (v_uid = v_user_1);

  INSERT INTO public.photo_reveals (match_id)
  VALUES (p_match_id)
  ON CONFLICT (match_id) DO NOTHING;

  -- Locked for the rest of the transaction so two people answering at the
  -- same moment cannot both read "they haven't answered yet" and race.
  SELECT pr.round,
         pr.revealed_at,
         CASE WHEN v_is_user_1 THEN pr.user_1_choice ELSE pr.user_2_choice END,
         CASE WHEN v_is_user_1 THEN pr.user_2_choice ELSE pr.user_1_choice END
    INTO v_round, v_revealed_at, v_my_choice, v_their_choice
  FROM public.photo_reveals pr
  WHERE pr.match_id = p_match_id
  FOR UPDATE;

  SELECT COUNT(*)::integer INTO v_message_count
  FROM public.messages msg
  WHERE msg.match_id = p_match_id;

  -- Already unlocked, or the caller already answered this round.
  IF v_revealed_at IS NOT NULL OR v_my_choice IS NOT NULL THEN
    RETURN QUERY SELECT v_round, v_my_choice, v_revealed_at IS NOT NULL;
    RETURN;
  END IF;

  IF v_message_count < public.photo_reveal_threshold(v_round) THEN
    RAISE EXCEPTION 'threshold_not_reached';
  END IF;

  IF p_choice = 'wait' THEN
    -- A single "wait" settles the round by itself - photos stay locked no
    -- matter what the other person picks - so advance straight away instead
    -- of holding them on an answer that cannot change the outcome.
    UPDATE public.photo_reveals
    SET round = round + 1,
        user_1_choice = NULL,
        user_2_choice = NULL,
        updated_at = now()
    WHERE match_id = p_match_id;

    v_round := v_round + 1;
    v_my_choice := NULL;
  ELSIF v_their_choice = 'reveal' THEN
    UPDATE public.photo_reveals
    SET user_1_choice = 'reveal',
        user_2_choice = 'reveal',
        revealed_at = now(),
        updated_at = now()
    WHERE match_id = p_match_id;

    v_revealed_at := now();
    v_my_choice := 'reveal';
  ELSE
    UPDATE public.photo_reveals
    SET user_1_choice = CASE WHEN v_is_user_1 THEN 'reveal' ELSE user_1_choice END,
        user_2_choice = CASE WHEN v_is_user_1 THEN user_2_choice ELSE 'reveal' END,
        updated_at = now()
    WHERE match_id = p_match_id;

    v_my_choice := 'reveal';
  END IF;

  RETURN QUERY SELECT v_round, v_my_choice, v_revealed_at IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.photo_reveal_threshold(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_photo_reveal_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_photo_reveal_choice(uuid, text) TO authenticated;
