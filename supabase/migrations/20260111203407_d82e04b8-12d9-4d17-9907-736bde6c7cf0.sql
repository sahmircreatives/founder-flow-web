-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Hooks collection
CREATE TABLE public.rag_hooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  niche text,
  sub_niche text,
  offer_type text,
  topic_tags text[],
  source text,
  quality_notes text,
  embedding vector(1536),
  created_at timestamp with time zone DEFAULT now()
);

-- Body sections collection
CREATE TABLE public.rag_body_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  niche text,
  sub_niche text,
  offer_type text,
  topic_tags text[],
  source text,
  quality_notes text,
  embedding vector(1536),
  created_at timestamp with time zone DEFAULT now()
);

-- CTA sections collection
CREATE TABLE public.rag_cta_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  offer_type text,
  cta_type text,
  source text,
  quality_notes text,
  embedding vector(1536),
  created_at timestamp with time zone DEFAULT now()
);

-- Proof sections collection
CREATE TABLE public.rag_proof_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  niche text,
  proof_type text,
  source text,
  quality_notes text,
  embedding vector(1536),
  created_at timestamp with time zone DEFAULT now()
);

-- Objection handlers collection
CREATE TABLE public.rag_objection_handlers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  objection_type text,
  offer_type text,
  source text,
  quality_notes text,
  embedding vector(1536),
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for vector similarity search
CREATE INDEX ON public.rag_hooks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON public.rag_body_sections USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON public.rag_cta_sections USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON public.rag_proof_sections USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON public.rag_objection_handlers USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create indexes for filtering
CREATE INDEX ON public.rag_hooks (niche, offer_type);
CREATE INDEX ON public.rag_body_sections (niche, offer_type);
CREATE INDEX ON public.rag_cta_sections (offer_type);
CREATE INDEX ON public.rag_proof_sections (niche);
CREATE INDEX ON public.rag_objection_handlers (offer_type);

-- Enable RLS on all tables
ALTER TABLE public.rag_hooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_body_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_cta_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_proof_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_objection_handlers ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (since this is admin-managed content)
CREATE POLICY "Allow public read access on rag_hooks" ON public.rag_hooks FOR SELECT USING (true);
CREATE POLICY "Allow public read access on rag_body_sections" ON public.rag_body_sections FOR SELECT USING (true);
CREATE POLICY "Allow public read access on rag_cta_sections" ON public.rag_cta_sections FOR SELECT USING (true);
CREATE POLICY "Allow public read access on rag_proof_sections" ON public.rag_proof_sections FOR SELECT USING (true);
CREATE POLICY "Allow public read access on rag_objection_handlers" ON public.rag_objection_handlers FOR SELECT USING (true);

-- Create policies for insert/update/delete (allow all for now - admin only page)
CREATE POLICY "Allow all insert on rag_hooks" ON public.rag_hooks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on rag_hooks" ON public.rag_hooks FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on rag_hooks" ON public.rag_hooks FOR DELETE USING (true);

CREATE POLICY "Allow all insert on rag_body_sections" ON public.rag_body_sections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on rag_body_sections" ON public.rag_body_sections FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on rag_body_sections" ON public.rag_body_sections FOR DELETE USING (true);

CREATE POLICY "Allow all insert on rag_cta_sections" ON public.rag_cta_sections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on rag_cta_sections" ON public.rag_cta_sections FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on rag_cta_sections" ON public.rag_cta_sections FOR DELETE USING (true);

CREATE POLICY "Allow all insert on rag_proof_sections" ON public.rag_proof_sections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on rag_proof_sections" ON public.rag_proof_sections FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on rag_proof_sections" ON public.rag_proof_sections FOR DELETE USING (true);

CREATE POLICY "Allow all insert on rag_objection_handlers" ON public.rag_objection_handlers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on rag_objection_handlers" ON public.rag_objection_handlers FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on rag_objection_handlers" ON public.rag_objection_handlers FOR DELETE USING (true);

-- Generic similarity search function
CREATE OR REPLACE FUNCTION public.match_rag_documents(
  table_name text,
  query_embedding vector(1536),
  match_count int,
  filter_niche text DEFAULT NULL,
  filter_offer_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  source text,
  quality_notes text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT id, content, source, quality_notes, 1 - (embedding <=> $1) as similarity
     FROM %I
     WHERE embedding IS NOT NULL
       AND ($2 IS NULL OR niche = $2 OR niche IS NULL)
       AND ($3 IS NULL OR offer_type = $3 OR offer_type IS NULL)
     ORDER BY embedding <=> $1
     LIMIT $4',
    table_name
  )
  USING query_embedding, filter_niche, filter_offer_type, match_count;
END;
$$;