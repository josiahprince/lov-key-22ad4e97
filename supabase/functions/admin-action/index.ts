import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Must match PHOTO_BUCKET in src/lib/photos.ts.
const PHOTO_BUCKET = 'profile-photos';
const PHOTO_LINK_SECONDS = 10 * 60;
// Supabase's ban_duration has no "forever"; this is about 100 years.
const PERMANENT_BAN = '876000h';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Same pattern as photo_storage_path() in 20261021120000_photo_moderation.sql.
const storagePath = (photoUrl: string | null) => photoUrl?.match(/\/profile-photos\/([^?]+)/)?.[1] ?? null;

// Makes the auth user's sign-in block match their active suspensions and
// bans: the longest one wins, and none lifts it. Safe to run any number of
// times, so a failed run is fixed by the next action on the same person.
const syncSignInBlock = async (admin: SupabaseClient, userId: string) => {
  const { data, error } = await admin
    .from('account_restrictions')
    .select('kind, ends_at')
    .eq('user_id', userId)
    .is('lifted_at', null)
    .in('kind', ['suspension', 'ban']);
  if (error) throw new Error(`restrictions: ${error.message}`);

  const now = Date.now();
  let banDuration = 'none';
  if (data.some((r) => r.kind === 'ban')) {
    banDuration = PERMANENT_BAN;
  } else {
    const latestEnd = Math.max(0, ...data.map((r) => new Date(r.ends_at).getTime()));
    if (latestEnd > now) banDuration = `${Math.ceil((latestEnd - now) / 3_600_000)}h`;
  }

  const { error: banError } = await admin.auth.admin.updateUserById(userId, { ban_duration: banDuration });
  if (banError) throw new Error(`ban: ${banError.message}`);
  return banDuration !== 'none';
};

// The admin app's actions that need Supabase's admin powers:
//   restrict      suspend or ban, then block sign-in
//   lift          lift a suspension or ban, then unblock sign-in if none is left
//   photo_urls    short-lived links to all of a user's photos, any check result
//
// Permission checks happen in the database, not here: restrict and lift call
// admin_restrict_account() / admin_lift_restriction() with the staff member's
// own token, so authorize() sees their role and MFA level, and nothing happens
// unless that succeeds. Only then does the service role touch auth or storage.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const staff = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) {
      console.warn('Invalid JWT for admin-action');
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();

    if (body.action === 'restrict') {
      const { error } = await staff.rpc('admin_restrict_account', {
        p_user_id: body.userId,
        p_kind: body.kind,
        p_ends_at: body.endsAt ?? null,
        p_reason: body.reason,
      });
      if (error) return json({ error: error.message }, 400);
      const blocked = await syncSignInBlock(admin, body.userId);
      console.log(`${user.id} ${body.kind} ${body.userId}`);
      return json({ success: true, signInBlocked: blocked });
    }

    if (body.action === 'lift') {
      const { data: userId, error } = await staff.rpc('admin_lift_restriction', {
        p_restriction_id: body.restrictionId,
        p_reason: body.reason,
      });
      if (error) return json({ error: error.message }, 400);
      const blocked = await syncSignInBlock(admin, userId);
      console.log(`${user.id} lifted ${body.restrictionId}`);
      return json({ success: true, signInBlocked: blocked });
    }

    if (body.action === 'photo_urls') {
      const { data: allowed, error } = await staff.rpc('authorize', { p_permission: 'users.view' });
      if (error) return json({ error: error.message }, 400);
      if (!allowed) return json({ error: 'not_authorized' }, 403);

      const { data: photos, error: photosError } = await admin
        .from('user_photos')
        .select('id, photo_slot, is_main, photo_url, moderation_status, moderation_reason')
        .eq('user_id', body.userId)
        .order('photo_slot');
      if (photosError) throw new Error(`photos: ${photosError.message}`);

      const result = await Promise.all((photos ?? []).map(async (p) => {
        const path = storagePath(p.photo_url);
        let url: string | null = null;
        if (path) {
          const { data } = await admin.storage.from(PHOTO_BUCKET).createSignedUrl(path, PHOTO_LINK_SECONDS);
          url = data?.signedUrl ?? null;
        }
        return {
          id: p.id,
          slot: p.photo_slot,
          isMain: p.is_main,
          status: p.moderation_status,
          reason: p.moderation_reason,
          url,
        };
      }));
      return json({ photos: result });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('admin-action failed:', error instanceof Error ? error.message : error);
    return json({ error: 'Something went wrong' }, 500);
  }
});
