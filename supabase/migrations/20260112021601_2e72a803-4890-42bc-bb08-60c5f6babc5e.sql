-- Add niche column to rag_cta_sections
ALTER TABLE public.rag_cta_sections ADD COLUMN niche text;

-- Add niche column to rag_objection_handlers
ALTER TABLE public.rag_objection_handlers ADD COLUMN niche text;