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

    const systemPrompt = `You are a business research specialist filling structured context for a YouTube VSL script generator.

YOUR TASK:
Research the X/Twitter profile and optional website to extract comprehensive business intelligence. Fill every field with specific, actionable data.

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no code fences, no explanatory text
2. Preserve the exact JSON structure from the template
3. For UNKNOWN data: use "UNKNOWN" (not empty strings)
4. For INFERRED data: prefix with "INFERRED: " followed by your best estimate
5. Arrays must contain at least 2-3 items when data is available
6. Be SPECIFIC - avoid generic filler like "improve results" or "grow business"

ENUM FIELDS - Use ONLY these values:
- business.type: coaching | agency | saas | ecommerce | info_product | service | personal_brand
- offer.offer_type: high_ticket | mid_ticket | low_ticket | community | free_lead_magnet
- offer.pricing_structure: one_time | monthly | annual | payment_plan
- offer.delivery_method: done_for_you | done_with_you | course | coaching | software | community | physical_product
- icp.demographics.business_stage: pre_revenue | side_hustle | full_time | scaling | established
- icp.demographics.experience_level: beginner | intermediate | advanced
- icp.awareness_level.*: yes | no | partially
- industry.competition_level: low | medium | high

PRIORITY RESEARCH AREAS:
1. business.unique_mechanism - What makes their approach different? Look for frameworks, methods, systems
2. offer.main_outcome - The specific transformation/result promised
3. creator.credibility_claim - Their proof of expertise (results, experience, credentials)
4. icp_pain_points.primary_problem - The core struggle their audience faces
5. transformation.proof_points - Specific results, case studies, testimonials mentioned

DO NOT use tweets as factual evidence - focus on bio, pinned content, website, and stated claims.`;

    const userPrompt = `RESEARCH TARGET: @${cleanUsername}
WEBSITE: ${websiteUrl || 'Not provided - research profile only'}

Fill every field in this template with researched data about this creator/business:

${JSON.stringify(template, null, 2)}

Return the completed JSON only.`;

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
        max_tokens: 4000,
        temperature: 0.3,
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
            { role: 'system', content: 'Fix this into valid JSON matching the template exactly. Return JSON only. No markdown. No code fences. Preserve all data.' },
            { role: 'user', content: `Template structure:\n${JSON.stringify(template)}\n\nJSON to fix:\n${content}` }
          ],
          max_tokens: 4000,
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

    // Validate structure - check for business_context key
    if (!parsed.business_context) {
      console.error('[grok-fill-business] Invalid structure: missing business_context');
      throw new Error('Invalid response structure: missing business_context');
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
