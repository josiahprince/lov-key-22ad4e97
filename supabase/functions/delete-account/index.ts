import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Must match PHOTO_BUCKET in src/lib/photos.ts.
const PHOTO_BUCKET = 'profile-photos';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Permanently deletes the calling user: their photos in storage, every row
// that belongs to them, and finally the auth user itself.
//
// Most public tables key on the user id without a foreign key to auth.users,
// so deleting the auth user alone would leave them behind. And
// matches.chat_request_sender references auth.users with no ON DELETE
// action, so the user's matches must go before the auth user can. Every
// step is idempotent: if one fails, the auth user is kept and the client
// can simply retry.
//
// Reports are deliberately left in place: reports.reporter_id/reported_id are
// not foreign keys (20261001120000_keep_reports_after_account_deletion.sql),
// so they survive as safety evidence. blocked_users still cascades.
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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // The user id always comes from the verified token, never the request body.
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) {
      console.warn('Invalid JWT for delete-account');
      return json({ error: 'Unauthorized' }, 401);
    }
    const userId = user.id;
    console.log(`Deleting account ${userId}`);

    // 1. Photos. Uploads live under "<userId>/..." in the bucket.
    for (;;) {
      const { data: files, error: listError } = await admin.storage.from(PHOTO_BUCKET).list(userId, { limit: 100 });
      if (listError) throw new Error(`list photos: ${listError.message}`);
      if (!files || files.length === 0) break;
      const { error: removeError } = await admin.storage
        .from(PHOTO_BUCKET)
        .remove(files.map((f) => `${userId}/${f.name}`));
      if (removeError) throw new Error(`remove photos: ${removeError.message}`);
      if (files.length < 100) break;
    }

    // 2. Matches. Messages and photo-reveal state cascade from these, and
    // reports.match_id is set to null.
    const { error: matchesError } = await admin
      .from('matches')
      .delete()
      .or(`user_1.eq.${userId},user_2.eq.${userId}`);
    if (matchesError) throw new Error(`matches: ${matchesError.message}`);

    // 3. The user's own rows.
    for (const table of ['notifications', 'user_photos', 'user_descriptions', 'user_onboarding']) {
      const { error } = await admin.from(table).delete().eq('user_id', userId);
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    const { error: profileError } = await admin.from('profiles').delete().eq('id', userId);
    if (profileError) throw new Error(`profiles: ${profileError.message}`);

    // 4. The auth user. blocked_users and reports rows cascade from it.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(`auth user: ${deleteError.message}`);

    console.log(`Deleted account ${userId}`);
    return json({ success: true });
  } catch (error) {
    console.error('delete-account failed:', error instanceof Error ? error.message : error);
    return json({ error: 'Failed to delete account' }, 500);
  }
});
