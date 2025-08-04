import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.10'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OnboardingResetResult {
  users_reset: number;
  total_users_checked: number;
  errors: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting daily onboarding reset process...');

    const result: OnboardingResetResult = {
      users_reset: 0,
      total_users_checked: 0,
      errors: []
    };

    // Get all users with their timezone information
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, timezone')
      .not('timezone', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profiles', details: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${profiles?.length || 0} users with timezone data`);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No users with timezone data found',
          result
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each user
    for (const profile of profiles) {
      result.total_users_checked++;
      
      try {
        // Check if it's after 6 AM in user's timezone using the database function
        const { data: shouldReset, error: checkError } = await supabase
          .rpc('is_after_6am_in_timezone', { user_timezone: profile.timezone });

        if (checkError) {
          console.error(`Error checking 6AM status for user ${profile.id}:`, checkError);
          result.errors.push(`User ${profile.id}: ${checkError.message}`);
          continue;
        }

        if (!shouldReset) {
          continue; // It's not 6 AM yet in user's timezone
        }

        // Get today's date in user's timezone
        const { data: todayInTz, error: dateError } = await supabase
          .rpc('get_date_in_timezone', { user_timezone: profile.timezone });

        if (dateError) {
          console.error(`Error getting date for user ${profile.id}:`, dateError);
          result.errors.push(`User ${profile.id}: ${dateError.message}`);
          continue;
        }

        // Get user's current onboarding record
        const { data: onboardingData, error: onboardingError } = await supabase
          .from('user_onboarding')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (onboardingError) {
          console.error(`Error fetching onboarding for user ${profile.id}:`, onboardingError);
          result.errors.push(`User ${profile.id}: ${onboardingError.message}`);
          continue;
        }

        // If user has no onboarding data, skip
        if (!onboardingData) {
          continue;
        }

        // Check if reset is needed
        const needsReset = 
          !onboardingData.last_onboarding_date || 
          onboardingData.last_onboarding_date < todayInTz ||
          (onboardingData.onboarding_shown_today && onboardingData.last_onboarding_date < todayInTz);

        if (needsReset) {
          // Reset the onboarding flags for this user
          const { error: updateError } = await supabase
            .from('user_onboarding')
            .update({
              onboarding_shown_today: false,
              last_6am_reset: new Date().toISOString()
            })
            .eq('user_id', profile.id);

          if (updateError) {
            console.error(`Error updating onboarding for user ${profile.id}:`, updateError);
            result.errors.push(`User ${profile.id}: ${updateError.message}`);
          } else {
            result.users_reset++;
            console.log(`Reset onboarding for user ${profile.id} in timezone ${profile.timezone}`);
          }
        }

      } catch (error) {
        console.error(`Unexpected error processing user ${profile.id}:`, error);
        result.errors.push(`User ${profile.id}: ${error.message}`);
      }
    }

    console.log(`Daily onboarding reset completed. Reset ${result.users_reset} out of ${result.total_users_checked} users.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily onboarding reset completed successfully`,
        result
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reset-daily-onboarding function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});