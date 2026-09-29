import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Vibe {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

type Client = ReturnType<typeof createClient>;

// Ids come from the title, not the position in the list, so "Chai Addict"
// is the same vibe for everyone and generate_daily_matches() can compare
// selections across users. A title that reappears in a later week keeps
// its id.
const slugify = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const loadVibeSet = async (admin: Client, country: string, weekStart: string) => {
  const { data } = await admin
    .from('vibe_sets')
    .select('vibes')
    .eq('country', country)
    .eq('week_start', weekStart)
    .maybeSingle();
  return (data?.vibes as Vibe[] | undefined) ?? null;
};

const vibesResponse = (vibes: Vibe[], weekStart: string) =>
  new Response(JSON.stringify({ vibes, weekStart }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const generateVibes = async (country: string, weekStart: string, avoidTitles: string[]): Promise<Vibe[]> => {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  console.log(`Generating vibes for ${country}, week of ${weekStart}`);

  const avoidLine = avoidTitles.length > 0
    ? `\nLast week's vibes were: ${avoidTitles.join(', ')}. The 7 topical vibes must be different from these; evergreen ones may repeat.`
    : '';

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are a cultural expert helping to create relatable personality vibes for a dating app in ${country}. Each vibe should be relatable, light-hearted, and positive.`
        },
        {
          role: 'user',
          content: `Generate exactly 15 vibes for people in ${country} for the week starting ${weekStart}:
- 8 evergreen vibes: everyday life, food, hobbies, personality (e.g. "Chai Addict", "Night Owl").
- 7 topical vibes tied to what's happening in ${country} around that week: festivals, the current sports season, big releases, weather, trends.${avoidLine}

For each vibe, provide:
1. A catchy title (2-3 words, in English)
2. A short relatable description (5-7 words)
3. An appropriate emoji

Every title must be unique. Return the response as a valid JSON array with this exact structure:
[
  {
    "title": "Vibe Title",
    "description": "Short relatable description",
    "emoji": "🎯"
  }
]

Return ONLY the JSON array, no other text.`
        }
      ],
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lovable AI error:', response.status, errorText);

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('Payment required. Please add credits to your workspace.');
    }

    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices[0].message.content;

  let vibesData: Array<{ title: string; description: string; emoji: string }>;
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    vibesData = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError, content);
    throw new Error('Invalid response format from AI');
  }

  if (!Array.isArray(vibesData) || vibesData.length === 0) {
    throw new Error('Invalid vibes data structure');
  }

  const seen = new Set<string>();
  const vibes: Vibe[] = [];
  for (const vibe of vibesData) {
    if (!vibe?.title || typeof vibe.title !== 'string') continue;
    const id = slugify(vibe.title);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    vibes.push({ id, title: vibe.title, description: vibe.description ?? '', emoji: vibe.emoji ?? '✨' });
    if (vibes.length === 15) break;
  }

  if (vibes.length === 0) {
    throw new Error('Invalid vibes data structure');
  }
  return vibes;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication for user-triggered functions
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Unauthorized access attempt to generate-cultural-vibes');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', vibes: [] }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the JWT token using Supabase getClaims
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !data?.claims) {
      console.warn('Invalid JWT token for generate-cultural-vibes');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', vibes: [] }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = data.claims.sub as string;

    // The caller's own profile decides the country and the week, so a client
    // can't make us generate (and pay for) sets for arbitrary countries.
    const { data: profile } = await supabase
      .from('profiles')
      .select('country, timezone')
      .eq('id', userId)
      .maybeSingle();

    // The request body's `country` is ignored for the same reason.
    const country = profile?.country;
    if (!country || typeof country !== 'string' || country.length > 100) {
      throw new Error('Country is required');
    }

    const { data: weekStart, error: weekError } = await supabase.rpc('current_week_start', {
      user_timezone: profile?.timezone ?? 'UTC',
    });
    if (weekError || !weekStart) {
      throw new Error(`Could not resolve current week: ${weekError?.message ?? 'no value'}`);
    }

    // Service role: vibe_sets is read-only for users.
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const existing = await loadVibeSet(admin, country, weekStart);
    if (existing) {
      return vibesResponse(existing, weekStart);
    }

    // Last week's set: its topical titles are excluded so this week feels
    // new, and it's the fallback if generation fails.
    const { data: previousSet } = await admin
      .from('vibe_sets')
      .select('vibes, week_start')
      .eq('country', country)
      .lt('week_start', weekStart)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle();
    const previousVibes = (previousSet?.vibes as Vibe[] | undefined) ?? [];

    let vibes: Vibe[];
    try {
      vibes = await generateVibes(country, weekStart, previousVibes.map((v) => v.title));
    } catch (generationError) {
      console.error('Vibe generation failed:', generationError);
      if (previousVibes.length > 0) {
        return vibesResponse(previousVibes, previousSet!.week_start);
      }
      throw generationError;
    }

    // Two users can hit an empty week at the same time. Whoever inserts
    // first wins and everyone reads that row back, so the whole country
    // shares one set (and one set of ids).
    const { error: insertError } = await admin
      .from('vibe_sets')
      .upsert({ country, week_start: weekStart, vibes }, { onConflict: 'country,week_start', ignoreDuplicates: true });
    if (insertError) {
      console.error('Failed to store vibe set:', insertError);
    }

    const stored = await loadVibeSet(admin, country, weekStart);
    console.log(`Vibe set ready for ${country}, week of ${weekStart}`);
    return vibesResponse(stored ?? vibes, weekStart);

  } catch (error) {
    console.error('Error in generate-cultural-vibes function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        vibes: [] 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});