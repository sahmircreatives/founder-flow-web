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

interface ToneSummary {
  one_sentence_voice: string;
  tone_rules: string[];
  do_phrases: string[];
  dont_phrases: string[];
  cadence_notes: string[];
  example_lines: string[];
}

interface ContextUseLog {
  tweet_proof_items_used: number;
  tweet_proof_items: string[];
  sections: { name: string; non_tweet_value_points: number }[];
  rag_examples_used?: {
    hooks: string[];
    body: string[];
    cta: string[];
    proof: string[];
    objection: string[];
  };
}

interface ValidationResult {
  passed: boolean;
  issues: string[];
}

interface RAGExample {
  id: string;
  content: string;
  source: string;
  quality_notes: string;
  similarity: number;
}

interface RAGResults {
  hooks: RAGExample[];
  body_sections: RAGExample[];
  cta_sections: RAGExample[];
  proof_sections: RAGExample[];
  objection_handlers: RAGExample[];
}

// Build RAG examples section for the prompt
function buildExamplesSection(retrieved: RAGResults): string {
  let section = '';
  
  if (retrieved.hooks?.length > 0) {
    section += `HOOK EXAMPLES:\n`;
    retrieved.hooks.forEach((hook, i) => {
      section += `---\nExample ${i + 1} (similarity: ${hook.similarity?.toFixed(2) || 'N/A'}):\n"${hook.content}"\nSource: ${hook.source || 'Unknown'}\n---\n`;
    });
    section += `↳ Pattern from: Opening structure, curiosity loop setup, pacing\n\n`;
  }
  
  if (retrieved.body_sections?.length > 0) {
    section += `BODY EXAMPLES:\n`;
    retrieved.body_sections.forEach((body, i) => {
      section += `---\nExample ${i + 1} (similarity: ${body.similarity?.toFixed(2) || 'N/A'}):\n"${body.content}"\nSource: ${body.source || 'Unknown'}\n---\n`;
    });
    section += `↳ Pattern from: How points are explained, transitions, depth of value\n\n`;
  }
  
  if (retrieved.cta_sections?.length > 0) {
    section += `CTA EXAMPLE:\n"${retrieved.cta_sections[0].content}"\nSource: ${retrieved.cta_sections[0].source || 'Unknown'}\n`;
    section += `↳ Pattern from: Transition into offer, tone, urgency level\n\n`;
  }
  
  if (retrieved.proof_sections?.length > 0) {
    section += `PROOF EXAMPLE:\n"${retrieved.proof_sections[0].content}"\nSource: ${retrieved.proof_sections[0].source || 'Unknown'}\n`;
    section += `↳ Pattern from: How results are presented, specificity\n\n`;
  }
  
  if (retrieved.objection_handlers?.length > 0) {
    section += `OBJECTION HANDLER EXAMPLE:\n"${retrieved.objection_handlers[0].content}"\nSource: ${retrieved.objection_handlers[0].source || 'Unknown'}\n`;
    section += `↳ Pattern from: How objection is acknowledged and reframed\n\n`;
  }
  
  return section;
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
        model: "claude-opus-4-5-20251101",
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
        model: "claude-opus-4-5-20251101",
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

// Stage 3: Tone Distillation - Extract pure style/voice from tweets
async function runToneDistillationStage(tweets: string): Promise<ToneSummary> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  
  const defaultTone: ToneSummary = {
    one_sentence_voice: "Professional yet conversational tone",
    tone_rules: [],
    do_phrases: [],
    dont_phrases: [],
    cadence_notes: [],
    example_lines: []
  };

  if (!ANTHROPIC_API_KEY || !tweets || tweets.trim().length === 0) {
    console.log("No tweets provided for tone distillation, using defaults");
    return defaultTone;
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
        model: "claude-opus-4-5-20251101",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `You are a voice/tone analyst. Extract PURE STYLE PATTERNS from these tweets. 

CRITICAL: This is STYLE ONLY. Do NOT extract:
- Facts, statistics, or claims
- Proof points or evidence
- Specific examples or case studies
- Anything that could be used as "proof" in content

ONLY extract writing patterns, cadence, and personality.

TWEETS:
${tweets}

Return a JSON object with these fields (respect hard caps):
{
  "one_sentence_voice": "A single sentence describing the overall voice/personality",
  "tone_rules": ["max 10 rules about HOW they write - e.g., 'Uses short punchy sentences', 'Starts with questions'"],
  "do_phrases": ["max 10 phrases/words they frequently use"],
  "dont_phrases": ["max 10 phrases/words they avoid or wouldn't use"],
  "cadence_notes": ["Notes about rhythm, paragraph length, sentence structure"],
  "example_lines": ["max 6 short example lines that capture the style - STRIP any facts/stats"]
}

HARD CAPS: 
- tone_rules: max 10 items
- do_phrases: max 10 items  
- dont_phrases: max 10 items
- example_lines: max 6 items

Return ONLY valid JSON.`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("Tone distillation failed:", response.status);
      return defaultTone;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        one_sentence_voice: result.one_sentence_voice || defaultTone.one_sentence_voice,
        tone_rules: (result.tone_rules || []).slice(0, 10),
        do_phrases: (result.do_phrases || []).slice(0, 10),
        dont_phrases: (result.dont_phrases || []).slice(0, 10),
        cadence_notes: result.cadence_notes || [],
        example_lines: (result.example_lines || []).slice(0, 6),
      };
    }

    return defaultTone;
  } catch (error) {
    console.error("Tone distillation error:", error);
    return defaultTone;
  }
}

