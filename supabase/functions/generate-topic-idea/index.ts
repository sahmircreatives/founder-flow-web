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
    const { username, businessContext } = await req.json();

    if (!username?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const XAI_API_KEY = Deno.env.get('XAI_API_KEY');
    if (!XAI_API_KEY) {
      throw new Error('XAI_API_KEY is not configured');
    }

    // Clean username
    const cleanUsername = username.trim().replace(/^@/, '');

    // Extract key context
    const business = businessContext?.business_context?.business || {};
    const offer = businessContext?.business_context?.offer || {};
    const icp = businessContext?.business_context?.icp || {};
    const painPoints = businessContext?.business_context?.icp_pain_points || {};
    const transformation = businessContext?.business_context?.transformation || {};

    const systemPrompt = `You are an expert content strategist for YouTube creators in the coaching/info-product space.

Your task is to research a Twitter/X profile and suggest ONE compelling video topic idea that would:
1. Resonate with their audience (based on their niche and ICP)
2. Showcase their unique expertise or mechanism
3. Address a key pain point or aspiration
4. Have high potential for engagement

Return ONLY the topic idea as a single sentence or phrase. No explanation, no quotes, no formatting.
Examples of good topic ideas:
- "How to build a 6-figure coaching business without paid ads"
- "The counterintuitive reason most agency owners plateau at $20k/month"
- "Why your content isn't converting (and the simple fix)"`;

    const userPrompt = `Research the Twitter/X profile @${cleanUsername} and suggest ONE compelling video topic idea.

BUSINESS CONTEXT (if available):
- Business: ${business.name || 'Unknown'} (${business.type || 'coaching'})
- Unique Mechanism: ${business.unique_mechanism || 'Not specified'}
- Main Offer Outcome: ${offer.main_outcome || 'Not specified'}
- Target Audience: ${icp.demographics?.profession_or_role || 'Not specified'}
- Primary Pain Point: ${painPoints.primary_problem || 'Not specified'}
- Transformation Promise: ${transformation.to_state?.outcome || 'Not specified'}

Based on this profile and context, what's ONE video topic that would perform well for this creator?`;

    console.log('[generate-topic-idea] Getting topic for @' + cleanUsername);

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-0709',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        search: { mode: 'auto' }, // Enable web search for profile research
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-topic-idea] API error:', response.status, errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const topic = data.choices?.[0]?.message?.content?.trim();

    if (!topic) {
      throw new Error('No topic in API response');
    }

    console.log('[generate-topic-idea] Generated topic:', topic);

    return new Response(
      JSON.stringify({ topic }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[generate-topic-idea] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate topic idea';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
