
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetResult {
  checked: number;
  resets: number;
  errors: Array<{ user_id: string; error: string }>;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify service role authentication for admin/scheduled functions
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.includes(serviceKey)) {
    console.warn('Unauthorized access attempt to check-daily-onboarding');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const result: ResetResult = { checked: 0, resets: 0, errors: [] };

  try {
    // Fetch all profiles that have a timezone set
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, timezone')
      .not('timezone', 'is', null);

    if (profilesError) throw profilesError;

    for (const profile of profiles || []) {
      result.checked += 1;
      const tz = profile.timezone as string;

      // Check if it's after 6am in user's timezone and get today's date in tz
      const [{ data: after6, error: after6Err }, { data: today, error: todayErr }] = await Promise.all([
        supabase.rpc('is_after_6am_in_timezone', { user_timezone: tz }),
        supabase.rpc('get_date_in_timezone', { user_timezone: tz }),
      ]);

      if (after6Err) {
        result.errors.push({ user_id: profile.id, error: after6Err.message });
        continue;
      }
      if (todayErr) {
        result.errors.push({ user_id: profile.id, error: todayErr.message });
        continue;
      }

      if (!after6) continue; // Only reset after crossing 6am

      // Get the latest onboarding record for the user
      const { data: onboarding, error: onboardingError } = await supabase
        .from('user_onboarding')
        .select('id, last_onboarding_date, onboarding_shown_today')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (onboardingError) {
        result.errors.push({ user_id: profile.id, error: onboardingError.message });
        continue;
      }

      if (!onboarding) continue; // Nothing to reset for this user yet

      // If we crossed into a new day, reset the flag
      if (!onboarding.last_onboarding_date || onboarding.last_onboarding_date < today) {
        const { error: updateError } = await supabase
          .from('user_onboarding')
          .update({ onboarding_shown_today: false })
          .eq('id', onboarding.id);

        if (updateError) {
          result.errors.push({ user_id: profile.id, error: updateError.message });
        } else {
          result.resets += 1;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e?.message ?? String(e), ...result }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
