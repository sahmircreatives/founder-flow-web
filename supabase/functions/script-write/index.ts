import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonError(message: string, code: string, status: number): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getClientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || null;
  return req.headers.get("x-real-ip") || null;
}

// Server-side free-script gate. Returns either an error Response to short-circuit
// with, or an authorized context whose `consume()` must be called AFTER a script
// is successfully generated. This cannot be bypassed from the frontend because
// the free_scripts_used count is only ever mutated here via the service role.
async function authorizeFreeScript(req: Request): Promise<
  | { ok: false; response: Response }
  | { ok: true; consume: () => Promise<void> }
> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return { ok: false, response: jsonError("Server auth is not configured.", "CONFIG", 500) };
  }

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return { ok: false, response: jsonError("Please sign in with Google to generate a script.", "AUTH_REQUIRED", 401) };
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (userErr || !user) {
    return { ok: false, response: jsonError("Please sign in with Google to generate a script.", "AUTH_REQUIRED", 401) };
  }

  const ip = getClientIp(req);

  // Ensure a profile row exists (the signup trigger should have created one).
  let { data: profile } = await admin
    .from("profiles")
    .select("id, email, free_scripts_used, is_paid, signup_ip")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const { data: inserted } = await admin
      .from("profiles")
      .insert({ id: user.id, email: user.email })
      .select("id, email, free_scripts_used, is_paid, signup_ip")
      .single();
    profile = inserted;
  }

  // Paid accounts bypass the free-script gate entirely.
  if (profile?.is_paid) {
    return { ok: true, consume: async () => {} };
  }

  // Already used their one free script.
  if ((profile?.free_scripts_used ?? 0) >= 1) {
    return {
      ok: false,
      response: jsonError(
        "You've used your free script. Book a call to unlock unlimited scripts.",
        "FREE_LIMIT_REACHED",
        403,
      ),
    };
  }

  // Light anti-abuse: block if the same email or signup IP already burned a free
  // script on a different account.
  const orFilters: string[] = [];
  if (user.email) orFilters.push(`email.eq.${user.email}`);
  if (ip) orFilters.push(`signup_ip.eq.${ip}`);
  if (orFilters.length > 0) {
    const { data: priorUse } = await admin
      .from("profiles")
      .select("id")
      .neq("id", user.id)
      .gte("free_scripts_used", 1)
      .or(orFilters.join(","))
      .limit(1);
    if (priorUse && priorUse.length > 0) {
      return {
        ok: false,
        response: jsonError(
          "A free script has already been used from this account or network. Book a call for more.",
          "ABUSE_BLOCKED",
          403,
        ),
      };
    }
  }

  // Authorized. The caller consumes the free script only after a successful write,
  // via an atomic DB function that can never push the count above 1.
  return {
    ok: true,
    consume: async () => {
      await admin.rpc("consume_free_script", { p_user_id: user.id, p_ip: ip });
    },
  };
}

interface SupportedClaim {
  claim: string;
  source_url: string;
  relevance_score: number;
}

interface ToneSummary {
  one_sentence_voice: string;
  tone_rules: string[];
  writing_patterns: string[];
  dont_phrases: string[];
  cadence_notes: string[];
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

  // Enforce the free-script gate BEFORE spending any AI tokens.
  const gate = await authorizeFreeScript(req);
  if (!gate.ok) return gate.response;

  try {
    const { structure, topic, context_profile, tone_summary, aligned_claims, rag_examples_section } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    console.log("=== SCRIPT WRITE (Stage 4B) ===");
    console.log("Topic:", topic);

    const bc = context_profile?.business_context || {};
    const business = bc.business || {};
    const offer = bc.offer || {};
    const creator = bc.creator || {};

    const alignedClaims: SupportedClaim[] = aligned_claims || [];
    const toneSummary: ToneSummary = tone_summary || {
      one_sentence_voice: "Professional and engaging",
      tone_rules: [],
      writing_patterns: [],
      dont_phrases: [],
      cadence_notes: [],
    };
    const scriptStructure: ScriptStructure = structure;

    // Build claims with indices for reference
    const claimsWithIndices = alignedClaims.map((c, i) => `[${i}] ${c.claim} (Source: ${c.source_url})`).join('\n');

    // Build structure summary
    const structureSummary = scriptStructure.sections.map(s => 
      `${s.name.toUpperCase()} (~${s.word_count_target} words):
  Purpose: ${s.purpose}
  Key points: ${s.key_points.join(' | ')}
  Use claims: ${s.claims_to_use.length > 0 ? s.claims_to_use.map(i => `[${i}]`).join(', ') : 'None required'}`
    ).join('\n\n');

    // Build retention instructions
    const retentionInstructions = `
OPEN LOOPS TO INCLUDE:
${scriptStructure.retention_map.open_loops.map(l => `- In ${l.location}: "${l.loop_description}" (closes in ${l.closes_at})`).join('\n')}

RE-HOOKS TO INCLUDE:
${scriptStructure.retention_map.re_hooks.map(r => `- After ${r.after_section}: ${r.re_hook_approach}`).join('\n')}

PATTERN INTERRUPTS:
${scriptStructure.retention_map.pattern_interrupts.map(p => `- In ${p.location}: ${p.type} - ${p.description}`).join('\n')}

MEGA PAYOFF in ${scriptStructure.mega_payoff.section}: ${scriptStructure.mega_payoff.insight}`;

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

${rag_examples_section ? `=== REFERENCE EXAMPLES (structure/flow only) ===\n${rag_examples_section}` : ''}

=== WRITING RULES ===
1. Write for SPOKEN delivery, not Twitter/LinkedIn
2. Avoid choppy 1-2 word sentences in a row
3. Combine related ideas into flowing sentences
4. BAD: "Two founders. Same revenue. One pays $180k. The other pays $50k."
5. GOOD: "Two founders with the same revenue—one pays $180k, the other pays $50k."
6. Each line should flow naturally to the next
7. Read it out loud - if it sounds punchy like social media, rewrite it
8. CREDIBILITY SECTION must use exactly: "I'm ${creator.name || '[CREATOR NAME]'}. ${creator.credibility_claim || '[CREDIBILITY CLAIM]'}" - Do not invent credentials.

=== FABRICATION PREVENTION (CRITICAL) ===
NEVER FABRICATE:
- Specific dollar amounts in examples (e.g., "$220,000 refund") - ONLY use amounts from research claims
- Specific percentages not in research (e.g., "70% of startups") - ONLY use stats from research claims  
- Emotional story details (e.g., "called me crying", "couldn't believe it")
- Specific client/founder names (Sarah, Mike, John, etc.)
- "Our first client", "One of our clients" stories with specific outcomes

INSTEAD USE:
- Hypothetical framing: "Imagine you're a founder who..." or "Let's say you..."
- General statements: "Most founders", "Many startups", "A lot of companies"
- Research-backed claims ONLY: Use the exact claims from the RESEARCH CLAIMS section above
- If you need an example, make it clearly hypothetical with no specific amounts

=== OUTPUT FORMAT ===
Write the complete script with section labels only (no timestamps, no markdown).

Example:
HOOK

[Spoken script text here...]

SETUP

[Spoken script text here...]

Write the COMPLETE script now.`;

    console.log("Calling Claude for script writing...");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
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
    const script = data.content?.[0]?.text || "";

    console.log("Script written, length:", script.length, "chars");

    // Only consume the free script once we actually produced one.
    await gate.consume();

    return new Response(JSON.stringify({ script }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Script write error:", error);
    const message = error instanceof Error ? error.message : "Failed to write script";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
