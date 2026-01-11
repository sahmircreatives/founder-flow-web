import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const { transcript, source_name, niche, sub_niche, offer_type } = await req.json();
    
    if (!transcript || typeof transcript !== "string") {
      throw new Error("Transcript is required");
    }

    console.log("Chunking transcript, length:", transcript.length);

    const prompt = `You are a script analyst preparing content for a RAG database.

TRANSCRIPT:
${transcript}

SOURCE INFO:
- Source Name: ${source_name || "Unknown"}
- Niche: ${niche || "Not specified"}
- Sub Niche: ${sub_niche || "Not specified"}
- Offer Type: ${offer_type || "Not specified"}

Break this transcript into sections. Return JSON only:

{
  "sections": [
    {
      "type": "hook | body | cta | proof | objection_handler",
      "content": "exact text from transcript (100-400 words per chunk)",
      "topic_tags": [],
      "niche": "${niche || ""}",
      "sub_niche": "${sub_niche || ""}",
      "offer_type": "${offer_type || ""}",
      "source": "${source_name || ""}",
      "quality_notes": "what makes this section effective"
    }
  ]
}

SECTION DEFINITIONS:
- hook: Opening that grabs attention (first 30 seconds typically)
- body: Main teaching/value sections (break into multiple if long)
- cta: Call to action asking viewer to do something
- proof: Case studies, results, testimonials, social proof
- objection_handler: Addressing doubts, pushback, or "but what about..."

RULES:
- Each body section should cover ONE main point
- Keep chunks 100-400 words
- Include full context - don't cut mid-sentence
- A transcript can have multiple body sections
- Only tag as "proof" if it contains specific results/numbers
- Always include the exact type value from the list above

Return ONLY valid JSON, no other text.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 8000,
        messages: [
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse response as JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log("Chunked into", parsed.sections?.length || 0, "sections");

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Chunking error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
