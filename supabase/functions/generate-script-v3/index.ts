import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResearchSource {
  title: string;
  url: string;
  date?: string;
  snippet: string;
}

interface SupportedClaim {
  claim: string;
  source_url: string;
  relevance_score: number;
}

interface ResearchPack {
  sources: ResearchSource[];
  claims: SupportedClaim[];
}

interface AlignmentChecklist {
  audience_match: string;
  offer_relevance: string;
  pain_point_addressed: string;
  cta_alignment: string;
  filtered_claims_count: number;
  original_claims_count: number;
}

interface ValidationResult {
  passed: boolean;
  issues: string[];
}

// Stage 1: Research - Use Perplexity to get grounded sources
async function runResearchStage(topic: string, contextProfile: any): Promise<ResearchPack> {
  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  
  if (!PERPLEXITY_API_KEY) {
    console.error("PERPLEXITY_API_KEY not configured, using fallback research");
    return { sources: [], claims: [] };
  }

  const audience = contextProfile?.vsl_context?.target_audience?.demographics || {};
  const industry = contextProfile?.vsl_context?.industry_niche || {};
  
  const searchQuery = `${topic} for ${audience.profession || 'professionals'} in ${industry.primary_industry || 'business'} - latest research, statistics, case studies, proven strategies`;

  console.log("Running Perplexity research for:", searchQuery);

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: `You are a research assistant. Find factual, citable information about the topic. Focus on:
- Recent statistics and data (with percentages, numbers)
- Case studies and real examples
- Expert opinions with attribution
- Proven strategies with measurable results
- Common mistakes and pitfalls backed by data

Return your findings in a structured format that clearly attributes each fact to its source.`
          },
          {
            role: "user",
            content: searchQuery
          }
        ],
        search_recency_filter: "year",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", response.status, errorText);
      return { sources: [], claims: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const citations = data.citations || [];

    console.log("Perplexity returned", citations.length, "citations");

    // Build sources from citations
    const sources: ResearchSource[] = citations.slice(0, 10).map((url: string, idx: number) => ({
      title: `Source ${idx + 1}`,
      url: url,
      snippet: "Research source from Perplexity search",
    }));

    // Now extract specific claims using Claude
    const claims = await extractClaimsFromResearch(content, citations);

    return { sources, claims };
  } catch (error) {
    console.error("Research stage error:", error);
    return { sources: [], claims: [] };
  }
}

// Extract structured claims from research content
async function extractClaimsFromResearch(researchContent: string, citations: string[]): Promise<SupportedClaim[]> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  
  if (!ANTHROPIC_API_KEY) {
    return [];
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `Extract 5-12 specific, factual claims from this research that could be used in a YouTube script. Each claim MUST include a statistic, percentage, study reference, or concrete example.

RESEARCH CONTENT:
${researchContent}

AVAILABLE SOURCE URLS:
${citations.map((url, i) => `[${i + 1}] ${url}`).join('\n')}

Return a JSON array of claims. Each claim should have:
- "claim": the factual statement (include the number/statistic)
- "source_url": best matching URL from the list above
- "relevance_score": 1-10 rating of how impactful this claim is

Example format:
[
  {"claim": "78% of buyers prefer video content over text when learning about products", "source_url": "https://example.com", "relevance_score": 9}
]

Return ONLY valid JSON, no other text.`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("Claims extraction failed:", response.status);
      return [];
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "[]";
    
    // Parse JSON safely
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const claims = JSON.parse(jsonMatch[0]);
      return claims.filter((c: any) => c.claim && c.source_url);
    }
    return [];
  } catch (error) {
    console.error("Claims extraction error:", error);
    return [];
  }
}

