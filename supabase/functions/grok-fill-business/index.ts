import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const XAI_API_KEY = Deno.env.get('XAI_API_KEY');
    if (!XAI_API_KEY) {
      console.error('XAI_API_KEY is not configured');
      throw new Error('XAI_API_KEY is not configured');
    }

    const { username, websiteUrl, template } = await req.json();
    
    if (!username) {
      throw new Error('Username is required');
    }

    const cleanUsername = username.replace(/^@/, '');
    console.log(`[grok-fill-business] Starting research for @${cleanUsername}`);

    const systemPrompt = `You are a research assistant filling structured business context for a YouTube script generator.
Return ONLY valid JSON. No markdown. No extra text. No code fences.
Preserve the exact JSON keys and nesting from the template.
Do NOT guess: unknown -> "UNKNOWN". Weak inference -> "INFERRED: ..." (short).
Do not use tweets as evidence; tweets are handled separately.
If a field should be an array, return an array. If a field should be a number, return a number.
For enum fields like "type", "payment_structure", "competition_level", "market_maturity", "range" - use only the valid options shown in the template (before the | character).`;

    const userPrompt = `Target: @${cleanUsername}
Optional website/link-in-bio: ${websiteUrl || 'UNKNOWN'}
Task: Fill the JSON template using public info about this person/business. Preserve exact keys/structure. Return JSON only.
Template: ${JSON.stringify(template, null, 2)}`;

    console.log(`[grok-fill-business] Calling xAI API...`);

    const response = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-0709',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[grok-fill-business] xAI API error: ${response.status}`, errorText);
      throw new Error(`xAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('[grok-fill-business] No content in response');
      throw new Error('No content in xAI response');
    }

    console.log(`[grok-fill-business] Raw response received, parsing JSON...`);

    // Try to parse JSON, stripping any markdown code fences
    let parsed;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('[grok-fill-business] Initial parse failed, attempting repair...', parseError);
      
      // Attempt repair with a second call
      const repairResponse = await fetch(XAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${XAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'grok-4-0709',
          messages: [
            { role: 'system', content: 'Fix this into valid JSON matching the template exactly. Return JSON only. No markdown. No code fences.' },
            { role: 'user', content: `Template: ${JSON.stringify(template)}\n\nBroken JSON to fix:\n${content}` }
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      });

      if (!repairResponse.ok) {
        throw new Error('Failed to repair JSON response');
      }

      const repairData = await repairResponse.json();
      const repairedContent = repairData.choices?.[0]?.message?.content;
      
      if (!repairedContent) {
        throw new Error('No content in repair response');
      }

      const cleanRepaired = repairedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanRepaired);
      console.log('[grok-fill-business] JSON repaired successfully');
    }

    // Validate structure matches template (basic check - has vsl_context)
    if (!parsed.vsl_context) {
      console.error('[grok-fill-business] Invalid structure: missing vsl_context');
      throw new Error('Invalid response structure: missing vsl_context');
    }

    console.log(`[grok-fill-business] Successfully filled business context for @${cleanUsername}`);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[grok-fill-business] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
