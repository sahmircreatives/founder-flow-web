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
  proof_sections: RAGExample[];
  objection_handlers: RAGExample[];
}

// Sanitize RAG content before injection - strip specific names/amounts
function sanitizeRAGContent(content: string): string {
  // Replace company/product names with placeholder
  let sanitized = content.replace(/\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Inc|LLC|Corp|Company|Software|Solutions|Agency|Consulting)\b/g, '[COMPANY]');
  
  // Replace dollar amounts
  sanitized = sanitized.replace(/\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|k|K|M|B))?/g, '[AMOUNT]');
  
  // Replace specific percentages
  sanitized = sanitized.replace(/\b\d+(?:\.\d+)?%/g, '[X%]');
  
  return sanitized;
}

// Build RAG examples section for the prompt - updated format (no CTA)
function buildExamplesSection(retrieved: RAGResults): string {
  let section = '';
  
  // Hook examples (show up to 2)
  if (retrieved.hooks?.length > 0) {
    section += `HOOK EXAMPLES:\n`;
    retrieved.hooks.slice(0, 2).forEach((hook, i) => {
      const sanitizedContent = sanitizeRAGContent(hook.content);
      section += `---\nExample ${i + 1} (similarity: ${hook.similarity?.toFixed(2) || 'N/A'}):\n"${sanitizedContent}"\n---\n`;
    });
    section += `↳ Pattern from: Opening structure, curiosity loop setup, pacing\n\n`;
  }
  
  // Body/Value examples (show up to 2)
  if (retrieved.body_sections?.length > 0) {
    section += `BODY/VALUE EXAMPLES:\n`;
    retrieved.body_sections.slice(0, 2).forEach((body, i) => {
      const sanitizedContent = sanitizeRAGContent(body.content);
      section += `---\nExample ${i + 1} (similarity: ${body.similarity?.toFixed(2) || 'N/A'}):\n"${sanitizedContent}"\n---\n`;
    });
    section += `↳ Pattern from: How points are explained, transitions, depth of value\n\n`;
  }
  
  // Proof example (show 1) - NO CTA SECTION
  if (retrieved.proof_sections?.length > 0) {
    const sanitizedContent = sanitizeRAGContent(retrieved.proof_sections[0].content);
    section += `PROOF EXAMPLE:\n---\n"${sanitizedContent}"\n---\n`;
    section += `↳ Pattern from: How results are presented, specificity, weaving into value\n\n`;
  }
  
  // Objection handler example (show 1)
  if (retrieved.objection_handlers?.length > 0) {
    const sanitizedContent = sanitizeRAGContent(retrieved.objection_handlers[0].content);
    section += `OBJECTION HANDLER EXAMPLE:\n---\n"${sanitizedContent}"\n---\n`;
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
        model: "claude-opus-4-6",
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
  "cadence_notes": ["Notes about rhythm, paragraph length, sentence structure"]
}

IMPORTANT: 
- writing_patterns should describe PATTERNS, not exact words
- BAD: "Uses 'Here's the thing'" (this is copying)
- GOOD: "Opens points with a setup phrase before the insight" (this is a pattern)
- DO NOT include example_lines - they cause content bleed

HARD CAPS: 
- tone_rules: max 10 items
- writing_patterns: max 10 items  
- dont_phrases: max 10 items

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

// Convert word numbers to digits for comparison
function normalizeNumber(text: string): string {
  const wordToNum: Record<string, string> = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
    'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
    'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
    'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
    'eighty': '80', 'ninety': '90', 'hundred': '100'
  };
  
  let result = text.toLowerCase();
  for (const [word, num] of Object.entries(wordToNum)) {
    result = result.replace(new RegExp(`\\b${word}\\b`, 'g'), num);
  }
  return result;
}