// Stage 2: Alignment - Filter claims to match user's specific context
async function runAlignmentStage(
  researchPack: ResearchPack, 
  contextProfile: any
): Promise<{ alignedClaims: SupportedClaim[]; checklist: AlignmentChecklist }> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  
  const vsl = contextProfile?.vsl_context || {};
  const audience = vsl.target_audience || {};
  const product = vsl.product_service || {};
  const problem = vsl.core_problem || {};
  const transformation = vsl.transformation_promise || {};

  const originalCount = researchPack.claims.length;

  if (!ANTHROPIC_API_KEY || originalCount === 0) {
    return {
      alignedClaims: [],
      checklist: {
        audience_match: "No claims to align",
        offer_relevance: "N/A",
        pain_point_addressed: "N/A",
        cta_alignment: "N/A",
        filtered_claims_count: 0,
        original_claims_count: originalCount,
      }
    };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: `You are an alignment specialist. Filter and rewrite research claims to ONLY include those directly relevant to this specific audience and offer. Remove anything generic.

CONTEXT PROFILE:
- Product: ${product.name} (${product.type}) - ${product.description}
- Target Audience: ${audience.demographics?.profession || 'professionals'}, ${audience.demographics?.age_range || 'adults'}, ${audience.demographics?.experience_level || 'various levels'}
- Primary Pain Point: ${problem.primary_pain_point || 'unspecified'}
- Desired Transformation: From "${transformation.from_state?.current_situation || 'current state'}" to "${transformation.to_state?.desired_outcome || 'desired state'}"
- Industry: ${vsl.industry_niche?.primary_industry || 'business'} / ${vsl.industry_niche?.sub_niche || 'general'}

RESEARCH CLAIMS TO FILTER:
${JSON.stringify(researchPack.claims, null, 2)}

INSTRUCTIONS:
1. REMOVE any claim that doesn't directly relate to this audience's specific situation
2. REMOVE generic advice that applies to everyone
3. REWRITE remaining claims to speak directly to this audience
4. Keep the source_url intact for each claim

Return a JSON object with:
{
  "aligned_claims": [array of filtered claims with claim, source_url, relevance_score],
  "checklist": {
    "audience_match": "How these claims match the target audience",
    "offer_relevance": "How claims support the product/service",
    "pain_point_addressed": "Which pain points are validated by research",
    "cta_alignment": "How claims build toward the transformation promise"
  }
}

Return ONLY valid JSON.`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("Alignment stage failed:", response.status);
      return {
        alignedClaims: researchPack.claims,
        checklist: {
          audience_match: "Alignment failed - using original claims",
          offer_relevance: "N/A",
          pain_point_addressed: "N/A",
          cta_alignment: "N/A",
          filtered_claims_count: originalCount,
          original_claims_count: originalCount,
        }
      };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        alignedClaims: result.aligned_claims || [],
        checklist: {
          ...result.checklist,
          filtered_claims_count: result.aligned_claims?.length || 0,
          original_claims_count: originalCount,
        }
      };
    }

    return {
      alignedClaims: researchPack.claims,
      checklist: {
        audience_match: "Parse failed",
        offer_relevance: "N/A",
        pain_point_addressed: "N/A", 
        cta_alignment: "N/A",
        filtered_claims_count: originalCount,
        original_claims_count: originalCount,
      }
    };
  } catch (error) {
    console.error("Alignment error:", error);
    return {
      alignedClaims: researchPack.claims,
      checklist: {
        audience_match: "Error occurred",
        offer_relevance: "N/A",
        pain_point_addressed: "N/A",
        cta_alignment: "N/A",
        filtered_claims_count: originalCount,
        original_claims_count: originalCount,
      }
    };
  }
}

