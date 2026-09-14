-- Drop the incorrectly structured table first
DROP TABLE IF EXISTS public.reel_cache;

-- Create the table using the accurate column mappings for backend/cache.py
CREATE TABLE public.reel_cache (
  url_hash text PRIMARY KEY,
  instagram_url text NOT NULL,
  transcript text,
  concept_summary jsonb, 
  roadmap_markdown text,
  promised_link jsonb,
  content_type text,
  blocks jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Apply proper RLS / Access policies for FastAPI backend access
GRANT ALL ON public.reel_cache TO anon;
GRANT ALL ON public.reel_cache TO service_role;
GRANT ALL ON public.reel_cache TO authenticated;
