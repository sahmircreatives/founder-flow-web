import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ToneSummary {
  one_sentence_voice: string;
  tone_rules: string[];
  writing_patterns: string[];
  dont_phrases: string[];
  cadence_notes: string[];
  example_lines: string[];
}

interface SupportedClaim {
  claim: string;
  source_url: string;
  relevance_score: number;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { script, tone_summary, aligned_claims, rag_results } = await req.json();
    
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    console.log("=== SCRIPT POLISH (Stage 4C) ===");
    console.log("Input script length:", script?.length || 0, "chars");

    const toneSummary: ToneSummary = tone_summary || {
      one_sentence_voice: "Professional and engaging",
      tone_rules: [],
      writing_patterns: [],
      dont_phrases: [],
      cadence_notes: [],
      example_lines: []
    };

    const prompt = `You are a script editor doing a final polish pass. Review and improve this script.

CURRENT SCRIPT:
${script}

=== VOICE TO MATCH ===
${toneSummary.one_sentence_voice}

Tone rules:
${toneSummary.tone_rules.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

Example lines (match this rhythm):
${toneSummary.example_lines.map((l: string) => `"${l}"`).join('\n')}

=== POLISH CHECKLIST ===

1. FLOW CHECK:
   - Find any choppy sentence sequences (multiple 1-3 word sentences in a row)
   - Combine them into natural, conversational sentences
   - Ensure each paragraph flows smoothly

2. VOICE CHECK:
   - Remove any slang not in the example lines (Bruh, Dude, Yo, Bro, Man, Like)
   - Ensure the voice matches the tone rules throughout
   - Remove any AI-sounding phrases ("Let's dive in", "Here's the thing", "At the end of the day")

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

    console.log("Calling Claude for polish...");

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
    
    let polishedScript = script;
    let retentionElements: RetentionElements = { open_loops: [], re_hooks: [], pattern_interrupts: [] };
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
      ]
    };
    let changesMade: string[] = [];

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        polishedScript = parsed.script || script;
        retentionElements = parsed.retention_elements || retentionElements;
        contextUseLog = parsed.context_use_log || contextUseLog;
        changesMade = parsed.changes_made || [];
      }
    } catch (e) {
      console.error("Failed to parse polish response, using original script:", e);
    }

    // Add RAG examples used to context log
    if (rag_results) {
      contextUseLog.rag_examples_used = {
        hooks: rag_results.hooks?.slice(0, 2).map((h: any) => h.source || 'Unknown') || [],
        body: rag_results.body_sections?.slice(0, 2).map((b: any) => b.source || 'Unknown') || [],
        cta: rag_results.cta_sections?.slice(0, 1).map((c: any) => c.source || 'Unknown') || [],
        proof: rag_results.proof_sections?.slice(0, 1).map((p: any) => p.source || 'Unknown') || [],
        objection: rag_results.objection_handlers?.slice(0, 1).map((o: any) => o.source || 'Unknown') || []
      };
    }

    console.log("Polish complete. Changes made:", changesMade.length);
    console.log("Final script length:", polishedScript.length, "chars");

    return new Response(JSON.stringify({
      script: polishedScript,
      retention_elements: retentionElements,
      context_use_log: contextUseLog,
      changes_made: changesMade
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Script polish error:", error);
    const message = error instanceof Error ? error.message : "Failed to polish script";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
