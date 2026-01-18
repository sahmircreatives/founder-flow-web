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

    const systemPrompt = `You are a business intelligence analyst with full web access. Your job is to research X/Twitter creators and extract their complete business profile.

RESEARCH PROCESS:
1. Search for @${cleanUsername} on X/Twitter 
2. Analyze their profile bio, pinned posts, recent tweets, and linked websites
3. Look for their landing pages, Calendly links, YouTube, podcast appearances
4. Extract pricing from sales pages, tweets about their offer, or testimonials

EXTRACTION GUIDANCE (be thorough like a sales researcher):

FOR PRICING/OFFER DETAILS:
- Look at their link-in-bio landing pages
- Search for tweets where they mention prices ("$X/month", "invest $X")
- Check testimonials for pricing clues
- Look for "DM me" offers and what they pitch in replies
- If they have a "book a call" page, note what service level they offer

FOR UNIQUE MECHANISM:
- What specific METHOD or SYSTEM do they use?
- Do they have a proprietary framework, tool, or process?
- Look for phrases like "my system", "our method", "proprietary", "framework"
- Check pinned tweets and threads for their approach

FOR CREDIBILITY:
- Client count, revenue claims, years of experience
- Notable clients or case studies mentioned
- Metrics they share (meetings booked, revenue generated for clients)

INFERENCE IS ALLOWED when reasonable:
- If they target "agency owners" and offer "done-for-you cold email", you can INFER pricing is likely high-ticket ($2k-10k/month) based on industry norms
- If their bio says "100+ clients" with DFY service, INFER they have case studies even if not explicitly linked
- Mark inferred data with "INFERRED: " prefix

ONLY use "UNKNOWN" when:
- You genuinely cannot find OR reasonably infer the information
- The person is too new/small to have established patterns

ENUM FIELDS - Use ONLY these values:
- business.type: coaching | agency | saas | ecommerce | info_product | service | personal_brand
- offer.offer_type: high_ticket | mid_ticket | low_ticket | community | free_lead_magnet
- offer.pricing_structure: one_time | monthly | annual | payment_plan
- offer.delivery_method: done_for_you | done_with_you | course | coaching | software | community | physical_product
- icp.demographics.business_stage: pre_revenue | side_hustle | full_time | scaling | established
- icp.demographics.experience_level: beginner | intermediate | advanced
- icp.awareness_level.*: yes | no | partially
- industry.competition_level: low | medium | high

Return ONLY valid JSON - no markdown, no code fences.`;

    const userPrompt = `Research @${cleanUsername} on X/Twitter thoroughly. ${websiteUrl ? `Also research: ${websiteUrl}` : ''}

Look at:
- Their X profile (bio, display name, pinned tweet)
- Their website/landing page if linked
- Recent tweets about their offer, pricing, results
- Any podcasts, YouTube, or threads where they explain their business
- Testimonials or case studies they've shared

Fill this template as COMPLETELY as possible. Use "INFERRED: " prefix for reasonable inferences. Only use "UNKNOWN" for truly unknowable fields:

${JSON.stringify(template, null, 2)}

Include "_source_verification" with key quotes/facts you found.
Return completed JSON only.`;

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