// Validate script against hard rules - now includes tweet-proof checks
function validateScript(
  script: string, 
  alignedClaims: SupportedClaim[], 
  contextUseLog: ContextUseLog
): ValidationResult {
  const issues: string[] = [];

  // Rule 1: Max 2 tweet-based proof items
  if (contextUseLog.tweet_proof_items_used > 2) {
    issues.push(`Too many tweet-based proof items (${contextUseLog.tweet_proof_items_used}/2 max)`);
  }

  // Rule 2: Each section needs 2+ non-tweet value points
  for (const section of contextUseLog.sections) {
    if (section.non_tweet_value_points < 2) {
      issues.push(`${section.name} section has only ${section.non_tweet_value_points} non-tweet value points (need 2+)`);
    }
  }

  // Rule 3: Check for unsourced factual claims
  const factualPatterns = [
    /\d+%\s+of/gi,
    /studies\s+show/gi,
    /research\s+(indicates|shows|proves)/gi,
    /according\s+to/gi,
    /data\s+shows/gi,
  ];
  
  let factualClaimCount = 0;
  for (const pattern of factualPatterns) {
    const matches = script.match(pattern);
    if (matches) {
      factualClaimCount += matches.length;
    }
  }
  
  if (factualClaimCount > alignedClaims.length) {
    issues.push("More factual claims in script than research-backed claims available");
  }

  // Rule 4: No direct tweet quotes (check for quotation patterns that look like tweets)
  const tweetQuotePatterns = [
    /"[^"]{50,}"/g, // Long quoted text
    /as I tweeted/gi,
    /I wrote on (twitter|x)/gi,
  ];
  
  for (const pattern of tweetQuotePatterns) {
    if (pattern.test(script)) {
      issues.push("Possible direct tweet quote detected - paraphrase instead");
    }
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

// Stage 4: Script Generation with tone summary and validation
async function runScriptStage(
  topic: string,
  contextProfile: any,
  toneSummary: ToneSummary,
  tweets: string,
  constraints: any,
  researchPack: ResearchPack,
  alignedClaims: SupportedClaim[],
  ragExamplesSection: string = "",
  ragResults: RAGResults | null = null
): Promise<{ script: string; validation: ValidationResult; contextUseLog: ContextUseLog }> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const vsl = contextProfile?.vsl_context || {};
  const targetMinutes = vsl.script_specifications?.target_length?.minutes || 10;

  // Build RAG section if examples are available
  const ragSection = ragExamplesSection ? `
=== REFERENCE EXAMPLES (Pattern from these - do not copy verbatim) ===
${ragExamplesSection}
` : "";

  const scriptPrompt = `You are an expert YouTube scriptwriter creating a research-backed, high-converting script.

=== TOPIC ===
${topic || contextProfile?.video_title || "YouTube Video Script"}
${ragSection}

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

=== EXTRACTED TONE/VOICE (USE FOR STYLE) ===
Voice Summary: ${toneSummary.one_sentence_voice}

Tone Rules:
${toneSummary.tone_rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Do Use These Phrases/Patterns:
${toneSummary.do_phrases.join(', ') || 'None specified'}

Avoid These Phrases/Patterns:
${toneSummary.dont_phrases.join(', ') || 'None specified'}

Cadence Notes:
${toneSummary.cadence_notes.join('; ') || 'Natural flow'}

Example Lines (for style reference):
${toneSummary.example_lines.map(l => `"${l}"`).join('\n')}

=== HARD RULES - MUST FOLLOW ===
1. TWEETS ARE FOR VOICE ONLY: Use the tone summary above to match phrasing and style. Do NOT cite tweets as evidence.

2. MAX 2 TWEET-BASED PROOF MOMENTS: You may use personal observations/experiences from tweets at most 2 times in the entire script. These MUST be:
   - Paraphrased (no direct quotes)
   - Framed as "personal observation" or "in my experience" - NOT as objective fact
   - Noted in your output

3. EACH SECTION MUST HAVE 2+ NON-TWEET VALUE POINTS: Every major section needs at least 2 value points that are NOT from tweets:
   - A mechanism or step-by-step process
   - A specific pitfall or mistake to avoid
   - An original example or case study
   - A research-backed statistic (from the claims above)

4. FACTUAL CLAIMS NEED SOURCES: Any claim with numbers, percentages, "studies show", or "research indicates" MUST reference one of the research-backed claims above. If you can't tie it to a source, DO NOT USE IT.

5. NO STATS/PERCENTAGES WITHOUT SOURCES: If no external sources are provided, do NOT use any statistics or "studies show/data shows" language.

6. NO GENERIC ADVICE: Every point must be specific to THIS audience and THIS offer.

7. REFERENCE EXAMPLES ARE FOR STRUCTURE ONLY: If reference examples are provided, pattern from their structure, pacing, and flow - do NOT copy verbatim.

8. MATCH PACING AND FLOW OF EXAMPLES: Use the reference examples to understand effective patterns, not to replicate words.

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

=== OUTPUT FORMAT ===
Return a JSON object with:
{
  "script": "The complete script text with ## headers and [TIMESTAMP] markers",
  "context_use_log": {
    "tweet_proof_items_used": <number 0-2>,
    "tweet_proof_items": ["brief description of each tweet-based proof used"],
    "sections": [
      { "name": "Hook", "non_tweet_value_points": <number> },
      { "name": "Problem", "non_tweet_value_points": <number> },
      { "name": "Mechanism", "non_tweet_value_points": <number> },
      { "name": "Steps", "non_tweet_value_points": <number> },
      { "name": "Mistakes", "non_tweet_value_points": <number> },
      { "name": "CTA", "non_tweet_value_points": <number> }
    ],
    "rag_examples_used": {
      "hooks": ["source names used"],
      "body": ["source names used"],
      "cta": ["source names used"],
      "proof": ["source names used"],
      "objection": ["source names used"]
    }
  }
}

Return ONLY valid JSON.`;

  console.log("Generating script with tone summary...");

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
  const text = data.content?.[0]?.text || "";
  
  // Parse JSON response
  let script = "";
  let contextUseLog: ContextUseLog = {
    tweet_proof_items_used: 0,
    tweet_proof_items: [],
    sections: [
      { name: "Hook", non_tweet_value_points: 2 },
      { name: "Problem", non_tweet_value_points: 2 },
      { name: "Mechanism", non_tweet_value_points: 2 },
      { name: "Steps", non_tweet_value_points: 2 },
      { name: "Mistakes", non_tweet_value_points: 2 },
      { name: "CTA", non_tweet_value_points: 2 }
    ],
    rag_examples_used: ragResults ? {
      hooks: ragResults.hooks?.map(h => h.source || 'Unknown') || [],
      body: ragResults.body_sections?.map(b => b.source || 'Unknown') || [],
      cta: ragResults.cta_sections?.map(c => c.source || 'Unknown') || [],
      proof: ragResults.proof_sections?.map(p => p.source || 'Unknown') || [],
      objection: ragResults.objection_handlers?.map(o => o.source || 'Unknown') || []
    } : undefined
  };

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      script = parsed.script || text;
      if (parsed.context_use_log) {
        contextUseLog = parsed.context_use_log;
      }
    } else {
      script = text;
    }
  } catch {
    console.log("Could not parse JSON response, using raw text");
    script = text;
  }

  // Validate the script
  let validation = validateScript(script, alignedClaims, contextUseLog);

  // If validation fails, run bias corrector pass
  if (!validation.passed) {
    console.log("Validation failed, running bias corrector...");
    const corrected = await runBiasCorrectorPass(script, validation.issues, alignedClaims, contextUseLog, ANTHROPIC_API_KEY);
    script = corrected.script;
    contextUseLog = corrected.contextUseLog;
    validation = validateScript(script, alignedClaims, contextUseLog);
  }

  return { script, validation, contextUseLog };
}

