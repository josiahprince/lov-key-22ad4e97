import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  region?: string;
  country?: string;
  interests?: string[];
  gender?: string;
  sexual_orientation?: string;
  interested_in?: string;
}

interface UserOnboarding {
  user_id: string;
  mood: string;
  selected_memes: string[];
  perfect_sunday: string;
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
    );

    console.log('Starting daily match generation...');

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Get all users with complete profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_profile_complete', true);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    // Get all user onboarding data
    const { data: onboardingData, error: onboardingError } = await supabase
      .from('user_onboarding')
      .select('*');

    if (onboardingError) {
      console.error('Error fetching onboarding data:', onboardingError);
      throw onboardingError;
    }

    let matchesCreated = 0;
    let usersProcessed = 0;

    // Process each user
    for (const userProfile of profiles) {
      usersProcessed++;
      
      // Get user's onboarding data
      const userOnboarding = onboardingData.find(o => o.user_id === userProfile.id);
      if (!userOnboarding) continue;

      // Check if user already has matches today
      const { data: existingMatches } = await supabase
        .from('matches')
        .select('id')
        .or(`user_1.eq.${userProfile.id},user_2.eq.${userProfile.id}`)
        .gte('matched_on', startOfDay.toISOString())
        .lt('matched_on', endOfDay.toISOString());

      if (existingMatches && existingMatches.length >= 3) {
        continue; // User already has enough matches for today
      }

      const maxMatches = 3 - (existingMatches?.length || 0);
      
      // Find potential matches
      const potentialMatches = [];
      
      for (const potentialProfile of profiles) {
        if (potentialProfile.id === userProfile.id) continue; // Skip self
        
        const potentialOnboarding = onboardingData.find(o => o.user_id === potentialProfile.id);
        if (!potentialOnboarding) continue;

        // Check if already matched
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('id')
          .or(
            `and(user_1.eq.${userProfile.id},user_2.eq.${potentialProfile.id}),and(user_1.eq.${potentialProfile.id},user_2.eq.${userProfile.id})`
          );

        if (existingMatch && existingMatch.length > 0) continue; // Already matched

        // Calculate compatibility
        const compatibility = calculateCompatibility(
          userProfile,
          userOnboarding,
          potentialProfile,
          potentialOnboarding
        );

        // Check orientation compatibility
        if (!isOrientationCompatible(userProfile, potentialProfile)) continue;

        potentialMatches.push({
          profile: potentialProfile,
          onboarding: potentialOnboarding,
          compatibility
        });
      }

      // Sort by compatibility and take top matches
      potentialMatches.sort((a, b) => b.compatibility - a.compatibility);
      const selectedMatches = potentialMatches.slice(0, maxMatches);

      // Create matches in database
      for (const match of selectedMatches) {
        const { error: insertError } = await supabase
          .from('matches')
          .insert({
            user_1: userProfile.id,
            user_2: match.profile.id,
            match_score: match.compatibility,
            matched_on: new Date().toISOString(),
            status: 'active'
          });

        if (!insertError) {
          matchesCreated++;
        } else {
          console.error('Error creating match:', insertError);
        }
      }
    }

    console.log(`Match generation complete. Created ${matchesCreated} matches for ${usersProcessed} users.`);

    return new Response(
      JSON.stringify({
        success: true,
        matches_created: matchesCreated,
        users_processed: usersProcessed
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in generate-daily-matches:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});

function calculateCompatibility(
  userProfile: UserProfile,
  userOnboarding: UserOnboarding,
  matchProfile: UserProfile,
  matchOnboarding: UserOnboarding
): number {
  let score = 0;

  // Mood compatibility (+40% for exact match, +20% for adjacent)
  if (userOnboarding.mood === matchOnboarding.mood) {
    score += 40;
  } else {
    const moodCompatibility: { [key: string]: string[] } = {
      'happy': ['energetic', 'chill'],
      'energetic': ['happy', 'excited'],
      'chill': ['happy', 'sleepy'],
      'sleepy': ['chill', 'peaceful'],
      'deep': ['thoughtful', 'reflective'],
      'excited': ['energetic', 'happy']
    };
    
    if (moodCompatibility[userOnboarding.mood]?.includes(matchOnboarding.mood)) {
      score += 20;
    }
  }

  // Meme/vibe compatibility (+30%)
  const sharedMemes = userOnboarding.selected_memes?.filter(meme =>
    matchOnboarding.selected_memes?.includes(meme)
  ) || [];
  
  if (sharedMemes.length > 0) {
    score += 30;
  }

  // Location compatibility (+20% same city, +10% same region)
  if (userProfile.city && matchProfile.city && userProfile.city === matchProfile.city) {
    score += 20;
  } else if (userProfile.region && matchProfile.region && userProfile.region === matchProfile.region) {
    score += 10;
  }

  // Interests compatibility (+10%)
  const sharedInterests = userProfile.interests?.filter(interest =>
    matchProfile.interests?.includes(interest)
  ) || [];
  
  if (sharedInterests.length > 0) {
    score += 10;
  }

  return Math.min(score, 100); // Cap at 100%
}

function isOrientationCompatible(userProfile: UserProfile, matchProfile: UserProfile): boolean {
  // Simple compatibility check based on gender and orientation
  const userGender = userProfile.gender;
  const userInterestedIn = userProfile.interested_in;
  const matchGender = matchProfile.gender;
  const matchInterestedIn = matchProfile.interested_in;

  // If either user is interested in "everyone", it's compatible
  if (userInterestedIn === 'everyone' || matchInterestedIn === 'everyone') {
    return true;
  }

  // Check if user is interested in match's gender and vice versa
  const userCompatible = 
    (userInterestedIn === 'men' && matchGender === 'male') ||
    (userInterestedIn === 'women' && matchGender === 'female') ||
    (userInterestedIn === 'non_binary' && matchGender === 'non_binary');

  const matchCompatible = 
    (matchInterestedIn === 'men' && userGender === 'male') ||
    (matchInterestedIn === 'women' && userGender === 'female') ||
    (matchInterestedIn === 'non_binary' && userGender === 'non_binary');

  return userCompatible && matchCompatible;
}