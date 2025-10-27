import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.10';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting cleanup of expired matches and inactive chats...');

    // Clean up expired matches (24-hour expiration for matches with no action)
    const { data: expiredMatches, error: expiredError } = await supabase
      .from('matches')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .eq('chat_request_status', 'none')
      .eq('status', 'active')
      .select('id');

    if (expiredError) {
      console.error('Error deleting expired matches:', expiredError);
    } else {
      console.log(`Deleted ${expiredMatches?.length || 0} expired matches`);
    }

    // Mark chats as inactive if no interaction for 48 hours
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: inactiveChats, error: inactiveError } = await supabase
      .from('matches')
      .update({ status: 'inactive' })
      .eq('chat_request_status', 'accepted')
      .lt('last_interaction_at', fortyEightHoursAgo)
      .in('status', ['active', 'chatting'])
      .select('id');

    if (inactiveError) {
      console.error('Error marking chats as inactive:', inactiveError);
    } else {
      console.log(`Marked ${inactiveChats?.length || 0} chats as inactive due to 48-hour inactivity`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        expired_matches_deleted: expiredMatches?.length || 0,
        inactive_chats_marked: inactiveChats?.length || 0,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in cleanup-expired-matches:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