// Validate script against hard rules
function validateScript(script: string, alignedClaims: SupportedClaim[], tweets: string): ValidationResult {
  const issues: string[] = [];

  // Rule 1: Check if tweets are being used as evidence (not just voice)
  const tweetSnippets = tweets.split('\n').filter(t => t.trim().length > 20);
  for (const snippet of tweetSnippets) {
    const shortSnippet = snippet.slice(0, 50);
    if (script.toLowerCase().includes("studies show") || 
        script.toLowerCase().includes("research proves") ||
        script.toLowerCase().includes("data shows")) {
      // Check if the claim near these phrases is backed by a source
      const claimUrls = alignedClaims.map(c => c.source_url);
      if (claimUrls.length === 0) {
        issues.push("Script contains factual claims without research backing");
      }
    }
  }

  // Rule 2: Each section needs 2+ non-tweet value points
  const sections = script.split(/#{2,3}\s/);
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const hasStatistic = /\d+%|\d+x|\$\d+/.test(section);
    const hasMechanism = /step|process|method|framework|system/i.test(section);
    const hasExample = /example|case study|client|result/i.test(section);
    
    if (!hasStatistic && !hasMechanism && !hasExample) {
      issues.push(`Section ${i} may lack concrete value points (mechanisms/steps/examples)`);
    }
  }

  // Rule 3: Factual claims need source attribution
  const factualPatterns = [
    /\d+%\s+of/gi,
    /studies\s+show/gi,
    /research\s+(indicates|shows|proves)/gi,
    /according\s+to/gi,
  ];
  
  for (const pattern of factualPatterns) {
    const matches = script.match(pattern);
    if (matches && matches.length > alignedClaims.length) {
      issues.push("More factual claims in script than research-backed claims available");
      break;
    }
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

// Stage 3: Script Generation with validation
async function runScriptStage(
  topic: string,
  contextProfile: any,
  tweets: string,
  constraints: any,
  researchPack: ResearchPack,
  alignedClaims: SupportedClaim[]
): Promise<{ script: string; validation: ValidationResult }> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const vsl = contextProfile?.vsl_context || {};
  const targetMinutes = vsl.vsl_specifications?.target_length?.minutes || 10;

  const scriptPrompt = `You are an expert YouTube scriptwriter creating a research-backed, high-converting script.

=== TOPIC ===
${topic || contextProfile?.video_title || "YouTube Video Script"}

=== RESEARCH-BACKED CLAIMS (USE THESE FOR FACTS) ===
${alignedClaims.map((c, i) => `[${i + 1}] ${c.claim}
   Source: ${c.source_url}`).join('\n\n')}

=== CONTEXT PROFILE (USE FOR TARGETING) ===
Product/Service: ${vsl.product_service?.name || 'Not specified'} (${vsl.product_service?.type || 'service'})
Description: ${vsl.product_service?.description || 'Not specified'}

Target Audience:
- Demographics: ${vsl.target_audience?.demographics?.profession || 'professionals'}, ${vsl.target_audience?.demographics?.age_range || 'adults'}
- Experience Level: ${vsl.target_audience?.demographics?.experience_level || 'various'}
- Values: ${(vsl.target_audience?.psychographics?.values || []).join(', ') || 'Not specified'}

Core Problem:
- Primary Pain: ${vsl.core_problem?.primary_pain_point || 'Not specified'}
- Keeps Them Up: ${vsl.core_problem?.keeps_them_up_at_night || 'Not specified'}
- Emotional Impact: ${vsl.core_problem?.emotional_impact || 'Not specified'}

Transformation Promise:
- From: ${vsl.transformation_promise?.from_state?.current_situation || 'Current state'}
- To: ${vsl.transformation_promise?.to_state?.desired_outcome || 'Desired outcome'}
- Timeline: ${vsl.transformation_promise?.timeline || 'Not specified'}

CTA: ${vsl.pricing?.value_justification || 'Take action now'}

=== VOICE EXAMPLES (USE FOR PHRASING/CADENCE ONLY - NOT AS PROOF) ===
${tweets || 'No voice examples provided'}

=== HARD RULES - MUST FOLLOW ===
1. TWEETS ARE VOICE ONLY: Use tweet examples ONLY to match phrasing, rhythm, and personal angle. NEVER cite tweets as evidence or proof.

2. EACH SECTION MUST HAVE 2+ VALUE POINTS: Every major section needs at least 2 non-tweet value points:
   - A mechanism or step-by-step process
   - A specific pitfall or mistake to avoid
   - An original example or case study
   - A research-backed statistic (from the claims above)

3. FACTUAL CLAIMS NEED SOURCES: Any claim with numbers, percentages, "studies show", or "research indicates" MUST reference one of the research-backed claims above. If you can't tie it to a source, remove it.

4. NO GENERIC ADVICE: Every point must be specific to THIS audience and THIS offer. No "work smarter not harder" platitudes.

=== SCRIPT STRUCTURE ===
Write a ${targetMinutes}-minute script with:

1. HOOK (15-30 seconds) - Bold promise or contrarian opener
2. CREDIBILITY (30-60 seconds) - Brief proof relevant to this audience
3. PROBLEM (1-2 minutes) - Agitate with specific, researched pain points
4. SOLUTION OVERVIEW (30-60 seconds) - Name and introduce the framework
5. DEEP VALUE (${Math.floor(targetMinutes * 0.6)} minutes) - 3-5 actionable steps with research backing
6. PROOF (Woven throughout) - Use research claims, not tweets
7. OBJECTION HANDLING - Address naturally with data
8. CTA (30-60 seconds) - Clear next step tied to transformation

=== FORMAT ===
- Use ## for section headers
- Include [TIMESTAMP: X:XX] markers
- Add [CITE: source_url] after any research-backed claim
- Do NOT include visual cues or production notes
- Write conversationally but backed by research

Write the complete script now:`;

  console.log("Generating script with research backing...");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [
        { role: "user", content: scriptPrompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Script generation failed:", response.status, errorText);
    throw new Error("Script generation failed");
  }

  const data = await response.json();
  let script = data.content?.[0]?.text || "";

  // Validate the script
  let validation = validateScript(script, alignedClaims, tweets);

  // If validation fails, run bias corrector pass
  if (!validation.passed) {
    console.log("Validation failed, running bias corrector...");
    script = await runBiasCorrectorPass(script, validation.issues, alignedClaims, ANTHROPIC_API_KEY);
    validation = validateScript(script, alignedClaims, tweets);
  }

  return { script, validation };
}

// Bias Corrector Pass
async function runBiasCorrectorPass(
  script: string, 
  issues: string[], 
  alignedClaims: SupportedClaim[],
  apiKey: string
): Promise<string> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        messages: [
          {
            role: "user",
            content: `You are a script editor fixing validation issues. 

CURRENT SCRIPT:
${script}

VALIDATION ISSUES TO FIX:
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

AVAILABLE RESEARCH-BACKED CLAIMS:
${alignedClaims.map((c, i) => `[${i + 1}] ${c.claim} (Source: ${c.source_url})`).join('\n')}

INSTRUCTIONS:
1. Fix each validation issue
2. Remove any unsourced factual claims (statistics, "studies show", etc.)
3. Add more concrete value points to thin sections (mechanisms, steps, examples)
4. Ensure every research claim has a [CITE: url] tag
5. Preserve the voice and flow of the original

Return the COMPLETE corrected script with all fixes applied.`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("Bias corrector failed:", response.status);
      return script;
    }

    const data = await response.json();
    return data.content?.[0]?.text || script;
  } catch (error) {
    console.error("Bias corrector error:", error);
    return script;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, context_profile, tweets, constraints } = await req.json();
    
    console.log("=== GENERATE SCRIPT V3 ===");
    console.log("Topic:", topic || context_profile?.video_title);

    // Stage 1: Research
    console.log("Stage 1: Running research...");
    const researchPack = await runResearchStage(
      topic || context_profile?.video_title || "business growth",
      context_profile
    );
    console.log(`Research found ${researchPack.sources.length} sources, ${researchPack.claims.length} claims`);

    // Stage 2: Alignment
    console.log("Stage 2: Running alignment...");
    const { alignedClaims, checklist } = await runAlignmentStage(researchPack, context_profile);
    console.log(`Alignment kept ${alignedClaims.length} of ${researchPack.claims.length} claims`);

    // Stage 3: Script Generation
    console.log("Stage 3: Generating script...");
    const { script, validation } = await runScriptStage(
      topic,
      context_profile,
      tweets || "",
      constraints || {},
      researchPack,
      alignedClaims
    );
    console.log("Script generated, validation passed:", validation.passed);

    return new Response(JSON.stringify({
      script,
      research_pack: {
        sources: researchPack.sources,
        claims: alignedClaims,
      },
      alignment_checklist: checklist,
      validation: validation,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Generate script v3 error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate script";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
