import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date()
    console.log('Daily onboarding trigger running at:', now.toISOString())

    // Get all users with complete profiles and their timezones
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, longitude, latitude, city, region, country')
      .eq('is_profile_complete', true)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      throw usersError
    }

    let triggeredCount = 0

    for (const user of users || []) {
      // Calculate user's local time based on longitude (rough timezone estimation)
      let userTimezone = 0 // UTC offset in hours
      
      if (user.longitude) {
        // Rough timezone calculation: longitude / 15 = timezone offset
        userTimezone = Math.round(user.longitude / 15)
      }

      // Calculate user's local time
      const userLocalTime = new Date(now.getTime() + (userTimezone * 60 * 60 * 1000))
      const userHour = userLocalTime.getHours()

      // Check if it's 6:00 AM in user's timezone (within the last hour)
      if (userHour === 6) {
        // Check if we already triggered onboarding for this user today
        const todayStart = new Date(userLocalTime)
        todayStart.setHours(0, 0, 0, 0)
        
        const { data: existingOnboarding, error: onboardingError } = await supabase
          .from('user_onboarding')
          .select('updated_at')
          .eq('user_id', user.id)
          .gte('updated_at', todayStart.toISOString())
          .limit(1)

        if (onboardingError) {
          console.error('Error checking onboarding for user:', user.id, onboardingError)
          continue
        }

        // If no onboarding data for today, mark user as needing onboarding
        if (!existingOnboarding || existingOnboarding.length === 0) {
          // Update or insert a record indicating this user needs onboarding today
          const { error: updateError } = await supabase
            .from('user_onboarding')
            .upsert({
              user_id: user.id,
              mood: 'pending_daily_update',
              selected_memes: ['pending'],
              perfect_sunday: 'pending_daily_update',
              updated_at: new Date().toISOString()
            })

          if (updateError) {
            console.error('Error updating onboarding status for user:', user.id, updateError)
          } else {
            triggeredCount++
            console.log('Triggered daily onboarding for user:', user.id)
          }
        }
      }
    }

    console.log(`Daily onboarding triggered for ${triggeredCount} users`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        triggeredCount,
        message: `Daily onboarding triggered for ${triggeredCount} users`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in daily onboarding trigger:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})