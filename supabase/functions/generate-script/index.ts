import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCRIPT_FRAMEWORK = `You are an expert YouTube script writer specializing in high-converting business content.

SCRIPT STRUCTURE:
1. HOOK (First 15-30 seconds) - Pattern interrupt, bold promise, or contrarian statement
2. CREDIBILITY (30-60 seconds) - Brief proof of concept, relevant experience
3. PROBLEM FRAMING (1-2 minutes) - Common mistake, why it fails, hidden cost
4. SOLUTION OVERVIEW (30-60 seconds) - Introduce method, give it a name, contrast with failed approach
5. DEEP DIVE / VALUE (8-12 minutes) - Sequential system with 3-5 steps, specific examples
6. PROOF & VALIDATION - Woven throughout with client results, personal results
7. OBJECTION HANDLING - Address naturally: "Now you might be thinking..."
8. CTA (Last 30-60 seconds) - Recap value, what to do next, why now

WRITING PRINCIPLES:
- Conversational but authoritative
- No fluff - every sentence advances the narrative
- Specific over generic - use numbers, names, examples
- Write how you speak, not essay format
- Include verbal transitions: "Now...", "But here's the thing..."
- Mark emphasis points with [EMPHASIS] and visual cues with [VISUAL CUE]

FORMAT OUTPUT AS:
- Include timestamps based on target length
- Use clear section headers
- Include production notes at the end`;

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
    const targetMinutes = vsl.script_specifications?.target_length?.minutes || 10;

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
Write a ${targetMinutes}-minute YouTube script for the video titled "${videoTitle}" (variation ${variation}) that:
1. Uses the exact title provided - do NOT create a new title
2. Opens with a powerful hook that creates genuine curiosity
3. Establishes credibility within the first 60 seconds
4. Agitates the core problem with specific, emotional language
5. Presents the solution framework clearly
6. Delivers massive value with specific examples
7. Handles objections naturally
8. Ends with a clear, compelling CTA

Match the voice and tone from the examples provided. Use the "do phrases" naturally and avoid the "don't phrases".

Write a direct response YouTube script for online business owners (course creators, info products, coaches) using multiple context files full of my ICP's information.

Follow the project instructions to write the script and make sure to reference the context to tailor to the user.

Don't add visual cues, or anything except the script.`;

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
        system: "You are an expert YouTube scriptwriter who creates high-retention, conversion-focused scripts.",
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
