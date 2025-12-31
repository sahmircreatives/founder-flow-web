import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCRIPT_FRAMEWORK = `You are writing a direct response YouTube script for online business owners (course creators, info product sellers, coaches).

Use the context files provided to tailor the script specifically to the user's ICP (Ideal Customer Profile).

SCRIPT FRAMEWORK OUTLINE:
1. HOOK - Open with a pattern interrupt, bold claim, or contrarian statement that stops the scroll
2. CREDIBILITY - Briefly establish why they should listen to you
3. PROBLEM - Agitate the core problem with specificity and emotion
4. SOLUTION - Introduce your framework/method with a clear name
5. VALUE DELIVERY - Walk through 3-5 actionable steps with specific examples
6. PROOF - Weave in results, case studies, or personal experience
7. OBJECTION HANDLING - Address doubts naturally in the flow
8. CTA - Clear next step with urgency

CRITICAL RULES:
- Write ONLY the spoken script - no visual cues, no production notes, no [BRACKETS]
- Conversational tone - write how you actually speak
- Every sentence must advance the narrative - zero fluff
- Be specific: use numbers, names, real examples
- Use verbal transitions: "Here's the thing...", "Now...", "But wait..."
- Match the voice/tone from the examples provided

OUTPUT FORMAT:
- Start with the framework outline (numbered sections with brief descriptions)
- Then write the full script with section headers and timestamps based on target length
- Do NOT include any visual directions, camera notes, or production cues`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business, voice, variation } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const vsl = business.vsl_context;
    const videoTitle = business.video_title || "Untitled Video";
    const targetMinutes = vsl.vsl_specifications?.target_length?.minutes || 10;

    // Build the mega prompt
    const megaPrompt = `${SCRIPT_FRAMEWORK}

=== VIDEO TITLE ===
"${videoTitle}"

=== BUSINESS CONTEXT ===
Product/Service: ${vsl.product_service.name} (${vsl.product_service.type})
Description: ${vsl.product_service.description}

Target Audience:
- Demographics: ${vsl.target_audience.demographics.profession}, ${vsl.target_audience.demographics.age_range}, ${vsl.target_audience.demographics.income_level}
- Location: ${vsl.target_audience.demographics.location}
- Experience: ${vsl.target_audience.demographics.experience_level}
- Values: ${vsl.target_audience.psychographics.values.join(", ")}
- Interests: ${vsl.target_audience.psychographics.interests.join(", ")}
- Lifestyle: ${vsl.target_audience.psychographics.lifestyle}
- Personality: ${vsl.target_audience.psychographics.personality_traits.join(", ")}

Core Problem:
- Primary Pain: ${vsl.core_problem.primary_pain_point}
- Keeps Them Up: ${vsl.core_problem.keeps_them_up_at_night}
- Emotional Impact: ${vsl.core_problem.emotional_impact}
- Financial Cost: ${vsl.core_problem.financial_impact}
- Time Cost: ${vsl.core_problem.time_impact}
- Relationship Impact: ${vsl.core_problem.relationship_impact}

Transformation:
- From: ${vsl.transformation_promise.from_state.current_situation}
- Pain Points: ${vsl.transformation_promise.from_state.pain_points.join(", ")}
- Limitations: ${vsl.transformation_promise.from_state.limitations.join(", ")}
- To: ${vsl.transformation_promise.to_state.desired_outcome}
- Benefits: ${vsl.transformation_promise.to_state.benefits.join(", ")}
- New Capabilities: ${vsl.transformation_promise.to_state.new_capabilities.join(", ")}
- Timeline: ${vsl.transformation_promise.timeline}
- Success Metrics: ${vsl.transformation_promise.success_metrics.join(", ")}

Pricing:
- Price Point: ${vsl.pricing.price_point} (${vsl.pricing.currency})
- Range: ${vsl.pricing.price_range.low} - ${vsl.pricing.price_range.high}
- Structure: ${vsl.pricing.payment_structure}
- Value Justification: ${vsl.pricing.value_justification}

Industry:
- Primary: ${vsl.industry_niche.primary_industry}
- Sub-niche: ${vsl.industry_niche.sub_niche}
- Competition: ${vsl.industry_niche.competition_level}
- Market Maturity: ${vsl.industry_niche.market_maturity}

=== VOICE DATA ===
Tone Goals: ${voice.tone_goals.join(", ") || "Professional, Authoritative"}
Do Phrases: ${voice.do_phrases.join("; ") || "None specified"}
Don't Phrases: ${voice.dont_phrases.join("; ") || "None specified"}

Content Examples for Voice Matching:
${voice.tweet_examples || "No examples provided"}

=== INSTRUCTIONS ===
Write a ${targetMinutes}-minute direct response YouTube script for the video titled "${videoTitle}" (variation ${variation}).

Requirements:
1. Use the exact title provided - do NOT create a new title
2. First, output the FRAMEWORK OUTLINE showing your planned structure
3. Then write the FULL SCRIPT with timestamps and section headers
4. Reference the ICP context above to make the script highly specific and tailored
5. Match the voice and tone from the examples provided
6. Use the "do phrases" naturally and avoid the "don't phrases"
7. Write ONLY the spoken words - no visual cues, no brackets, no production notes
8. Be direct, specific, and conversion-focused`;

    console.log("Calling Anthropic API with claude-opus-4-5-20251101...");
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5-20251101",
        max_tokens: 8000,
        system: "You are a direct response YouTube scriptwriter for online business owners. You write conversion-focused scripts without any visual cues, production notes, or bracketed instructions. Output only the spoken script with section headers and timestamps.",
        messages: [
          { role: "user", content: megaPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Invalid API key. Please check your Anthropic API key." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed: " + errorText);
    }

    const data = await response.json();
    console.log("Anthropic response received successfully");
    
    // Anthropic returns content as an array of content blocks
    const script = data.content?.[0]?.text || "";

    return new Response(JSON.stringify({ 
      script,
      context_profile: business,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Generate script error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate script";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
