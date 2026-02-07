import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roughTopic, businessContext } = await req.json();

    if (!roughTopic?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Rough topic is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    // Extract key context for title generation
    const business = businessContext?.business_context?.business || {};
    const offer = businessContext?.business_context?.offer || {};
    const icp = businessContext?.business_context?.icp || {};
    const painPoints = businessContext?.business_context?.icp_pain_points || {};
    const transformation = businessContext?.business_context?.transformation || {};
    const creator = businessContext?.business_context?.creator || {};

    const systemPrompt = `You are an expert YouTube title writer specializing in high-converting video titles for finance and business creators.

Your titles should:
1. Create curiosity and intrigue
2. Promise a specific transformation or outcome
3. Target the viewer's pain points or aspirations
4. Use power words and emotional triggers
5. Be optimized for YouTube CTR (click-through rate)

Title formulas that work:
- Open Loop: "[Unexpected Action] + [Vague Consequence]" (e.g., "I sold everything and bought this one stock")
- Action-Result: "I [Bold Action] for [Time Frame], this is what happened" (e.g., "I tried 5 passive income streams for a year, this is what happened")
- Secret/Authority: "How a [Professional/Expert] actually [does specific task]" (e.g., "How a hedge fund manager actually picks stocks")
- Negative Storytelling: "I regret [Action/Purchase]" or "My biggest [Topic] mistake" (e.g., "I regret picking these stocks last year")
- Objection-Handler: "How to [Desired Result] without [Common Pain Point]" (e.g., "How to build wealth without a high income")
- Specific Audience: "[Topic] for [Specific Group/Level]" (e.g., "Investing for beginners with $100")

Best practices:
- Frontload important keywords (mobile truncation)
- Keep titles under 55 characters when possible
- Use power words: "warning," "proven," "secret," "hidden," "exposed"
- Never give away the answer—leave the loop open
- Add the current year for search-based content (e.g., "in 2025")

Return ONLY a JSON array of exactly 5 title objects, each with:
- "title": The video title (max 70 characters)
- "angle": 1-sentence explanation of why this title works

Return valid JSON only, no markdown.`;

    const userPrompt = `Generate 5 compelling YouTube video titles based on:

ROUGH TOPIC/IDEA:
${roughTopic}

BUSINESS CONTEXT:
- Business: ${business.name || 'Unknown'} (${business.type || 'coaching'})
- Unique Mechanism: ${business.unique_mechanism || 'Not specified'}
- Key Differentiator: ${business.key_differentiator || 'Not specified'}

OFFER:
- Main Outcome: ${offer.main_outcome || 'Not specified'}
- Timeline: ${offer.timeline_to_result || 'Not specified'}

TARGET AUDIENCE:
- Role: ${icp.demographics?.profession_or_role || 'Not specified'}
- Current Situation: ${icp.current_situation || 'Not specified'}

PAIN POINTS:
- Primary Problem: ${painPoints.primary_problem || 'Not specified'}
- Keeps them up at night: ${painPoints.emotional_pain?.keeps_them_up_at_night || 'Not specified'}

TRANSFORMATION:
- From: ${transformation.from_state?.situation || 'Not specified'}
- To: ${transformation.to_state?.outcome || 'Not specified'}

CREATOR:
- Name: ${creator.name || 'Not specified'}
- Credibility: ${creator.credibility_claim || 'Not specified'}

Generate 5 diverse titles using different angles (curiosity, contrarian, results-focused, story-based, problem-agitation).`;

    console.log('[generate-title-suggestions] Generating titles with Claude Opus 4.5 for topic:', roughTopic);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-title-suggestions] Anthropic API error:', response.status, errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error('No content in API response');
    }

    // Parse the JSON response
    let suggestions;
    try {
      // Clean up potential markdown formatting
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      suggestions = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('[generate-title-suggestions] Parse error:', parseError);
      console.error('[generate-title-suggestions] Raw content:', content);
      throw new Error('Failed to parse title suggestions');
    }

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('Invalid suggestions format');
    }

    console.log('[generate-title-suggestions] Generated', suggestions.length, 'titles');

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[generate-title-suggestions] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate title suggestions';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
