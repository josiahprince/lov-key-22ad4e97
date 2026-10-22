-- Every profile photo is checked automatically before a match can see it.
--
-- Flow: the app uploads the file to the profile-photos bucket and inserts a
-- user_photos row, which this migration forces to moderation_status =
-- 'pending'. The app then calls the moderate-photo edge function, which
-- downloads the file, asks an AI vision model whether it follows the photo
-- rules, and sets 'approved' or 'rejected' (with a reason the owner sees).
--
-- Only 'approved' photos are visible to matches: the match SELECT policy below
-- filters on it, and get-signed-photo-url refuses to sign anything else
-- (photo_is_viewable()). The owner always sees all of their own photos, so
-- they can see which ones were rejected and why.
--
-- moderated_object_id records which stored file was checked. Users can't
-- overwrite a file in place (the storage UPDATE policy is dropped below), and
-- deleting and re-uploading under the same name creates a new object id, so a
-- file swapped after approval no longer matches and is not shown.
--
-- Photos that existed before this migration are approved as they are, with
-- moderated_at left NULL to mark them as never checked. To have them checked,
-- set them back to 'pending' (see PENDING.md); each one is then checked the
-- next time its owner opens the app.

ALTER TABLE public.user_photos
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS moderation_reason text,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_object_id uuid;

ALTER TABLE public.user_photos DROP CONSTRAINT IF EXISTS user_photos_moderation_status_check;
ALTER TABLE public.user_photos ADD CONSTRAINT user_photos_moderation_status_check
  CHECK (moderation_status IN ('pending', 'approved', 'rejected'));

-- Storage path inside the profile-photos bucket ('<user id>/<file>'), or NULL
-- for anything that isn't in the bucket (old pasted image links).
CREATE OR REPLACE FUNCTION public.photo_storage_path(p_photo_url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT substring(p_photo_url FROM '/profile-photos/([^?]+)');
$$;

-- ensure_single_main_photo() used to clear is_main on the user's other photos
-- on every update of the main one, even when is_main hadn't changed. Updating
-- several of a user's photos in one statement (the backfill below) then hit
-- rows that statement was about to update, which Postgres refuses ("tuple to
-- be updated was already modified"). Only act when a photo becomes main.
CREATE OR REPLACE FUNCTION public.ensure_single_main_photo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.is_main = TRUE AND (TG_OP = 'INSERT' OR OLD.is_main IS DISTINCT FROM TRUE) THEN
    UPDATE public.user_photos
    SET is_main = FALSE
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_main = TRUE;
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Existing photos
-- ---------------------------------------------------------------------------
UPDATE public.user_photos up
SET moderation_status = 'approved',
    moderation_reason = NULL,
    moderated_at = NULL,
    moderated_object_id = o.id
FROM storage.objects o
WHERE o.bucket_id = 'profile-photos'
  AND o.name = public.photo_storage_path(up.photo_url)
  AND up.moderation_status = 'pending';

-- Pasted image links can't be checked or kept private, so they are no longer
-- allowed. The owner sees this reason on the photo.
UPDATE public.user_photos
SET moderation_status = 'rejected',
    moderation_reason = 'Photo links are no longer supported. Please upload this photo from your device.',
    moderated_at = now()
WHERE public.photo_storage_path(photo_url) IS NULL;

-- ---------------------------------------------------------------------------
-- Clients can't set their own moderation result
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_user_photo_moderation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Server-side code (service role, SQL editor) is trusted.
  IF coalesce(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.photo_url IS DISTINCT FROM OLD.photo_url THEN
    -- A photo must be a file the user uploaded to their own folder.
    IF coalesce(public.photo_storage_path(NEW.photo_url), '') NOT LIKE NEW.user_id::text || '/%' THEN
      RAISE EXCEPTION 'photo_must_be_uploaded';
    END IF;

    NEW.moderation_status := 'pending';
    NEW.moderation_reason := NULL;
    NEW.moderated_at := NULL;
    NEW.moderated_object_id := NULL;
  ELSE
    -- Reordering or changing the main photo keeps the existing result.
    NEW.moderation_status := OLD.moderation_status;
    NEW.moderation_reason := OLD.moderation_reason;
    NEW.moderated_at := OLD.moderated_at;
    NEW.moderated_object_id := OLD.moderated_object_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_user_photo_moderation_trigger ON public.user_photos;
CREATE TRIGGER guard_user_photo_moderation_trigger
  BEFORE INSERT OR UPDATE ON public.user_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_photo_moderation();

-- ---------------------------------------------------------------------------
-- Matches only see approved photos
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view photos of their matches" ON public.user_photos;
CREATE POLICY "Users can view photos of their matches"
ON public.user_photos
FOR SELECT
USING (
  moderation_status = 'approved'
  AND user_id IN (
    SELECT m.user_1
    FROM public.matches m
    WHERE m.user_2 = auth.uid()
      AND (
        m.status = 'active'
        OR (m.status = 'chatting' AND m.chat_request_status = 'accepted')
      )
    UNION
    SELECT m.user_2
    FROM public.matches m
    WHERE m.user_1 = auth.uid()
      AND (
        m.status = 'active'
        OR (m.status = 'chatting' AND m.chat_request_status = 'accepted')
      )
  )
);

-- ---------------------------------------------------------------------------
-- Helpers for the edge functions (service role only)
-- ---------------------------------------------------------------------------

-- Id of the stored file at this path, or NULL. moderate-photo records it with
-- the result.
CREATE OR REPLACE FUNCTION public.photo_object_id(p_path text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id
  FROM storage.objects o
  WHERE o.bucket_id = 'profile-photos'
    AND o.name = p_path;
$$;

-- True when this path is one of the user's approved photos and the file is
-- still the one that was checked. get-signed-photo-url uses it before handing
-- a photo to anyone other than its owner.
CREATE OR REPLACE FUNCTION public.photo_is_viewable(p_user_id uuid, p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_photos up
    JOIN storage.objects o
      ON o.bucket_id = 'profile-photos'
     AND o.name = p_path
    WHERE up.user_id = p_user_id
      AND public.photo_storage_path(up.photo_url) = p_path
      AND up.moderation_status = 'approved'
      AND up.moderated_object_id = o.id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.photo_object_id(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.photo_is_viewable(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.photo_object_id(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.photo_is_viewable(uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- Storage: no overwriting a file in place, and only formats we can check
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'],
    file_size_limit = 5242880
WHERE id = 'profile-photos';
