import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { titles, roughTopic, businessContext } = await req.json();

    if (!titles || !Array.isArray(titles) || titles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Titles array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    // Extract key context
    const business = businessContext?.business_context?.business || {};
    const offer = businessContext?.business_context?.offer || {};
    const icp = businessContext?.business_context?.icp || {};

    const systemPrompt = `You are an expert YouTube strategist who analyzes video titles for maximum click-through rate and viewer engagement.

Your job is to select the 2 BEST titles from a list based on:
1. Curiosity gap - Does it create an irresistible urge to click?
2. Specificity - Does it promise a concrete outcome?
3. Emotional hook - Does it tap into pain, desire, or intrigue?
4. Keyword frontloading - Are important words at the start (for mobile)?
5. Open loop - Does it leave the viewer needing to know more?

Return ONLY a JSON object with:
- "best_titles": Array of exactly 2 objects, each with "title" and "reason" (1 sentence why this title will perform best)

Return valid JSON only, no markdown.`;

    const titlesFormatted = titles.map((t: any, i: number) => 
      `${i + 1}. "${t.title}" - ${t.angle}`
    ).join('\n');

    const userPrompt = `Select the 2 BEST titles from this list:

${titlesFormatted}

TOPIC: ${roughTopic || 'Not specified'}

TARGET AUDIENCE:
- Business: ${business.name || 'Unknown'} (${business.type || 'Not specified'})
- Audience: ${icp.demographics?.profession_or_role || 'Not specified'}
- Main Outcome: ${offer.main_outcome || 'Not specified'}

Pick the 2 that will get the highest CTR and explain why each one wins.`;

    console.log('[select-best-titles] Selecting best 2 from', titles.length, 'titles');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: 512,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[select-best-titles] Anthropic API error:', response.status, errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error('No content in API response');
    }

    let result;
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('[select-best-titles] Parse error:', parseError);
      console.error('[select-best-titles] Raw content:', content);
      throw new Error('Failed to parse selection');
    }

    if (!result.best_titles || !Array.isArray(result.best_titles) || result.best_titles.length !== 2) {
      throw new Error('Invalid response format - expected 2 titles');
    }

    console.log('[select-best-titles] Selected:', result.best_titles.map((t: any) => t.title));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[select-best-titles] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to select best titles';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
