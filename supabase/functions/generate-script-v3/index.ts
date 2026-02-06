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
  writing_patterns: string[];
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
  let sanitized = content.replace(/\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Inc|LLC|Corp|Company|Software|Solutions|Agency|Consulting)\b/g, '[COMPANY]');
  sanitized = sanitized.replace(/\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|k|K|M|B))?/g, '[AMOUNT]');
  sanitized = sanitized.replace(/\b\d+(?:\.\d+)?%/g, '[X%]');
  return sanitized;
}

// Build RAG examples section for the prompt
function buildExamplesSection(retrieved: RAGResults): string {
  let section = '';
  
  if (retrieved.hooks?.length > 0) {
    section += `HOOK EXAMPLES:\n`;
    retrieved.hooks.slice(0, 2).forEach((hook, i) => {
      const sanitizedContent = sanitizeRAGContent(hook.content);
      section += `---\nExample ${i + 1} (similarity: ${hook.similarity?.toFixed(2) || 'N/A'}):\n"${sanitizedContent}"\n---\n`;
    });
    section += `↳ Pattern from: Opening structure, curiosity loop setup, pacing\n\n`;
  }
  
  if (retrieved.body_sections?.length > 0) {
    section += `BODY/VALUE EXAMPLES:\n`;
    retrieved.body_sections.slice(0, 2).forEach((body, i) => {
      const sanitizedContent = sanitizeRAGContent(body.content);
      section += `---\nExample ${i + 1} (similarity: ${body.similarity?.toFixed(2) || 'N/A'}):\n"${sanitizedContent}"\n---\n`;
    });
    section += `↳ Pattern from: How points are explained, transitions, depth of value\n\n`;
  }
  
  if (retrieved.proof_sections?.length > 0) {
    const sanitizedContent = sanitizeRAGContent(retrieved.proof_sections[0].content);
    section += `PROOF EXAMPLE:\n---\n"${sanitizedContent}"\n---\n`;
    section += `↳ Pattern from: How results are presented, specificity, weaving into value\n\n`;
  }
  
  if (retrieved.objection_handlers?.length > 0) {
    const sanitizedContent = sanitizeRAGContent(retrieved.objection_handlers[0].content);
    section += `OBJECTION HANDLER EXAMPLE:\n---\n"${sanitizedContent}"\n---\n`;
    section += `↳ Pattern from: How objection is acknowledged and reframed naturally\n\n`;
  }
  
  return section;
}

// Stage 0: RAG Retrieve
async function runRAGStage(context_profile: any, topic: string): Promise<{ ragResults: RAGResults; ragExamplesSection: string }> {
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
          video_title: topic,
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
      }
    }
  } catch (ragError) {
    console.log("RAG retrieval failed (continuing without):", ragError);
  }
  
  return { ragResults, ragExamplesSection };
}

// Stage 1: Research
async function runResearchStage(topic: string, contextProfile: any): Promise<ResearchPack> {
  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  
  if (!PERPLEXITY_API_KEY) {
    console.error("PERPLEXITY_API_KEY not configured, using fallback research");
    return { sources: [], claims: [] };
  }

  const audience = contextProfile?.vsl_context?.target_audience?.demographics || {};
  const industry = contextProfile?.vsl_context?.industry_niche || {};
  
  const searchQuery = `${topic} for ${audience.profession || 'professionals'} in ${industry.primary_industry || 'business'} - latest research, statistics, case studies, proven strategies`;

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
          { role: "user", content: searchQuery }
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

    const sources: ResearchSource[] = citations.slice(0, 10).map((url: string, idx: number) => ({
      title: `Source ${idx + 1}`,
      url: url,
      snippet: "Research source from Perplexity search",
    }));

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
  if (!ANTHROPIC_API_KEY) return [];

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
        messages: [{
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

Return ONLY valid JSON array.`
        }],
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const text = data.content?.[0]?.text || "[]";
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

// Stage 3: Alignment
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
      stats: { filtered_claims_count: 0, original_claims_count: originalCount }
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
        model: "claude-opus-4-6",
        max_tokens: 3000,
        messages: [{
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
{ "aligned_claims": [array of filtered claims with claim, source_url, relevance_score] }

Return ONLY valid JSON.`
        }],
      }),
    });

    if (!response.ok) {
      return { alignedClaims: researchPack.claims, stats: { filtered_claims_count: originalCount, original_claims_count: originalCount } };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        alignedClaims: result.aligned_claims || [],
        stats: { filtered_claims_count: result.aligned_claims?.length || 0, original_claims_count: originalCount }
      };
    }

    return { alignedClaims: researchPack.claims, stats: { filtered_claims_count: originalCount, original_claims_count: originalCount } };
  } catch (error) {
    console.error("Alignment error:", error);
    return { alignedClaims: researchPack.claims, stats: { filtered_claims_count: originalCount, original_claims_count: originalCount } };
  }
}

