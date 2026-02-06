import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupportedClaim {
  claim: string;
  source_url: string;
  relevance_score: number;
}

interface ScriptStructure {
  sections: {
    name: string;
    purpose: string;
    key_points: string[];
    claims_to_use: number[];
    word_count_target: number;
  }[];
  retention_map: {
    open_loops: { location: string; loop_description: string; closes_at: string }[];
    re_hooks: { after_section: string; re_hook_approach: string }[];
    pattern_interrupts: { location: string; type: string; description: string }[];
  };
  mega_payoff: {
    section: string;
    insight: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, context_profile, aligned_claims, target_length, rag_examples_section } = await req.json();
    
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    console.log("=== SCRIPT STRUCTURE (Stage 4A) ===");
    console.log("Topic:", topic);

    const bc = context_profile?.business_context || {};
    const business = bc.business || {};
    const offer = bc.offer || {};
    const creator = bc.creator || {};
    const icp = bc.icp || {};
    const icpPainPoints = bc.icp_pain_points || {};

    const alignedClaims: SupportedClaim[] = aligned_claims || [];
    const claimsList = alignedClaims.map((c: SupportedClaim, i: number) => `[${i}] ${c.claim}`).join('\n');

    const prompt = `You are a YouTube script architect. Create a detailed structure for a ${target_length || 10}-minute script.

TOPIC: ${topic}

AVAILABLE RESEARCH CLAIMS (reference by index number):
${claimsList || "No research claims - use original insights only."}

CONTEXT:
- Business: ${business.name || 'Not specified'} - ${business.description || ''}
- Offer: ${offer.name || 'Not specified'} - ${offer.main_outcome || ''}
- Creator credibility: ${creator.credibility_claim || 'Not specified'}
- ICP: ${icp.demographics?.profession_or_role || 'Not specified'} at ${icp.demographics?.business_stage || 'various'} stage
- Primary problem: ${icpPainPoints.primary_problem || 'Not specified'}
- Root cause: ${icpPainPoints.root_cause || 'Not specified'}

${rag_examples_section ? `REFERENCE EXAMPLES (for structure patterns only):\n${rag_examples_section}` : ''}

CREATE A SCRIPT STRUCTURE WITH:

1. 8 SECTIONS: hook, setup_credibility, value_1, value_2, value_3_bridge, soft_pivot, cta, outro
   - For each: purpose, 3-5 key points to cover, which research claims to use (by index), word count target

2. RETENTION MAP:
   - 2 open loops (where they open, what they tease, where they close)
   - 3-4 re-hooks (transition phrases between sections that promise value)
   - 2 pattern interrupts (where to shift energy, what type: story/question/tone_shift/surprising_stat)

3. MEGA PAYOFF: Which section contains the best insight and what it is

SECTION GUIDELINES:
- hook: 50-80 words, open first loop
- setup_credibility: 80-120 words, roadmap + second loop
- value_1: 300-400 words, second-best insight
- value_2: 350-500 words, MEGA PAYOFF section, best insight
- value_3_bridge: 250-350 words, third insight + bridge to pivot
- soft_pivot: 80-120 words, gentle acknowledgment
- cta: 100-150 words, close loops + offer
- outro: 40-60 words

Return JSON:
{
  "sections": [
    {
      "name": "hook",
      "purpose": "...",
      "key_points": ["point 1", "point 2", "point 3"],
      "claims_to_use": [0, 2],
      "word_count_target": 60
    }
  ],
  "retention_map": {
    "open_loops": [
      { "location": "hook", "loop_description": "...", "closes_at": "cta" }
    ],
    "re_hooks": [
      { "after_section": "value_1", "re_hook_approach": "..." }
    ],
    "pattern_interrupts": [
      { "location": "value_2", "type": "story", "description": "..." }
    ]
  },
  "mega_payoff": {
    "section": "value_2",
    "insight": "..."
  }
}

Return ONLY valid JSON.`;

    console.log("Calling Claude for structure...");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Structure stage failed:", response.status, errorText);
      throw new Error("Structure stage failed");
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    
    let structure: ScriptStructure;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structure = JSON.parse(jsonMatch[0]);
        console.log("Structure generated with", structure.sections?.length || 0, "sections");
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (e) {
      console.error("Failed to parse structure:", e);
      throw new Error("Could not parse structure response");
    }

    return new Response(JSON.stringify({ structure }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Script structure error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate structure";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