function detectFabricatedClaims(script: string, alignedClaims: SupportedClaim[]): FabricatedClaimIssue[] {
  const issues: FabricatedClaimIssue[] = [];
  const normalizedScript = normalizeNumber(script);
  
  // Find all stats/numbers in script (both digit and word forms)
  const digitStats = normalizedScript.match(/\d+%|\$[\d,]+|\d+\s+(percent|million|thousand|billion|people|companies|founders|startups|businesses)/gi) || [];
  const wordStats = script.match(/(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(percent|thousand|million)/gi) || [];
  const allStats = [...digitStats, ...wordStats];
  
  // Find specific dollar amounts (both $X and "X dollar" forms)
  const dollarPatterns = script.match(/\$[\d,]+(\s*(thousand|million|billion|k|m|b))?|(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\s*(thousand|million|hundred|k|m)?\s*dollar/gi) || [];
  
  // Combine claims text for searching
  const claimsText = normalizeNumber(alignedClaims.map(c => c.claim).join(' '));
  
  // Check each stat against research claims
  allStats.forEach(stat => {
    const normalizedStat = normalizeNumber(stat).replace(/[^0-9]/g, '');
    const isFromResearch = normalizedStat.length > 0 && claimsText.includes(normalizedStat);
    if (!isFromResearch && normalizedStat.length >= 2) {
      issues.push({
        type: 'unverified_statistic',
        content: stat
      });
    }
  });
  
  // Find all case study patterns (expanded list)
  const caseStudyPatterns = script.match(
    /(Our first client|One founder|A client|One of our clients|I talked to a founder|Let me tell you about|Take Sarah|Take Mike|Meet \w+|I know a founder|I worked with a|There's this founder|I met a|He called me|She called me|called me crying|called me in tears|sent me a message|reached out to me|texted me saying|emailed me|One of my clients|A founder I work with|A startup founder|This one founder|I remember a founder|I had a client|There was this client)/gi
  ) || [];
  
  // Flag all case studies with specific names, amounts, or emotional details
  caseStudyPatterns.forEach(pattern => {
    issues.push({
      type: 'potential_fabricated_example',
      content: pattern
    });
  });
  
  // Extra check: Dollar amounts in what look like examples/stories
  dollarPatterns.forEach(amount => {
    // Check if it appears in a story context
    const context = script.substring(
      Math.max(0, script.indexOf(amount) - 100),
      Math.min(script.length, script.indexOf(amount) + 100)
    );
    const storyIndicators = /received|got|refund|saved|made|earned|client|founder|he|she|they/i;
    if (storyIndicators.test(context)) {
      const normalizedAmount = normalizeNumber(amount).replace(/[^0-9]/g, '');
      const isFromResearch = normalizedAmount.length > 0 && claimsText.includes(normalizedAmount);
      if (!isFromResearch) {
        issues.push({
          type: 'potential_fabricated_example',
          content: `Specific amount in story: ${amount}`
        });
      }
    }
  });
  
  return issues;
}

// Validate script against hard rules - automatic bias corrector triggers
function validateScript(
  script: string, 
  alignedClaims: SupportedClaim[], 
  contextUseLog: ContextUseLog,
  creatorName?: string,
  credibilityClaim?: string
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

  // Rule 5: Check for fabricated claims (AUTO TRIGGER FOR BIAS CORRECTOR)
  const fabricatedClaims = detectFabricatedClaims(script, alignedClaims);
  const unverifiedStats = fabricatedClaims.filter(c => c.type === 'unverified_statistic');
  const fabricatedExamples = fabricatedClaims.filter(c => c.type === 'potential_fabricated_example');
  
  // AUTO TRIGGER: Stats not in research claims
  if (unverifiedStats.length > 0) {
    issues.push(`UNVERIFIED_STATS: ${unverifiedStats.map(s => s.content).join(', ')}`);
  }
  
  // AUTO TRIGGER: Case study uses specific names/dollars not from research
  if (fabricatedExamples.length > 0) {
    issues.push(`FABRICATED_EXAMPLES: ${fabricatedExamples.map(e => e.content).join(', ')}`);
  }

  // Rule 6: AUTO TRIGGER - Credibility doesn't match creator.name
  if (creatorName && creatorName.trim() !== '') {
    const scriptLower = script.toLowerCase();
    const creatorNameLower = creatorName.toLowerCase();
    
    // Check if the credibility section mentions the creator's name
    const credibilitySection = script.match(/SETUP_CREDIBILITY[\s\S]*?(?=VALUE_1|$)/i)?.[0] || 
                              script.match(/SETUP[\s\S]*?(?=VALUE|$)/i)?.[0] || '';
    
    if (credibilitySection && !credibilitySection.toLowerCase().includes(creatorNameLower)) {
      issues.push(`CREDIBILITY_MISMATCH: Script credibility section doesn't mention "${creatorName}"`);
    }
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

// ============================================================
// STAGE 4A: Structure & Retention Map
// ============================================================
// Creates detailed outline with retention elements mapped

interface ScriptStructure {
  sections: {
    name: string;
    purpose: string;
    key_points: string[];
    claims_to_use: number[]; // indexes into alignedClaims
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

async function runStructureStage(
  topic: string,
  contextProfile: any,
  alignedClaims: SupportedClaim[],
  targetLength: number,
  ragExamplesSection: string = ""
): Promise<ScriptStructure> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

  const bc = contextProfile?.business_context || {};
  const business = bc.business || {};
  const offer = bc.offer || {};
  const creator = bc.creator || {};
  const icp = bc.icp || {};
  const icpPainPoints = bc.icp_pain_points || {};

  const claimsList = alignedClaims.map((c, i) => `[${i}] ${c.claim}`).join('\n');

  const prompt = `You are a YouTube script architect. Create a detailed structure for a ${targetLength}-minute script.

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

${ragExamplesSection ? `REFERENCE EXAMPLES (for structure patterns only):\n${ragExamplesSection}` : ''}

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

  console.log("Stage 4A: Generating script structure...");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
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
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse structure:", e);
  }
  
  throw new Error("Could not parse structure response");
}

// ============================================================
// STAGE 4B: Section-by-Section Writing
// ============================================================
// Writes each section following the structure

async function runWritingStage(
  structure: ScriptStructure,
  topic: string,
  contextProfile: any,
  toneSummary: ToneSummary,
  alignedClaims: SupportedClaim[],
  ragExamplesSection: string = ""
): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

  const bc = contextProfile?.business_context || {};
  const business = bc.business || {};
  const offer = bc.offer || {};
  const creator = bc.creator || {};

  // Build claims with indices for reference
  const claimsWithIndices = alignedClaims.map((c, i) => `[${i}] ${c.claim} (Source: ${c.source_url})`).join('\n');

  // Build structure summary
  const structureSummary = structure.sections.map(s => 
    `${s.name.toUpperCase()} (~${s.word_count_target} words):
  Purpose: ${s.purpose}
  Key points: ${s.key_points.join(' | ')}
  Use claims: ${s.claims_to_use.length > 0 ? s.claims_to_use.map(i => `[${i}]`).join(', ') : 'None required'}`
  ).join('\n\n');

  // Build retention instructions
  const retentionInstructions = `
OPEN LOOPS TO INCLUDE:
${structure.retention_map.open_loops.map(l => `- In ${l.location}: "${l.loop_description}" (closes in ${l.closes_at})`).join('\n')}

RE-HOOKS TO INCLUDE:
${structure.retention_map.re_hooks.map(r => `- After ${r.after_section}: ${r.re_hook_approach}`).join('\n')}

PATTERN INTERRUPTS:
${structure.retention_map.pattern_interrupts.map(p => `- In ${p.location}: ${p.type} - ${p.description}`).join('\n')}

MEGA PAYOFF in ${structure.mega_payoff.section}: ${structure.mega_payoff.insight}`;

  // Voice/tone section
  const toneSection = `
VOICE: ${toneSummary.one_sentence_voice}

TONE RULES:
${toneSummary.tone_rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

WRITING PATTERNS TO EMULATE:
${toneSummary.writing_patterns.map((p, i) => `${i + 1}. ${p}`).join('\n') || 'None specified'}

AVOID: ${toneSummary.dont_phrases.join(', ') || 'None specified'}

CRITICAL: No casual slang (Bruh, Dude, Yo, Bro, Man, Like).`;

  const prompt = `You are a YouTube scriptwriter. Write a complete script following this exact structure.

TOPIC: ${topic}

=== SCRIPT STRUCTURE (follow exactly) ===
${structureSummary}

=== RETENTION ELEMENTS (weave in naturally) ===
${retentionInstructions}

=== RESEARCH CLAIMS (use by index) ===
${claimsWithIndices || "No research claims - use only original insights."}

=== VOICE/TONE ===
${toneSection}

=== CONTEXT ===
Business: ${business.name || 'Not specified'}
Offer: ${offer.name || 'Not specified'} - ${offer.main_outcome || ''}
Creator: ${creator.name || 'Not specified'}
Credibility: ${creator.credibility_claim || 'Not specified'}

${ragExamplesSection ? `=== REFERENCE EXAMPLES (structure/flow only) ===\n${ragExamplesSection}` : ''}

=== WRITING RULES ===
1. Write for SPOKEN delivery, not Twitter/LinkedIn
2. Avoid choppy 1-2 word sentences in a row
3. Combine related ideas into flowing sentences
4. BAD: "Two founders. Same revenue. One pays $180k. The other pays $50k."
5. GOOD: "Two founders with the same revenue—one pays $180k, the other pays $50k."
6. Each line should flow naturally to the next
7. Read it out loud - if it sounds punchy like social media, rewrite it
8. DO NOT fabricate statistics or case studies not in the research claims
9. Use hypothetical framing ("Imagine you..." or "Let's say...") for examples

=== OUTPUT FORMAT ===
Write the complete script with section labels only (no timestamps, no markdown).

Example:
HOOK

[Spoken script text here...]

SETUP

[Spoken script text here...]

Write the COMPLETE script now.`;

  console.log("Stage 4B: Writing script sections...");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Writing stage failed:", response.status, errorText);
    throw new Error("Writing stage failed");
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}

// ============================================================
// STAGE 4C: Voice & Flow Polish
// ============================================================
// Final pass to ensure voice consistency and smooth flow

async function runPolishStage(
  script: string,
  toneSummary: ToneSummary,
  alignedClaims: SupportedClaim[]
): Promise<{ script: string; contextUseLog: ContextUseLog; retentionElements: RetentionElements }> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

  const prompt = `You are a script editor doing a final polish pass. Review and improve this script.

CURRENT SCRIPT:
${script}

=== VOICE TO MATCH ===
${toneSummary.one_sentence_voice}

Tone rules:
${toneSummary.tone_rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

=== POLISH CHECKLIST ===

1. FLOW CHECK:
   - Find any choppy sentence sequences (multiple 1-3 word sentences in a row)
   - Combine them into natural, conversational sentences
   - Ensure each paragraph flows smoothly

2. VOICE CHECK:
   - Remove any slang (Bruh, Dude, Yo, Bro, Man, Like)
   - Ensure the voice matches the tone rules throughout
   - Remove any AI-sounding phrases ("Let's dive in", "Here's the thing", "At the end of the day")
   - Remove lazy re-hooks: "Read that again", "Let that sink in", "Think about that", "This is important"

3. SPOKEN DELIVERY CHECK:
   - Read each sentence - does it sound natural spoken aloud?
   - Fix anything that sounds like a tweet or LinkedIn post
   - Ensure transitions between sections feel smooth

4. FABRICATION CHECK:
   - Flag any specific statistics that seem made up
   - Ensure case studies use hypothetical framing ("Imagine..." or "Let's say...")
   - No specific fake names (Sarah, Mike, etc.)

Return JSON:
{
  "script": "The polished complete script",
  "changes_made": ["list of specific changes"],
  "retention_elements": {
    "open_loops": [
      { "location": "section_name", "loop": "what was teased", "closed_at": "section_name" }
    ],
    "re_hooks": [
      { "after_section": "section_name", "re_hook_text": "the actual transition text" }
    ],
    "pattern_interrupts": [
      { "location": "section_name", "type": "story|question|tone_shift|surprising_stat" }
    ]
  },
  "context_use_log": {
    "tweet_proof_items_used": 0,
    "tweet_proof_items": [],
    "sections": [
      { "name": "hook", "non_tweet_value_points": 2 },
      { "name": "setup_credibility", "non_tweet_value_points": 2 },
      { "name": "value_1", "non_tweet_value_points": 3 },
      { "name": "value_2", "non_tweet_value_points": 3 },
      { "name": "value_3_bridge", "non_tweet_value_points": 2 },
      { "name": "soft_pivot", "non_tweet_value_points": 1 },
      { "name": "cta", "non_tweet_value_points": 1 },
      { "name": "outro", "non_tweet_value_points": 1 }
    ]
  }
}

Return ONLY valid JSON.`;

  console.log("Stage 4C: Polishing script...");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 10000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Polish stage failed:", response.status, errorText);
    throw new Error("Polish stage failed");
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        script: parsed.script || script,
        contextUseLog: parsed.context_use_log || {
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
          ]
        },
        retentionElements: parsed.retention_elements || {
          open_loops: [],
          re_hooks: [],
          pattern_interrupts: []
        }
      };
    }
  } catch (e) {
    console.error("Failed to parse polish response:", e);
  }
  
  // Fallback if parsing fails
  return {
    script,
    contextUseLog: {
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
      ]
    },
    retentionElements: {
      open_loops: [],
      re_hooks: [],
      pattern_interrupts: []
    }
  };
}

// ============================================================
// MAIN ORCHESTRATOR: 3-Stage Script Generation
// ============================================================

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
  
  const bc = contextProfile?.business_context || {};
  const targetLength = bc.target_length || contextProfile?.target_length || 10;

  console.log("=== STARTING 3-STAGE SCRIPT GENERATION ===");

  // Stage 4A: Generate Structure & Retention Map
  console.log("Running Stage 4A: Structure & Retention Map...");
  const structure = await runStructureStage(
    topic,
    contextProfile,
    alignedClaims,
    targetLength,
    ragExamplesSection
  );
  console.log("Stage 4A complete. Structure generated with", structure.sections.length, "sections");

  // Stage 4B: Write Script Following Structure
  console.log("Running Stage 4B: Section-by-Section Writing...");
  const rawScript = await runWritingStage(
    structure,
    topic,
    contextProfile,
    toneSummary,
    alignedClaims,
    ragExamplesSection
  );
  console.log("Stage 4B complete. Raw script length:", rawScript.length, "chars");

  // Stage 4C: Polish for Voice & Flow
  console.log("Running Stage 4C: Voice & Flow Polish...");
  const { script, contextUseLog, retentionElements } = await runPolishStage(
    rawScript,
    toneSummary,
    alignedClaims
  );
  console.log("Stage 4C complete. Final script length:", script.length, "chars");

  // Add RAG examples used to context log
  if (ragResults) {
    contextUseLog.rag_examples_used = {
      hooks: ragResults.hooks?.slice(0, 2).map(h => h.source || 'Unknown') || [],
      body: ragResults.body_sections?.slice(0, 2).map(b => b.source || 'Unknown') || [],
      cta: [], // CTA now comes from business context only
      proof: ragResults.proof_sections?.slice(0, 1).map(p => p.source || 'Unknown') || [],
      objection: ragResults.objection_handlers?.slice(0, 1).map(o => o.source || 'Unknown') || []
    };
  }

  // Get creator info for validation (reuse bc from above)
  const creator = bc.creator || {};
  const creatorName = creator.name || '';
  const credibilityClaim = creator.credibility_claim || '';

  // Validate the script with creator info for auto-trigger checks
  let validation = validateScript(script, alignedClaims, contextUseLog, creatorName, credibilityClaim);

  // If validation fails, run bias corrector pass automatically
  if (!validation.passed) {
    console.log("Validation failed, running bias corrector automatically...");
    console.log("Issues:", validation.issues);
    const corrected = await runBiasCorrectorPass(script, validation.issues, alignedClaims, contextUseLog, creatorName, credibilityClaim, Deno.env.get("ANTHROPIC_API_KEY")!);
    const correctedScript = corrected.script;
    const correctedContextUseLog = corrected.contextUseLog;
    validation = validateScript(correctedScript, alignedClaims, correctedContextUseLog, creatorName, credibilityClaim);
    
    console.log("=== 3-STAGE SCRIPT GENERATION COMPLETE ===");
    return { script: correctedScript, validation, contextUseLog: correctedContextUseLog, retentionElements };
  }

  console.log("=== 3-STAGE SCRIPT GENERATION COMPLETE ===");
  return { script, validation, contextUseLog, retentionElements };
}

// Bias Corrector Pass - now includes creator info for credibility fixing
async function runBiasCorrectorPass(
  script: string, 
  issues: string[], 
  alignedClaims: SupportedClaim[],
  contextUseLog: ContextUseLog,
  creatorName: string,
  credibilityClaim: string,
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

CREDIBILITY FIX: If credibility doesn't match creator info, use exactly:
"I'm ${creatorName}. ${credibilityClaim}"

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
    
    console.log("=== GENERATE SCRIPT V3 (PREP STAGES 1-3 + RAG) ===");
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
    let ragResults: RAGResults = { hooks: [], body_sections: [], proof_sections: [], objection_handlers: [] };
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
          console.log(`RAG retrieved: ${ragResults.hooks.length} hooks, ${ragResults.body_sections.length} body, ${ragResults.proof_sections.length} proof`);
        }
      }
    } catch (ragError) {
      console.log("RAG retrieval failed (continuing without):", ragError);
    }

    // Return prep data for the frontend to orchestrate script generation stages
    console.log("=== PREP STAGES COMPLETE ===");
    console.log("Returning data for frontend orchestration of script generation stages...");

    const bc = context_profile?.business_context || {};
    const targetLength = bc.target_length || context_profile?.target_length || 10;

    return new Response(JSON.stringify({
      // Prep data for script generation stages
      prep_complete: true,
      topic: topic || context_profile?.video_title,
      target_length: targetLength,
      
      // Stage outputs
      research_pack: {
        sources: researchPack.sources,
        claims: alignedClaims,
      },
      alignment_stats: alignmentStats,
      tone_summary: toneSummary,
      rag_results: ragResults,
      rag_examples_section: ragExamplesSection,
      
      // Pass through for script stages
      context_profile,
      aligned_claims: alignedClaims,
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
