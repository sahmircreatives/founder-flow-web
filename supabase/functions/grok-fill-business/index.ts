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

    const systemPrompt = `You are a business research specialist. You MUST use web search to look up the actual X/Twitter profile before responding.

YOUR TASK:
1. FIRST: Search the web for "site:x.com ${cleanUsername}" or "twitter.com/${cleanUsername}" to find their ACTUAL profile
2. Read their bio, profile name, pinned tweet, and link-in-bio
3. Fill the template with ONLY information you found from web search

CRITICAL - ANTI-HALLUCINATION RULES:
1. You MUST search the web first - do NOT rely on training data
2. ONLY report what you ACTUALLY see on their profile right now
3. If you cannot find specific information, use "UNKNOWN" - NEVER guess or invent
4. Business name: ONLY use names that appear in their bio/profile. If bio says "Best cold emailer" with no company name, use their personal brand name (their display name)
5. Include "_source_verification" with the EXACT text from the bio where you found each key claim
6. For @jn_jackk example: if bio says "Booking clients meetings with Fortune500 Execs" and "Done-For-You Cold Email", the business is likely "cold email agency" NOT some invented product name

STRICT RULES:
1. Return ONLY valid JSON - no markdown, no code fences
2. For UNKNOWN data: use "UNKNOWN" (not empty strings)
3. For INFERRED data: prefix with "INFERRED: "
4. NEVER fabricate company names, product names, or statistics
5. If the profile has a link like "cal.com/team/X" or similar, research that too

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
1. business.name - EXACT name from bio OR their display name as personal brand
2. business.description - What do they actually DO based on bio text
3. business.unique_mechanism - Their method/framework if stated
4. offer.main_outcome - The transformation they promise
5. creator.credibility_claim - Results/experience they mention`;

    const userPrompt = `SEARCH THE WEB for @${cleanUsername} on X/Twitter.
${websiteUrl ? `Also search/visit: ${websiteUrl}` : ''}

Look at their:
- Profile display name
- Bio text
- Link in bio (if any)
- Pinned tweet (if visible)

Then fill this template with ONLY verified information from your search:

${JSON.stringify(template, null, 2)}

IMPORTANT: Include "_source_verification" field showing the exact bio text you found.
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
        temperature: 0.2,
        search: true, // Enable web search for real-time profile data
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

    // Validate company name extraction - check for source verification
    const businessName = parsed.business_context?.business?.name;
    const sourceVerification = parsed._source_verification;
    
    console.log(`[grok-fill-business] Extracted business name: "${businessName}"`);
    console.log(`[grok-fill-business] Source verification: "${sourceVerification}"`);
    
    // Warn if no source verification was provided (potential hallucination)
    if (businessName && businessName !== 'UNKNOWN' && !businessName.startsWith('INFERRED:') && !sourceVerification) {
      console.warn(`[grok-fill-business] WARNING: Business name "${businessName}" has no source verification - potential hallucination`);
      // Add a flag to the response so frontend can show warning
      parsed._extraction_warnings = parsed._extraction_warnings || [];
      parsed._extraction_warnings.push(`Business name "${businessName}" could not be verified from profile bio`);
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
