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

    // Verify the JWT token using Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn('Invalid JWT token for generate-cultural-vibes');
        return new Response(
          JSON.stringify({ error: 'Unauthorized', vibes: [] }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { country } = await req.json();
    
    if (!country) {
      throw new Error('Country is required');
    }
    
    // Validate country input
    if (typeof country !== 'string' || country.length > 100) {
      throw new Error('Invalid country format');
    }

    console.log(`Generating vibes for country: ${country}`);

    // Call Lovable AI Gateway to generate culturally relevant vibes
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
            content: `You are a cultural expert helping to create relatable personality vibes for a dating app. Generate 15 culturally relevant vibes that reflect ${country}'s culture, current affairs, popular sports, food culture, entertainment, and daily life experiences. Each vibe should be relatable, light-hearted, and positive.`
          },
          {
            role: 'user',
            content: `Generate exactly 15 culturally relevant vibes for ${country}. For each vibe, provide:
1. A catchy title (2-3 words)
2. A short relatable description (5-7 words)
3. An appropriate emoji

Make them fun, culturally specific, and representative of modern life in ${country}. Include vibes about:
- Popular foods and dining culture
- Sports and entertainment
- Daily life experiences
- Cultural traditions and festivals
- Modern lifestyle trends
- Local humor and references

Return the response as a valid JSON array with this exact structure:
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

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('Raw AI response:', content);

    // Parse the JSON response
    let vibesData: Array<{title: string; description: string; emoji: string}>;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        vibesData = JSON.parse(jsonMatch[0]);
      } else {
        vibesData = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid response format from AI');
    }

    // Validate and format the vibes
    if (!Array.isArray(vibesData) || vibesData.length === 0) {
      throw new Error('Invalid vibes data structure');
    }

    // Convert to our format with IDs
    const vibes: Vibe[] = vibesData.slice(0, 15).map((vibe, index) => ({
      id: `vibe${index + 1}`,
      title: vibe.title,
      description: vibe.description,
      emoji: vibe.emoji,
    }));

    console.log(`Successfully generated ${vibes.length} vibes for ${country}`);

    return new Response(
      JSON.stringify({ vibes }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        } 
      }
    );

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