import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Must match PHOTO_BUCKET in src/lib/photos.ts.
const PHOTO_BUCKET = 'profile-photos';
// Long enough for the client to download every photo straight after the call.
const PHOTO_LINK_SECONDS = 15 * 60;
// PostgREST caps each response at max_rows (1000, supabase/config.toml).
const PAGE_SIZE = 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// The admin client is untyped (no generated Database types in edge functions).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Page = PromiseLike<{ data: Row[] | null; error: { message: string } | null }>;

// Reads every row a query matches, a page at a time. `page` must apply
// .range(from, to) to a freshly built query.
const fetchAll = async (label: string, page: (from: number, to: number) => Page): Promise<Row[]> => {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${label}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
};

const nicknamesFor = async (admin: SupabaseClient, ids: string[]) => {
  const names = new Map<string, string>();
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += 200) {
    const { data, error } = await admin.from('profiles').select('id, nickname').in('id', unique.slice(i, i + 200));
    if (error) throw new Error(`nicknames: ${error.message}`);
    for (const p of data ?? []) names.set(p.id, p.nickname ?? 'Unknown');
  }
  return (id: string | null) => (id ? names.get(id) ?? 'Deleted user' : null);
};

// Returns a copy of everything LovKey stores about the calling user, for
// Settings → Download my data. Photos come back as short-lived signed links,
// which the client downloads and zips together with this JSON.
//
// Deliberately left out, to protect other people: messages the other person
// sent, their profiles, reports filed about the caller, and the message
// snapshots attached to the caller's own reports.
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
      console.warn('Invalid JWT for export-my-data');
      return json({ error: 'Unauthorized' }, 401);
    }
    const userId = user.id;
    console.log(`Exporting data for ${userId}`);

    const single = async (label: string, table: string, column: string) => {
      const { data, error } = await admin.from(table).select('*').eq(column, userId).maybeSingle();
      if (error) throw new Error(`${label}: ${error.message}`);
      return data;
    };

    const [profile, description, checkIn] = await Promise.all([
      single('profile', 'profiles', 'id'),
      single('description', 'user_descriptions', 'user_id'),
      single('check-in', 'user_onboarding', 'user_id'),
    ]);

    const [photoRows, matches, sent, notifications, blocks, reports] = await Promise.all([
      fetchAll('photos', (from, to) =>
        admin.from('user_photos').select('*').eq('user_id', userId).order('photo_slot').range(from, to)),
      fetchAll('matches', (from, to) =>
        admin.from('matches').select('*').or(`user_1.eq.${userId},user_2.eq.${userId}`).order('created_at').range(from, to)),
      fetchAll('messages', (from, to) =>
        admin.from('messages').select('match_id, receiver_id, content, created_at').eq('sender_id', userId)
          .order('created_at').range(from, to)),
      fetchAll('notifications', (from, to) =>
        admin.from('notifications').select('type, title, message, is_read, created_at').eq('user_id', userId)
          .order('created_at').range(from, to)),
      fetchAll('blocks', (from, to) =>
        admin.from('blocked_users').select('blocked_id, created_at').eq('blocker_id', userId).order('created_at').range(from, to)),
      fetchAll('reports', (from, to) =>
        admin.from('reports').select('reported_id, reason, details, status, created_at, reviewed_at').eq('reporter_id', userId)
          .order('created_at').range(from, to)),
    ]);

    const reveals = new Map<string, Row>();
    const matchIds = matches.map((m) => m.id);
    for (let i = 0; i < matchIds.length; i += 200) {
      const { data, error } = await admin.from('photo_reveals').select('*').in('match_id', matchIds.slice(i, i + 200));
      if (error) throw new Error(`photo reveals: ${error.message}`);
      for (const r of data ?? []) reveals.set(r.match_id, r);
    }

    const otherOf = (m: Row) => (m.user_1 === userId ? m.user_2 : m.user_1);
    const nickname = await nicknamesFor(admin, [
      ...matches.map(otherOf),
      ...sent.map((m) => m.receiver_id),
      ...blocks.map((b) => b.blocked_id),
      ...reports.map((r) => r.reported_id),
    ]);

    // Uploaded photos live at "<userId>/<file>" (see storagePathForPhotoUrl in
    // src/lib/photos.ts). Imported photos hosted elsewhere keep their own URL.
    const photos = await Promise.all(photoRows.map(async (p) => {
      const fileName = p.photo_url?.includes('supabase') ? p.photo_url.split('/').pop() : null;
      let download_url: string | null = null;
      if (fileName) {
        const { data, error } = await admin.storage
          .from(PHOTO_BUCKET)
          .createSignedUrl(`${userId}/${fileName}`, PHOTO_LINK_SECONDS);
        if (error) console.warn(`No signed URL for photo slot ${p.photo_slot}: ${error.message}`);
        download_url = data?.signedUrl ?? null;
      }
      return {
        slot: p.photo_slot,
        is_main: p.is_main,
        uploaded_at: p.created_at,
        file_name: fileName,
        external_url: fileName ? null : p.photo_url,
        download_url,
      };
    }));

    const data = {
      account: {
        id: userId,
        email: user.email,
        created_at: user.created_at,
        email_confirmed_at: user.email_confirmed_at ?? null,
        last_sign_in_at: user.last_sign_in_at ?? null,
        terms_version: user.user_metadata?.terms_version ?? null,
        privacy_version: user.user_metadata?.privacy_version ?? null,
        terms_accepted_at: user.user_metadata?.terms_accepted_at ?? null,
      },
      profile,
      description: description?.description ?? null,
      daily_check_in: checkIn
        ? {
            mood: checkIn.mood,
            vibes: checkIn.selected_memes,
            vibes_detail: checkIn.selected_memes_display,
            weekly_question: checkIn.prompt_question,
            weekly_answer: checkIn.perfect_sunday,
            last_answered_on: checkIn.last_onboarding_date,
          }
        : null,
      photos,
      matches: matches.map((m) => {
        const reveal = reveals.get(m.id);
        const isUser1 = m.user_1 === userId;
        return {
          match_id: m.id,
          matched_with: nickname(otherOf(m)),
          matched_on: m.matched_date ?? m.created_at,
          match_score: m.match_score,
          status: m.status,
          chat_request_status: m.chat_request_status,
          chat_requested_by: m.chat_request_sender ? (m.chat_request_sender === userId ? 'you' : 'them') : null,
          chat_accepted_at: m.accepted_at,
          expires_at: m.expires_at,
          last_interaction_at: m.last_interaction_at,
          photo_reveal: reveal
            ? {
                round: reveal.round,
                your_choice: isUser1 ? reveal.user_1_choice : reveal.user_2_choice,
                revealed_at: reveal.revealed_at,
              }
            : null,
        };
      }),
      messages_you_sent: sent.map((m) => ({
        match_id: m.match_id,
        to: nickname(m.receiver_id),
        content: m.content,
        sent_at: m.created_at,
      })),
      notifications,
      people_you_blocked: blocks.map((b) => ({ nickname: nickname(b.blocked_id), blocked_at: b.created_at })),
      reports_you_filed: reports.map((r) => ({
        about: nickname(r.reported_id),
        reason: r.reason,
        details: r.details,
        status: r.status,
        filed_at: r.created_at,
        reviewed_at: r.reviewed_at,
      })),
    };

    console.log(`Exported data for ${userId}`);
    return json({ exported_at: new Date().toISOString(), format_version: 1, data });
  } catch (error) {
    console.error('export-my-data failed:', error instanceof Error ? error.message : error);
    return json({ error: 'Failed to export data' }, 500);
  }
});
