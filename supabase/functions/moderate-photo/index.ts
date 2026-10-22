import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Must match PHOTO_BUCKET and MAX_PHOTO_BYTES in src/lib/photos.ts.
const PHOTO_BUCKET = 'profile-photos';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

type Decision =
  | { status: 'approved' }
  | { status: 'rejected'; reason: string }
  // The check couldn't run (AI service down, file changed mid-check). The
  // photo stays hidden and is checked again the next time the owner opens it.
  | { status: 'pending' };

// The model only picks a code. The words the user sees are ours.
const REJECTION_REASONS: Record<string, string> = {
  nudity: 'Nudity and sexual content aren’t allowed.',
  minor: 'Photos can’t feature children or anyone who looks under 18.',
  violence: 'Violent, graphic or threatening photos, including weapons, aren’t allowed.',
  hate: 'Hate symbols and offensive gestures aren’t allowed.',
  drugs: 'Photos showing drug use aren’t allowed.',
  no_person: 'Each photo needs to show you. We couldn’t see a person in this one.',
  contact_info: 'Photos can’t include contact details, social media handles, links or QR codes.',
  not_real_photo: 'Please use a real photo of yourself, not a screenshot, meme, drawing or AI image.',
  other: 'This photo doesn’t follow our photo rules.',
};

const MISSING_FILE_REASON = 'We couldn’t find this photo. Please upload it again.';
const NOT_UPLOADED_REASON = 'Please upload this photo from your device.';
const BAD_FORMAT_REASON = 'Please upload a JPG, PNG or WebP photo.';
const TOO_LARGE_REASON = 'File size should be less than 5MB';

const PHOTO_RULES = `You check photos for a dating app before other users can see them. The photo was uploaded by a user for their own profile.

Reject the photo if ANY of these apply, using the matching code:
- nudity: nudity, exposed genitals or nipples, sexual acts or sexually explicit poses. Swimwear at a beach or pool, gym wear and shirtless men in ordinary settings are fine.
- minor: a child or someone who looks under 18 is the main subject or appears alone. Adults with children in a group photo are fine.
- violence: gore, injuries, violence, or weapons held in a threatening way or pointed at the camera.
- hate: hate symbols, extremist imagery, or offensive gestures aimed at the viewer.
- drugs: visible illegal drug use.
- no_person: no real person is clearly visible (landscapes, pets alone, objects, food). A person counts even if small, seen from behind, or wearing sunglasses.
- contact_info: visible phone numbers, email addresses, social media handles, website links or QR codes, added to or held up in the photo.
- not_real_photo: a screenshot, meme, drawing, cartoon, obvious AI-generated image, or a photo with large text added over it.

Otherwise approve it. Do not reject photos for being blurry, dark, filtered or cropped, and do not judge attractiveness.`;

// The file's real format from its first bytes, not the name or declared type.
const sniffImageType = (bytes: Uint8Array): string | null => {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
};

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

