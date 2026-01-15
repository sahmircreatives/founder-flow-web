import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RetrievedExample {
  id: string;
  content: string;
  source: string;
  quality_notes: string;
  similarity: number;
}

interface RAGResults {
  hooks: RetrievedExample[];
  body_sections: RetrievedExample[];
  proof_sections: RetrievedExample[];
  objection_handlers: RetrievedExample[];
}

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding error: ${response.status}`);
  }

  const data = await response.json();
  return data.data?.[0]?.embedding || [];
}

async function searchCollection(
  supabase: any,
  tableName: string,
  queryEmbedding: number[],
  limit: number,
  filterNiche: string | null,
  filterOfferType: string | null
): Promise<RetrievedExample[]> {
  try {
    const { data, error } = await supabase.rpc("match_rag_documents", {
      table_name: tableName,
      query_embedding: queryEmbedding,
      match_count: limit,
      filter_niche: filterNiche,
      filter_offer_type: filterOfferType,
    });

    if (error) {
      console.error(`Search error for ${tableName}:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error(`Search collection error for ${tableName}:`, error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      video_title,
      niche,
      sub_niche,
      offer_type,
      profession,
      primary_problem,
      first_objection,
    } = await req.json();

    console.log("RAG Retrieve inputs:", { video_title, niche, offer_type, profession });

    // Generate embeddings for different search queries in parallel (no CTA - comes from business context)
    const [hookEmbedding, bodyEmbedding, proofEmbedding, objectionEmbedding] = await Promise.all([
      generateEmbedding(`${video_title} ${niche}`, OPENAI_API_KEY),
      generateEmbedding(`${video_title} ${primary_problem} ${profession}`, OPENAI_API_KEY),
      generateEmbedding(`${niche} ${sub_niche} results case study`, OPENAI_API_KEY),
      generateEmbedding(first_objection || `${offer_type} objection doubt`, OPENAI_API_KEY),
    ]);

    console.log("Embeddings generated, searching collections...");

    // Search each collection in parallel (no CTA collection - CTA comes only from business context)
    // IMPORTANT: Niche filtering happens BEFORE vector similarity in the database function
    const [hooks, bodySections, proofSections, objectionHandlers] = await Promise.all([
      searchCollection(supabase, "rag_hooks", hookEmbedding, 2, niche, offer_type),
      searchCollection(supabase, "rag_body_sections", bodyEmbedding, 2, niche, null),
      searchCollection(supabase, "rag_proof_sections", proofEmbedding, 1, niche, null),
      searchCollection(supabase, "rag_objection_handlers", objectionEmbedding, 1, niche, offer_type),
    ]);

    const results: RAGResults = {
      hooks,
      body_sections: bodySections,
      proof_sections: proofSections,
      objection_handlers: objectionHandlers,
    };

    console.log("RAG results:", {
      hooks: hooks.length,
      body_sections: bodySections.length,
      proof_sections: proofSections.length,
      objection_handlers: objectionHandlers.length,
    });

    return new Response(JSON.stringify({ retrieved_examples: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("RAG retrieve error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
