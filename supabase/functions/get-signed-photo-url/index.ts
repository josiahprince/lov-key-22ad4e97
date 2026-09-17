import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.warn('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user's token to verify authentication
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user's token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    
    if (userError || !user) {
      console.warn('Invalid JWT token for get-signed-photo-url');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentUserId = user.id;

    // Parse request body
    const { targetUserId, matchId, photoPath } = await req.json();

    if (!targetUserId || !photoPath) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: targetUserId, photoPath' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // If viewing own photos, always allow
    const isOwnPhoto = targetUserId === currentUserId;
    
    if (!isOwnPhoto) {
      // Verify there's an active match between the users
      const { data: matchData, error: matchError } = await supabaseAdmin
        .from('matches')
        .select('id, status, chat_request_status')
        .or(`and(user_1.eq.${currentUserId},user_2.eq.${targetUserId}),and(user_1.eq.${targetUserId},user_2.eq.${currentUserId})`)
        .in('status', ['active', 'chatting'])
        .maybeSingle();

      if (matchError) {
        console.error('Error checking match:', matchError);
        return new Response(
          JSON.stringify({ error: 'Failed to verify match' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!matchData) {
        console.warn('No active match found between users:', { currentUserId, targetUserId });
        return new Response(
          JSON.stringify({ error: 'No active match with this user' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Photos stay blurred until BOTH people opt in through the photo
      // reveal handshake (submit_photo_reveal_choice) - reaching the message
      // threshold only earns the pair the right to be asked, it does not
      // unblur anything on its own.
      const matchIdToCheck = matchId || matchData.id;

      const { data: revealData, error: revealError } = await supabaseAdmin
        .from('photo_reveals')
        .select('revealed_at')
        .eq('match_id', matchIdToCheck)
        .maybeSingle();

      if (revealError) {
        console.error('Error checking photo reveal state:', revealError);
        return new Response(
          JSON.stringify({ error: 'Failed to verify photo reveal state' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const canViewUnblurred = Boolean(revealData?.revealed_at);

      // Return info about whether photo should be blurred
      // We still provide the signed URL but include blur status
      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
        .from('profile-photos')
        .createSignedUrl(photoPath, 3600); // 1 hour expiry

      if (signedUrlError) {
        console.error('Error creating signed URL:', signedUrlError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate signed URL' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          signedUrl: signedUrlData.signedUrl,
          canViewUnblurred
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Own photo - always unblurred
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('profile-photos')
      .createSignedUrl(photoPath, 3600); // 1 hour expiry

    if (signedUrlError) {
      console.error('Error creating signed URL for own photo:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate signed URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        signedUrl: signedUrlData.signedUrl,
        canViewUnblurred: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in get-signed-photo-url:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
