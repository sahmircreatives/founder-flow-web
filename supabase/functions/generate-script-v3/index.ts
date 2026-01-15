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

interface AlignmentResult {
  filtered_claims_count: number;
  original_claims_count: number;
}

interface ToneSummary {
  one_sentence_voice: string;
  tone_rules: string[];
  writing_patterns: string[];  // Style patterns like "Opens with bold claims", NOT exact phrases
  dont_phrases: string[];
  cadence_notes: string[];
  example_lines: string[];
}

interface RetentionElements {
  open_loops: { location: string; loop: string; closed_at: string }[];
  re_hooks: { after_section: string; re_hook_text: string }[];
  pattern_interrupts: { location: string; type: string }[];
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

// Build RAG examples section for the prompt - updated format
function buildExamplesSection(retrieved: RAGResults): string {
  let section = '';
  
  // Hook examples (show up to 2)
  if (retrieved.hooks?.length > 0) {
    section += `HOOK EXAMPLES:\n`;
    retrieved.hooks.slice(0, 2).forEach((hook, i) => {
      section += `---\nExample ${i + 1} (similarity: ${hook.similarity?.toFixed(2) || 'N/A'}):\n"${hook.content}"\nSource: ${hook.source || 'Unknown'}\n---\n`;
    });
    section += `↳ Pattern from: Opening structure, curiosity loop setup, pacing\n\n`;
  }
  
  // Body/Value examples (show up to 2)
  if (retrieved.body_sections?.length > 0) {
    section += `BODY/VALUE EXAMPLES:\n`;
    retrieved.body_sections.slice(0, 2).forEach((body, i) => {
      section += `---\nExample ${i + 1} (similarity: ${body.similarity?.toFixed(2) || 'N/A'}):\n"${body.content}"\nSource: ${body.source || 'Unknown'}\n---\n`;
    });
    section += `↳ Pattern from: How points are explained, transitions, depth of value\n\n`;
  }
  
  // CTA example (show 1)
  if (retrieved.cta_sections?.length > 0) {
    section += `CTA EXAMPLE:\n---\n"${retrieved.cta_sections[0].content}"\nSource: ${retrieved.cta_sections[0].source || 'Unknown'}\n---\n`;
    section += `↳ Pattern from: Transition into offer, tone, how it feels native\n\n`;
  }
  
  // Proof example (show 1)
  if (retrieved.proof_sections?.length > 0) {
    section += `PROOF EXAMPLE:\n---\n"${retrieved.proof_sections[0].content}"\nSource: ${retrieved.proof_sections[0].source || 'Unknown'}\n---\n`;
    section += `↳ Pattern from: How results are presented, specificity, weaving into value\n\n`;
  }
  
  // Objection handler example (show 1)
  if (retrieved.objection_handlers?.length > 0) {
    section += `OBJECTION HANDLER EXAMPLE:\n---\n"${retrieved.objection_handlers[0].content}"\nSource: ${retrieved.objection_handlers[0].source || 'Unknown'}\n---\n`;
    section += `↳ Pattern from: How objection is acknowledged and reframed naturally\n\n`;
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
): Promise<{ alignedClaims: SupportedClaim[]; stats: AlignmentResult }> {
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
      stats: {
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
  "aligned_claims": [array of filtered claims with claim, source_url, relevance_score]
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
        stats: {
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
        stats: {
          filtered_claims_count: result.aligned_claims?.length || 0,
          original_claims_count: originalCount,
        }
      };
    }

    return {
      alignedClaims: researchPack.claims,
      stats: {
        filtered_claims_count: originalCount,
        original_claims_count: originalCount,
      }
    };
  } catch (error) {
    console.error("Alignment error:", error);
    return {
      alignedClaims: researchPack.claims,
      stats: {
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
    writing_patterns: [],
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

STEP 1: FILTER TWEETS
Before analyzing, SKIP any tweet that:
- Is a retweet, quote tweet, or starts with "RT @"
- Is under 100 characters
- Is primarily a link share (tweet exists just to promote a URL)
- Is promotional content (plugging products, companies, events, asking for follows)
- Is sponsored/ad content (e.g., mentioning brand names with enthusiasm)
- Is just @mentioning or praising someone else

Only analyze tweets that are ORIGINAL THOUGHTS showing the person's actual voice and thinking.

STEP 2: EXTRACT STYLE (from filtered tweets only)

CRITICAL: This is STYLE ONLY. Do NOT extract:
- Facts, statistics, or claims
- Proof points or evidence
- Specific examples or case studies
- Anything that could be used as "proof" in content
- EXACT PHRASES or specific words to copy

ONLY extract abstract writing patterns, cadence, and personality traits.

TWEETS:
${tweets}

Return a JSON object with these fields (respect hard caps):
{
  "one_sentence_voice": "A single sentence describing the overall voice/personality",
  "tone_rules": ["max 10 rules about HOW they write - e.g., 'Uses short punchy sentences', 'Starts with questions'"],
  "writing_patterns": ["max 10 ABSTRACT style patterns - e.g., 'Opens with bold contrarian claims', 'Uses second-person you heavily', 'Ends sentences with incomplete thoughts', 'Mixes casual slang with business terms' - NOT specific phrases to copy"],
  "dont_phrases": ["max 10 phrases/words they avoid or wouldn't use"],
  "cadence_notes": ["Notes about rhythm, paragraph length, sentence structure"],
  "example_lines": ["max 6 lines demonstrating rhythm/cadence ONLY - zero facts, zero specifics, zero proof"]
}

IMPORTANT: 
- writing_patterns should describe PATTERNS, not exact words
- BAD: "Uses 'Here's the thing'" (this is copying)
- GOOD: "Opens points with a setup phrase before the insight" (this is a pattern)

HARD CAPS: 
- tone_rules: max 10 items
- writing_patterns: max 10 items  
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
        writing_patterns: (result.writing_patterns || []).slice(0, 10),
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

// Detect fabricated claims - stats and case studies not backed by research
interface FabricatedClaimIssue {
  type: 'unverified_statistic' | 'potential_fabricated_example';
  content: string;
}

function detectFabricatedClaims(script: string, alignedClaims: SupportedClaim[]): FabricatedClaimIssue[] {
  const issues: FabricatedClaimIssue[] = [];
  
  // Find all stats/numbers in script
  const statsInScript = script.match(/\d+%|\$[\d,]+|\d+\s+(percent|million|thousand|people|companies|founders)/gi) || [];
  
  // Find all case study patterns
  const caseStudyPatterns = script.match(/(One founder|A client|One of our clients|I talked to a founder|Let me tell you about|Take Sarah|Take Mike|Meet \w+|I know a founder|I worked with a|There's this founder|I met a)/gi) || [];
  
  // Check each stat against research claims
  statsInScript.forEach(stat => {
    const isFromResearch = alignedClaims.some(claim => 
      claim.claim.toLowerCase().includes(stat.toLowerCase())
    );
    if (!isFromResearch) {
      issues.push({
        type: 'unverified_statistic',
        content: stat
      });
    }
  });
  
  // Flag all case studies as potentially fabricated
  caseStudyPatterns.forEach(pattern => {
    issues.push({
      type: 'potential_fabricated_example',
      content: pattern
    });
  });
  
  return issues;
}

// Validate script against hard rules - now includes tweet-proof checks and fabricated claims
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

  // Rule 5: Check for fabricated claims
  const fabricatedClaims = detectFabricatedClaims(script, alignedClaims);
  const unverifiedStats = fabricatedClaims.filter(c => c.type === 'unverified_statistic');
  const fabricatedExamples = fabricatedClaims.filter(c => c.type === 'potential_fabricated_example');
  
  if (unverifiedStats.length > 0) {
    issues.push(`UNVERIFIED_STATS: ${unverifiedStats.map(s => s.content).join(', ')}`);
  }
  
  if (fabricatedExamples.length > 0) {
    issues.push(`FABRICATED_EXAMPLES: ${fabricatedExamples.map(e => e.content).join(', ')}`);
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

// Stage 4: Script Generation with comprehensive YouTube retention prompt
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
): Promise<{ script: string; validation: ValidationResult; contextUseLog: ContextUseLog; retentionElements?: RetentionElements }> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  // Extract business context
  const bc = contextProfile?.business_context || {};
  const business = bc.business || {};
  const offer = bc.offer || {};
  const creator = bc.creator || {};
  const icp = bc.icp || {};
  const icpPainPoints = bc.icp_pain_points || {};
  const transformation = bc.transformation || {};
  const industry = bc.industry || {};
  
  // Get target length (default 10 minutes)
  const targetLength = bc.target_length || contextProfile?.target_length || 10;
  const videoTitle = topic || contextProfile?.video_title || "YouTube Video Script";

  // Build RAG examples section
  const ragSection = ragExamplesSection ? `
=============================================================
REFERENCE EXAMPLES (Pattern from these - do not copy verbatim)
=============================================================

${ragExamplesSection}` : "";

  // Build aligned claims section
  const claimsSection = alignedClaims.length > 0 
    ? alignedClaims.map((c, i) => `[${i + 1}] ${c.claim}\n   Source: ${c.source_url}`).join('\n\n')
    : "No research claims available - use only original insights and examples.";

  // Build tone summary section
  const toneSection = `
Voice: ${toneSummary.one_sentence_voice}

Tone Rules:
${toneSummary.tone_rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Writing Patterns (emulate these styles, don't copy exact words):
${toneSummary.writing_patterns.map((p, i) => `${i + 1}. ${p}`).join('\n') || 'None specified'}

Avoid: ${toneSummary.dont_phrases.join(', ') || 'None specified'}
Cadence: ${toneSummary.cadence_notes.join('; ') || 'Natural flow'}

Example Lines (for rhythm/pacing ONLY - do NOT copy vocabulary or add similar slang):
${toneSummary.example_lines.map(l => `"${l}"`).join('\n')}

CRITICAL VOICE RULE: Do NOT add casual interjections or slang that don't appear in the example lines above.
No "Bruh", "Dude", "Yo", "Bro", "Man", "Like" unless they appear in the creator's actual examples.
The voice should feel authentic to THEIR specific vocabulary, not generic internet casual.`;

  const scriptPrompt = `You are an expert YouTube scriptwriter creating a research-backed, high-retention script.

TOPIC: ${videoTitle}

TARGET LENGTH: ${targetLength} minutes
${ragSection}

=============================================================
RESEARCH-BACKED CLAIMS
=============================================================

${claimsSection}

=============================================================
CONTEXT PROFILE
=============================================================

Business: ${business.name || 'Not specified'}
Description: ${business.description || 'Not specified'}
Type: ${business.type || 'Not specified'}
Unique Mechanism: ${business.unique_mechanism || 'Not specified'}
Key Differentiator: ${business.key_differentiator || 'Not specified'}

Offer: ${offer.name || 'Not specified'}
Offer Description: ${offer.description || 'Not specified'}
Offer Type: ${offer.offer_type || 'Not specified'}
Price Point: ${offer.price_point || 'Not specified'}
Delivery Method: ${offer.delivery_method || 'Not specified'}
Main Outcome: ${offer.main_outcome || 'Not specified'}
Timeline: ${offer.timeline_to_result || 'Not specified'}
Guarantee: ${offer.guarantee || 'Not specified'}

Creator: ${creator.name || 'Not specified'}
Positioning: ${creator.positioning || 'Not specified'}
Credibility: ${creator.credibility_claim || 'Not specified'}
Origin Story: ${creator.origin_story || 'Not specified'}

ICP Role: ${icp.demographics?.profession_or_role || 'Not specified'}
ICP Business Stage: ${icp.demographics?.business_stage || 'Not specified'}
ICP Experience Level: ${icp.demographics?.experience_level || 'Not specified'}
ICP Current Situation: ${icp.current_situation || 'Not specified'}
What They've Tried: ${JSON.stringify(icp.what_theyve_tried || [])}
Why Previous Solutions Failed: ${icp.why_previous_solutions_failed || 'Not specified'}

Primary Problem: ${icpPainPoints.primary_problem || 'Not specified'}
Root Cause: ${icpPainPoints.root_cause || 'Not specified'}
Emotional Pain - Frustrations: ${JSON.stringify(icpPainPoints.emotional_pain?.frustrations || [])}
Emotional Pain - Fears: ${JSON.stringify(icpPainPoints.emotional_pain?.fears || [])}
Emotional Pain - Keeps Them Up: ${icpPainPoints.emotional_pain?.keeps_them_up_at_night || 'Not specified'}
Practical Pain - Time: ${icpPainPoints.practical_pain?.time_impact || 'Not specified'}
Practical Pain - Financial: ${icpPainPoints.practical_pain?.financial_impact || 'Not specified'}
Practical Pain - Opportunities Missed: ${icpPainPoints.practical_pain?.opportunities_missed || 'Not specified'}
Social Pain - Perception: ${icpPainPoints.social_pain?.how_others_perceive_them || 'Not specified'}
Social Pain - Comparison: ${icpPainPoints.social_pain?.comparison_to_peers || 'Not specified'}
False Beliefs: ${JSON.stringify(icpPainPoints.false_beliefs || [])}
Common Objections: ${JSON.stringify(icpPainPoints.common_objections || [])}

Transformation From: ${transformation.from_state?.situation || 'Not specified'}
Transformation From - Struggles: ${JSON.stringify(transformation.from_state?.struggles || [])}
Transformation From - Limiting Identity: ${transformation.from_state?.limiting_identity || 'Not specified'}
Transformation To: ${transformation.to_state?.outcome || 'Not specified'}
Transformation To - Benefits: ${JSON.stringify(transformation.to_state?.benefits || [])}
Transformation To - New Identity: ${transformation.to_state?.new_identity || 'Not specified'}
Transformation Timeline: ${transformation.timeline || 'Not specified'}
Proof Points: ${JSON.stringify(transformation.proof_points || [])}

Industry Niche: ${industry.niche || 'Not specified'}
Sub Niche: ${industry.sub_niche || 'Not specified'}

=============================================================
EXTRACTED TONE/VOICE
=============================================================
${toneSection}

=============================================================
HARD RULES
=============================================================

1. MAX 2 tweet-proof items in entire script
2. Each section needs 2+ non-tweet value points
3. REFERENCE EXAMPLES ARE FOR STRUCTURE ONLY - do not copy verbatim
4. Match the PACING and FLOW of examples, not the words
5. VALUE BEFORE PITCH - deliver real insights before any selling
6. RETENTION IS EVERYTHING - include re-hooks and open loops throughout
7. WRITE FOR SPOKEN DELIVERY, NOT TWITTER:
   - Avoid choppy one-word or two-word sentences in a row
   - Combine related ideas into natural, flowing sentences
   - Read it out loud - if it sounds like a LinkedIn post or tweet thread, rewrite it
   - BAD (Twitter voice): "Two founders. Same revenue. Same team. One pays $180k. The other pays $50k."
   - GOOD (spoken voice): "Two founders with the same revenue—one pays $180k, the other pays $50k."
   - Sentences should flow conversationally, not punch like social media copy

=============================================================
YOUTUBE RETENTION MECHANICS (CRITICAL)
=============================================================

SETUP → PAYOFF PRINCIPLE (applies to all body sections):
- Every payoff requires a setup (clue/hint that prepares audience)
- Without setup, payoffs feel random or confusing
- Payoff answers: "Why did I watch this?"
- Two types: INFORMATIONAL (reveal steps/info) or EMOTIONAL (make them feel something)

BODY SECTION RULES:
- 300-500 words per section (longer = viewer forgets setup)
- Logical Progression: Each line leads seamlessly to the next
- Substantiate claims with data, studies, or personal anecdotes
- Information must feel EARNED, not just stated
- Build smaller payoffs toward the MEGA PAYOFF (best insight)
- Read out loud to catch breaks in logic or awkward phrasing

COMMON MISTAKES TO AVOID:
- Overloading: Stacking too many payoffs overwhelms audience
- Underwhelming: Intense buildup + weak conclusion = viewer disappointment
- Forgetting Setup: Information without context feels out of place
- Breaking Logic: If viewer gets confused, they leave

OPEN LOOPS:
- Open 1-2 loops in the first 60 seconds
- Each loop creates a "I need to see how this ends" feeling
- Close loops strategically (save one for CTA section)
- Examples: "I'll share the biggest mistake at the end" / "There's one thing that changes everything - I'll get to that"

RE-HOOKS (between every major section):
- Mini-hooks that re-engage viewers who might click away
- Signal value is coming: "But here's where it gets interesting..."
- Create micro-curiosity: "This next part is what most people miss..."
- Transition phrases that promise payoff

PATTERN INTERRUPTS:
- Change energy/pace every 2-3 minutes
- Can be: tone shift, rhetorical question, surprising statement, quick story
- Prevents monotony that causes drop-off
- Mark in script with [PATTERN INTERRUPT]

PACING VARIATION:
- Fast sections (excitement, lists, energy)
- Slow sections (important points, emphasis)
- Never stay at same pace for more than 2 minutes

=============================================================
YOUTUBE SCRIPT STRUCTURE
=============================================================

1. HOOK (0:00-0:30)
   Pattern from HOOK EXAMPLES above.
   
   CORE OBJECTIVE: Deliver two things in first 2.5-4 seconds:
   • Topic Clarity - Immediate understanding of the subject
   • On-Target Curiosity - Convince viewer the topic is relevant to THEM
   
   THE 3-STEP PSYCHOLOGY FORMULA:
   
   Step 1: CONTEXT LEAN-IN (1-2 seconds)
   - Establish topic clarity
   - Build common ground or state a benefit
   - Make viewer think "yes, this is for me"
   
   Step 2: SCROLL STOP INTERJECTION
   - Use a "stun gun" word: "But," "However," "Yet," "Except"
   - Interrupts the initial thought pattern
   - Creates micro-tension
   
   Step 3: CONTRARIAN SNAPBACK
   - Pivot to shocking or unexpected direction
   - Closes the curiosity loop
   - Viewer MUST keep watching to resolve the tension
   
   THE 6 POWER WORDS (stack these):
   - Subject: Who/what the video is about ("I," "You," "This strategy")
   - Action: The specific verb/movement ("grew," "built," "discovered")
   - Objective: The shocking end result ("100k subs," "$50k/month")
   - Contrast: Compare outcome to base state ("from 0 to," "without spending")
   - Proof (optional): Why trust you ("again," "for the 3rd time")
   - Time (optional): Urgency/speed ("in 30 days," "this week")
   
   EXECUTION RULES:
   - Speed to Value: Leapfrog the payoff to the top. NO greetings, NO "Hey guys"
   - Staccato Sentences: Short, punchy. Maximum value per word
   - Use "You/Your" instead of "I/Me" to increase relevance
   - Write at 6th-grade reading level with active voice
   - Visual + Text + Spoken hook must align (say the same thing)
   
   Open loop here: Plant something you'll pay off later in the video.

2. SETUP + QUICK CREDIBILITY (0:30-1:30)
   
   Required elements:
   - One-line credibility: "${creator.credibility_claim || 'Brief credibility statement'}" (brief, not braggy)
   - Roadmap: What they'll learn (3 things max)
   - Second open loop: "And at the end, I'll share [the thing everyone gets wrong / the shortcut / the mistake]"
   
   Keep this TIGHT. Under 60 seconds. Viewers are still deciding whether to stay.

3. VALUE POINT 1 (1:30-4:00)
   Pattern from BODY EXAMPLES above.
   
   Deliver your SECOND-BEST insight (save the best for Point 2).
   
   SETUP → PAYOFF STRUCTURE:
   Every payoff needs a setup. The setup is the clue/hint that prepares the audience.
   Without setup, payoffs feel random or confusing.
   
   This section is an INFORMATIONAL PAYOFF - reveal specific information they want to know.
   
   Structure:
   - SETUP: What it is (the concept/strategy) + why they should care
   - BUILD: Why it matters (connect to ${icpPainPoints.primary_problem || 'their primary problem'})
   - PAYOFF: How it works (the actionable revelation they came for)
   - SUBSTANTIATE: Story/example/data to prove it (use research claims)
   
   BODY WRITING RULES:
   - Logical Progression: Each line leads seamlessly to the next
   - Keep section 300-500 words (longer = viewer forgets setup)
   - Substantiate claims with data, studies, or personal anecdotes
   - Information must feel EARNED, not just stated
   
   End with RE-HOOK into next point (this is a mini-setup for next payoff):
   "But this only works if you understand [next concept]..."
   "Now, most people stop here. But there's something even more important..."

4. VALUE POINT 2 (4:00-7:00)
   Pattern from BODY EXAMPLES above.
   
   Deliver your BEST insight. This is the MEGA PAYOFF section - the main reason they watched.
   
   SETUP → PAYOFF STRUCTURE:
   Build up gradually toward this mega payoff. Use smaller moments of interest leading here.
   
   Structure:
   - SETUP: What it is + create anticipation
   - BUILD: Why it matters (connect to ${icpPainPoints.root_cause || 'the root cause'})
   - DEEPER BUILD: How it works (more tactical than Point 1)
   - MEGA PAYOFF: The specific revelation/step they've been waiting for
   - SUBSTANTIATE: Specific example or mini case study with data
   
   [PATTERN INTERRUPT] somewhere in this section - change pace, tell quick story, ask rhetorical question.
   
   Weave in proof naturally (not a separate section):
   "When we did this with [client type], [specific result]..."
   
   AVOID THESE MISTAKES:
   - Overloading: Don't stack too many payoffs - one mega payoff per section
   - Underwhelming: If buildup is intense, payoff must match (don't be predictable)
   - Forgetting setup: Every piece of information needs context first
   
   Keep section 300-500 words. Substantiate with data/anecdotes.
   
   End with RE-HOOK:
   "There's one more thing that ties this all together..."

5. VALUE POINT 3 + BRIDGE (7:00-9:30)
   
   Third insight OR common mistake to avoid.
   
   PAYOFF TYPE: Can be informational OR emotional payoff here.
   - Informational: Final tactical piece they need
   - Emotional: Relief ("here's why it's not your fault") or fear ("here's what happens if you don't")
   
   Structure:
   - SETUP: What it is + context
   - BUILD: Why it matters
   - PAYOFF: How to apply it / what to avoid
   - SUBSTANTIATE: Data or anecdote
   
   Keep section 300-500 words.
   
   BRIDGE TO SOFT PIVOT:
   This section ends by connecting the value back to their deeper situation.
   Start transitioning from "here's the knowledge" to "here's why you might still struggle."
   
   The bridge is a SETUP for the soft pivot payoff.
   
   "Now, you have the framework. But here's what I see happen to most [ICP]..."

6. SOFT PIVOT (9:30-10:30)
   
   NOT heavy VSL-style agitation. Gentle acknowledgment of reality.
   
   Structure:
   - Acknowledge the gap: "Knowing this and implementing it are different things"
   - Light agitation: Reference frustrations naturally
   - Common struggle: Why people who know this still fail (hint: they need help/system)
   
   This should feel like a friend being honest, not a salesperson creating pain.
   
   "Look, I just gave you everything. You could go do this yourself. But if you're like most [ICP], you're thinking..."

7. CTA + CLOSE LOOP (10:30-11:30)
   Pattern from CTA EXAMPLE above.
   
   Structure:
   - Close the open loop from earlier: "Remember when I said I'd share [the thing]? Here it is..."
   - Natural transition to offer (NOT "So if you want to buy...")
   - Present ${offer.name || 'the offer'} as logical next step
   - ${offer.guarantee || 'Guarantee'} if relevant
   - Clear action: What to do next
   
   Optional: Handle one objection naturally
   "If you're thinking [objection], here's the thing..."
   
   CTA should feel like: "If you want help implementing this, here's how."
   NOT like: "Buy my thing because you're broken without it."

8. OUTRO (11:30-12:00)
   
   Structure:
   - Recap ONE key takeaway (the thing they should remember)
   - Callback to opening or memorable line
   - End on confident/high note
   - Subscribe/like (brief, don't beg)
   
   "That's [key concept]. If you got value, subscribe. See you in the next one."

=============================================================
LENGTH ADAPTATION
=============================================================

If TARGET LENGTH is 8-10 minutes:
- Combine Value Points 2 and 3
- Shorter examples
- Tighter transitions
- Soft Pivot can be 30 seconds

If TARGET LENGTH is 12-15 minutes:
- Full structure as written
- Deeper examples
- Can add mini-tangent or story

If TARGET LENGTH is 15-20 minutes:
- Add Value Point 4
- Longer case studies
- Can expand Soft Pivot
- Multiple proof weaves

=============================================================
OUTPUT FORMAT
=============================================================

CRITICAL: The script must read like a natural creator script, NOT like AI output.

DO NOT include:
- Timestamps like [0:00-0:30], [1:30-4:00]
- Markdown headers like ## HOOK, ## VALUE POINT 1
- Section labels in brackets like [PATTERN INTERRUPT]
- Any AI-style formatting

DO include:
- Simple section breaks with just the section name (e.g., "HOOK" on its own line)
- Natural paragraph breaks
- The actual spoken words a creator would read

Example of what NOT to write:
## HOOK [0:00-0:30]

Billionaires pay less in taxes than you do.

Example of what TO write:
HOOK

Billionaires pay less in taxes than you do

Return JSON:
{
  "script": "The complete script with simple section labels only (no timestamps, no markdown, no brackets)",
  "retention_elements": {
    "open_loops": [
      { "location": "hook", "loop": "description of loop", "closed_at": "section name" },
      { "location": "setup", "loop": "description of loop", "closed_at": "section name" }
    ],
    "re_hooks": [
      { "after_section": "value_1", "re_hook_text": "..." },
      { "after_section": "value_2", "re_hook_text": "..." }
    ],
    "pattern_interrupts": [
      { "location": "value_2", "type": "story|question|tone_shift|surprising_stat" }
    ]
  },
  "context_use_log": {
    "tweet_proof_items_used": number,
    "tweet_proof_items": [...],
    "sections": [
      { "name": "hook", "non_tweet_value_points": number },
      { "name": "setup_credibility", "non_tweet_value_points": number },
      { "name": "value_1", "non_tweet_value_points": number },
      { "name": "value_2", "non_tweet_value_points": number },
      { "name": "value_3_bridge", "non_tweet_value_points": number },
      { "name": "soft_pivot", "non_tweet_value_points": number },
      { "name": "cta", "non_tweet_value_points": number },
      { "name": "outro", "non_tweet_value_points": number }
    ],
    "rag_examples_used": {
      "hooks": ["source1", "source2"],
      "body": ["source1", "source2"],
      "cta": ["source"],
      "proof": ["source"],
      "objection": ["source"]
    }
  }
}

Return ONLY valid JSON.`;

  console.log("Generating script with comprehensive YouTube retention prompt...");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5-20251101",
      max_tokens: 12000,
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
  let retentionElements: RetentionElements | undefined;
  let contextUseLog: ContextUseLog = {
    tweet_proof_items_used: 0,
    tweet_proof_items: [],
    sections: [
      { name: "hook", non_tweet_value_points: 2 },
      { name: "setup_credibility", non_tweet_value_points: 2 },
      { name: "value_1", non_tweet_value_points: 2 },
      { name: "value_2", non_tweet_value_points: 2 },
      { name: "value_3_bridge", non_tweet_value_points: 2 },
      { name: "soft_pivot", non_tweet_value_points: 2 },
      { name: "cta", non_tweet_value_points: 2 },
      { name: "outro", non_tweet_value_points: 2 }
    ],
    rag_examples_used: ragResults ? {
      hooks: ragResults.hooks?.slice(0, 2).map(h => h.source || 'Unknown') || [],
      body: ragResults.body_sections?.slice(0, 2).map(b => b.source || 'Unknown') || [],
      cta: ragResults.cta_sections?.slice(0, 1).map(c => c.source || 'Unknown') || [],
      proof: ragResults.proof_sections?.slice(0, 1).map(p => p.source || 'Unknown') || [],
      objection: ragResults.objection_handlers?.slice(0, 1).map(o => o.source || 'Unknown') || []
    } : undefined
  };

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      script = parsed.script || text;
      if (parsed.retention_elements) {
        retentionElements = parsed.retention_elements;
      }
      if (parsed.context_use_log) {
        contextUseLog = {
          ...parsed.context_use_log,
          rag_examples_used: parsed.context_use_log.rag_examples_used || contextUseLog.rag_examples_used
        };
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

  return { script, validation, contextUseLog, retentionElements };
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
5. Preserve the voice and flow of the original

FABRICATED CONTENT RULES:

UNVERIFIED STATISTICS: If a statistic isn't in the research claims list, either:
- Replace with a similar stat FROM the research claims
- Remove the stat and rewrite the sentence without it
- Change to vague language: "most founders" instead of "78% of founders"

CASE STUDIES/EXAMPLES: For any "I talked to a founder" or "One client" stories:
- If NOT from research: rewrite as clearly hypothetical: "Let's say you're a founder who..." instead of "I talked to a founder who..."
- Use "Imagine you..." instead of "One of our clients..."
- Remove specific fake names (Sarah, Mike, etc.)
- Remove specific fake dollar amounts from examples
- NEVER invent specific names, dollar amounts, or outcomes for examples

NO CITATIONS IN OUTPUT: The final script should read clean with no [CITE] tags or source references. Track sources internally but don't include them in the script text.

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
    const { alignedClaims, stats: alignmentStats } = await runAlignmentStage(researchPack, context_profile);
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
    const { script, validation, contextUseLog, retentionElements } = await runScriptStage(
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
      alignment_stats: alignmentStats,
      tone_summary: toneSummary,
      context_use_log: contextUseLog,
      retention_elements: retentionElements,
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
