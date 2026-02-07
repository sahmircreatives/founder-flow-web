import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { script, instruction, context_profile, chat_history } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    console.log("=== SCRIPT EDITOR CHAT ===");
    console.log("Instruction:", instruction);
    console.log("Script length:", script?.length || 0);

    const systemPrompt = `You are a world-class YouTube script editor. You have the current version of a script and the user wants you to make specific edits.

CURRENT SCRIPT:
${script}

${context_profile ? `BUSINESS CONTEXT:
- Business: ${context_profile.business_context?.business?.name || 'Unknown'}
- Creator: ${context_profile.business_context?.creator?.name || 'Unknown'}
- Niche: ${context_profile.business_context?.industry?.niche || 'Unknown'}
- Video Title: ${context_profile.video_title || 'Unknown'}` : ''}

RULES:
1. Apply the user's requested changes precisely
2. Maintain the script's existing voice and tone
3. Do NOT add fabricated statistics, fake names, or invented stories
4. Keep the credibility section template: "I'm [name]. [credibility_claim]" - never invent credentials
5. Return the COMPLETE updated script, not just the changed parts

Return JSON:
{
  "updated_script": "The complete updated script with changes applied",
  "explanation": "Brief explanation of what you changed (2-3 sentences max)"
}

Return ONLY valid JSON.`;

    const messages: any[] = [];
    
    // Add chat history for context
    if (chat_history?.length > 0) {
      for (const msg of chat_history.slice(-6)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    
    messages.push({ role: "user", content: instruction });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 10000,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Editor chat failed:", response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    let updatedScript = script;
    let explanation = "No changes were made.";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        updatedScript = parsed.updated_script || script;
        explanation = parsed.explanation || "Changes applied.";
      }
    } catch (e) {
      console.error("Failed to parse editor response:", e);
      // Try to use the raw text as explanation
      explanation = text.slice(0, 200);
    }

    console.log("Editor response - explanation:", explanation);

    return new Response(JSON.stringify({ updated_script: updatedScript, explanation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Script editor chat error:", error);
    const message = error instanceof Error ? error.message : "Failed to process edit request";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