// Stage 4: Tone Distillation
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
        model: "claude-opus-4-6",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `You are a voice/tone analyst. Extract PURE STYLE PATTERNS from these tweets. 

STEP 1: FILTER TWEETS
Before analyzing, SKIP any tweet that:
- Is a retweet, quote tweet, or starts with "RT @"
- Is under 100 characters
- Is primarily a link share
- Is promotional content
- Is sponsored/ad content
- Is just @mentioning or praising someone else

Only analyze tweets that are ORIGINAL THOUGHTS showing the person's actual voice and thinking.

STEP 2: EXTRACT STYLE (from filtered tweets only)

CRITICAL: This is STYLE ONLY. Do NOT extract:
- Facts, statistics, or claims
- Proof points or evidence
- Specific examples or case studies
- EXACT PHRASES or specific words to copy

ONLY extract abstract writing patterns, cadence, and personality traits.

TWEETS:
${tweets}

Return a JSON object:
{
  "one_sentence_voice": "A single sentence describing the overall voice/personality",
  "tone_rules": ["max 10 rules about HOW they write"],
  "writing_patterns": ["max 10 ABSTRACT style patterns - NOT specific phrases"],
  "dont_phrases": ["max 10 phrases/words they avoid or wouldn't use"],
  "cadence_notes": ["Notes about rhythm, paragraph length, sentence structure"]
}

Return ONLY valid JSON.`
        }],
      }),
    });

    if (!response.ok) return defaultTone;

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { stage, topic, context_profile, tweets, constraints, research_pack, user_modifications } = body;

    const resolvedTopic = topic || context_profile?.video_title || "business growth";

    // STAGE-BY-STAGE execution
    if (stage === "rag") {
      console.log("=== STAGE 0: RAG RETRIEVE ===");
      const { ragResults, ragExamplesSection } = await runRAGStage(context_profile, resolvedTopic);
      console.log(`RAG retrieved: ${ragResults.hooks.length} hooks, ${ragResults.body_sections.length} body, ${ragResults.proof_sections.length} proof`);
      
      return new Response(JSON.stringify({
        stage: "rag",
        rag_results: ragResults,
        rag_examples_section: ragExamplesSection,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (stage === "research") {
      console.log("=== STAGE 1: RESEARCH ===");
      const researchPack = await runResearchStage(resolvedTopic, context_profile);
      console.log(`Research found ${researchPack.sources.length} sources, ${researchPack.claims.length} claims`);
      
      return new Response(JSON.stringify({
        stage: "research",
        research_pack: researchPack,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (stage === "claims") {
      console.log("=== STAGE 2: CLAIMS EXTRACTION ===");
      // Claims extraction is already done inside research stage (extractClaimsFromResearch)
      // This stage allows the user to review/modify the claims from research
      // If user_modifications provided, use those instead
      const claims = user_modifications?.claims || research_pack?.claims || [];
      
      return new Response(JSON.stringify({
        stage: "claims",
        claims: claims,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (stage === "alignment") {
      console.log("=== STAGE 3: CLAIMS ALIGNMENT ===");
      const inputClaims = user_modifications?.claims || research_pack?.claims || [];
      const inputPack: ResearchPack = { sources: research_pack?.sources || [], claims: inputClaims };
      const { alignedClaims, stats } = await runAlignmentStage(inputPack, context_profile);
      console.log(`Alignment kept ${alignedClaims.length} of ${inputClaims.length} claims`);
      
      return new Response(JSON.stringify({
        stage: "alignment",
        aligned_claims: alignedClaims,
        alignment_stats: stats,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (stage === "tone") {
      console.log("=== STAGE 4: TONE DISTILLATION ===");
      const toneSummary = await runToneDistillationStage(tweets || "");
      console.log(`Tone distilled: "${toneSummary.one_sentence_voice}"`);
      
      return new Response(JSON.stringify({
        stage: "tone",
        tone_summary: toneSummary,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // LEGACY: no stage param = run all prep stages at once (backward compat)
    console.log("=== GENERATE SCRIPT V3 (ALL PREP STAGES) ===");
    const researchPack2 = await runResearchStage(resolvedTopic, context_profile);
    const { alignedClaims, stats: alignmentStats } = await runAlignmentStage(researchPack2, context_profile);
    const toneSummary = await runToneDistillationStage(tweets || "");
    const { ragResults, ragExamplesSection } = await runRAGStage(context_profile, resolvedTopic);

    const bc = context_profile?.business_context || {};
    const targetLength = bc.target_length || context_profile?.target_length || 10;

    return new Response(JSON.stringify({
      prep_complete: true,
      topic: resolvedTopic,
      target_length: targetLength,
      research_pack: { sources: researchPack2.sources, claims: alignedClaims },
      alignment_stats: alignmentStats,
      tone_summary: toneSummary,
      rag_results: ragResults,
      rag_examples_section: ragExamplesSection,
      context_profile,
      aligned_claims: alignedClaims,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    console.error("Generate script v3 error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate script";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
