CREATE TABLE IF NOT EXISTS public.reel_cache (
  url_hash text PRIMARY KEY,
  url text NOT NULL,
  concept jsonb,
  roadmap text,
  breakdown jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