// Bias Corrector Pass - now returns updated context use log
async function runBiasCorrectorPass(
  script: string, 
  issues: string[], 
  alignedClaims: SupportedClaim[],
  contextUseLog: ContextUseLog,
  apiKey: string
): Promise<{ script: string; contextUseLog: ContextUseLog }> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5-20251101",
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

CURRENT CONTEXT LOG:
${JSON.stringify(contextUseLog, null, 2)}

INSTRUCTIONS:
1. Fix each validation issue
2. If there are too many tweet-proof items (>2), remove some and replace with research claims or original examples
3. If sections lack non-tweet value points, add mechanisms/steps/pitfalls/examples
4. Remove any unsourced factual claims (statistics, "studies show", etc.)
5. Ensure every research claim has a [CITE: url] tag
6. Preserve the voice and flow of the original

Return a JSON object:
{
  "script": "The COMPLETE corrected script",
  "context_use_log": {
    "tweet_proof_items_used": <updated count>,
    "tweet_proof_items": [<updated list>],
    "sections": [<updated section counts>]
  }
}

Return ONLY valid JSON.`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("Bias corrector failed:", response.status);
      return { script, contextUseLog };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          script: parsed.script || script,
          contextUseLog: parsed.context_use_log || contextUseLog
        };
      }
    } catch {
      console.log("Could not parse corrector response");
    }
    
    return { script, contextUseLog };
  } catch (error) {
    console.error("Bias corrector error:", error);
    return { script, contextUseLog };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, context_profile, tweets, constraints } = await req.json();
    
    console.log("=== GENERATE SCRIPT V3 (5-STAGE WITH RAG) ===");
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

    // Stage 3: Tone Distillation
    console.log("Stage 3: Running tone distillation...");
    const toneSummary = await runToneDistillationStage(tweets || "");
    console.log(`Tone distilled: "${toneSummary.one_sentence_voice}"`);

    // Stage 3.5: RAG Retrieval
    console.log("Stage 3.5: Running RAG retrieval...");
    let ragResults: RAGResults = { hooks: [], body_sections: [], cta_sections: [], proof_sections: [], objection_handlers: [] };
    let ragExamplesSection = "";
    
    try {
      const bc = context_profile?.business_context || {};
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      
      if (SUPABASE_URL) {
        const ragResponse = await fetch(`${SUPABASE_URL}/functions/v1/rag-retrieve`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
          body: JSON.stringify({
            video_title: topic || context_profile?.video_title || "",
            niche: bc.industry?.niche || "",
            sub_niche: bc.industry?.sub_niche || "",
            offer_type: bc.offer?.offer_type || "",
            profession: bc.icp?.demographics?.profession_or_role || "",
            primary_problem: bc.icp_pain_points?.primary_problem || "",
            first_objection: bc.icp_pain_points?.common_objections?.[0] || "",
          }),
        });
        
        if (ragResponse.ok) {
          const ragData = await ragResponse.json();
          ragResults = ragData.retrieved_examples || ragResults;
          ragExamplesSection = buildExamplesSection(ragResults);
          console.log(`RAG retrieved: ${ragResults.hooks.length} hooks, ${ragResults.body_sections.length} body, ${ragResults.cta_sections.length} cta`);
        }
      }
    } catch (ragError) {
      console.log("RAG retrieval failed (continuing without):", ragError);
    }

    // Stage 4: Script Generation (with RAG examples)
    console.log("Stage 4: Generating script...");
    const { script, validation, contextUseLog } = await runScriptStage(
      topic,
      context_profile,
      toneSummary,
      tweets || "",
      constraints || {},
      researchPack,
      alignedClaims,
      ragExamplesSection,
      ragResults
    );
    console.log("Script generated, validation passed:", validation.passed);

    return new Response(JSON.stringify({
      script,
      research_pack: {
        sources: researchPack.sources,
        claims: alignedClaims,
      },
      alignment_checklist: checklist,
      tone_summary: toneSummary,
      context_use_log: contextUseLog,
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
