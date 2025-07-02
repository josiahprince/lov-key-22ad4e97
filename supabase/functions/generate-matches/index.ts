
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting demo match generation...')
    
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // First, let's create demo onboarding data for users who don't have it
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, city, region, country')
      .eq('is_profile_complete', true)

    if (profileError) {
      console.error('Error fetching profiles:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles', details: profileError.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Found profiles:', profiles?.length || 0)

    // Sample moods and memes for demo
    const sampleMoods = ['happy', 'energetic', 'chill', 'sleepy']
    const sampleMemes = ['meme1', 'meme2', 'meme3', 'meme4', 'meme5', 'meme6', 'meme7', 'meme8']
    const sampleSundays = [
      'Reading a good book with coffee',
      'Hiking in nature',
      'Watching movies at home',
      'Cooking a nice meal',
      'Meeting friends for brunch'
    ]

    // Create onboarding data for users who don't have it
    for (const profile of profiles || []) {
      const { data: existingOnboarding } = await supabase
        .from('user_onboarding')
        .select('id')
        .eq('user_id', profile.id)
        .single()

      if (!existingOnboarding) {
        console.log(`Creating demo onboarding for user: ${profile.first_name}`)
        
        const randomMood = sampleMoods[Math.floor(Math.random() * sampleMoods.length)]
        const randomMemes = sampleMemes
          .sort(() => 0.5 - Math.random())
          .slice(0, 3) // Pick 3 random memes
        const randomSunday = sampleSundays[Math.floor(Math.random() * sampleSundays.length)]

        const { error: onboardingError } = await supabase
          .from('user_onboarding')
          .insert({
            user_id: profile.id,
            mood: randomMood,
            selected_memes: randomMemes,
            perfect_sunday: randomSunday
          })

        if (onboardingError) {
          console.error(`Error creating onboarding for ${profile.first_name}:`, onboardingError)
        }
      }
    }

    // Now call the generate_daily_matches function
    const { data, error } = await supabase.rpc('generate_daily_matches')
    
    if (error) {
      console.error('Error generating matches:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to generate matches', details: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = data[0]
    console.log(`Demo match generation completed: ${result.matches_created} matches created for ${result.users_processed} users`)

    return new Response(
      JSON.stringify({
        success: true,
        matches_created: result.matches_created,
        users_processed: result.users_processed,
        timestamp: new Date().toISOString(),
        demo_mode: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error in generate-matches function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
