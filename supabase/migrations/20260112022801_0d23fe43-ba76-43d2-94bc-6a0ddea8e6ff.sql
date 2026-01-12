-- Drop and recreate match_rag_documents to filter by niche before vector search
CREATE OR REPLACE FUNCTION public.match_rag_documents(
  table_name text,
  query_embedding vector,
  match_count integer,
  filter_niche text DEFAULT NULL,
  filter_offer_type text DEFAULT NULL
)
RETURNS TABLE(id uuid, content text, source text, quality_notes text, similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Niche filtering happens BEFORE vector similarity search
  -- We only search within the matching niche for better relevance
  RETURN QUERY EXECUTE format(
    'SELECT id, content, source, quality_notes, 1 - (embedding <=> $1) as similarity
     FROM %I
     WHERE embedding IS NOT NULL
       AND ($2 IS NULL OR niche = $2)
       AND ($3 IS NULL OR offer_type = $3 OR offer_type IS NULL)
     ORDER BY embedding <=> $1
     LIMIT $4',
    table_name
  )
  USING query_embedding, filter_niche, filter_offer_type, match_count;
END;
$$;