// Asks the AI model for a verdict. Throws when the service can't answer, so
// the caller leaves the photo pending rather than guessing.
const askModel = async (bytes: Uint8Array, mimeType: string): Promise<Decision> => {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      temperature: 0,
      messages: [
        { role: 'system', content: PHOTO_RULES },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Check this profile photo and report your decision.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${toBase64(bytes)}` } },
          ],
        },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'report_photo_check',
          description: 'Report whether the photo may be shown on a dating profile.',
          parameters: {
            type: 'object',
            properties: {
              decision: { type: 'string', enum: ['approve', 'reject'] },
              reason_code: {
                type: 'string',
                enum: [...Object.keys(REJECTION_REASONS), 'none'],
                description: 'Why it was rejected, or "none" when approved.',
              },
            },
            required: ['decision', 'reason_code'],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'report_photo_check' } },
    }),
  });

  if (!response.ok) {
    throw new Error(`Lovable AI error: ${response.status} ${await response.text()}`);
  }

  const aiResponse = await response.json();
  const args = aiResponse.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) {
    throw new Error(`No tool call in AI response: ${JSON.stringify(aiResponse)}`);
  }

  const { decision, reason_code } = JSON.parse(args);
  if (decision === 'approve') return { status: 'approved' };
  if (decision === 'reject') {
    return { status: 'rejected', reason: REJECTION_REASONS[reason_code] ?? REJECTION_REASONS.other };
  }
  throw new Error(`Unexpected AI decision: ${args}`);
};

// Checks the caller's pending photos (or just one, by id) and saves each
// result. Rows are only ever read and written for the user in the token, and
// a result is only saved if the row still points at the file that was
// checked, so replacing a photo mid-check can't approve the new one.
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
      console.warn('Invalid JWT for moderate-photo');
      return json({ error: 'Unauthorized' }, 401);
    }
    const userId = user.id;

    const { photoId } = await req.json().catch(() => ({}));

    let query = admin
      .from('user_photos')
      .select('id, photo_url')
      .eq('user_id', userId)
      .eq('moderation_status', 'pending');
    if (typeof photoId === 'string') query = query.eq('id', photoId);

    const { data: rows, error: rowsError } = await query;
    if (rowsError) {
      console.error('Failed to load pending photos:', rowsError);
      return json({ error: 'Failed to load photos' }, 500);
    }

    const checkPhoto = async (photoUrl: string): Promise<Decision & { objectId?: string }> => {
      const path = photoUrl.match(/\/profile-photos\/([^?]+)/)?.[1];
      if (!path || !path.startsWith(`${userId}/`)) {
        return { status: 'rejected', reason: NOT_UPLOADED_REASON };
      }

      const { data: objectId, error: idError } = await admin.rpc('photo_object_id', { p_path: path });
      if (idError) throw idError;
      if (!objectId) return { status: 'rejected', reason: MISSING_FILE_REASON };

      const { data: file, error: downloadError } = await admin.storage.from(PHOTO_BUCKET).download(path);
      if (downloadError || !file) throw downloadError ?? new Error('Empty download');

      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.length > MAX_PHOTO_BYTES) return { status: 'rejected', reason: TOO_LARGE_REASON };
      const mimeType = sniffImageType(bytes);
      if (!mimeType) return { status: 'rejected', reason: BAD_FORMAT_REASON };

      const decision = await askModel(bytes, mimeType);

      // The file must not have been swapped while the model was looking at it.
      const { data: objectIdAfter, error: afterError } = await admin.rpc('photo_object_id', { p_path: path });
      if (afterError) throw afterError;
      if (objectIdAfter !== objectId) return { status: 'pending' };

      return { ...decision, objectId };
    };

    const results: Array<{ id: string; status: Decision['status']; reason?: string }> = [];

    for (const row of rows ?? []) {
      let decision: Decision & { objectId?: string };
      try {
        decision = await checkPhoto(row.photo_url);
      } catch (error) {
        console.error(`Photo check failed for ${row.id}:`, error);
        decision = { status: 'pending' };
      }

      if (decision.status !== 'pending') {
        const { error: updateError } = await admin
          .from('user_photos')
          .update({
            moderation_status: decision.status,
            moderation_reason: decision.status === 'rejected' ? decision.reason : null,
            moderated_at: new Date().toISOString(),
            moderated_object_id: decision.objectId ?? null,
          })
          .eq('id', row.id)
          .eq('photo_url', row.photo_url)
          .eq('moderation_status', 'pending');

        if (updateError) {
          console.error(`Failed to save photo check for ${row.id}:`, updateError);
          decision = { status: 'pending' };
        }
      }

      console.log(`Photo ${row.id} for ${userId}: ${decision.status}`);
      results.push({
        id: row.id,
        status: decision.status,
        ...(decision.status === 'rejected' ? { reason: decision.reason } : {}),
      });
    }

    return json({ results });
  } catch (error) {
    console.error('Unexpected error in moderate-photo:', error);
    return json({ error: 'Internal server error' }, 500);
  }
});
