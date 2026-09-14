CREATE TABLE IF NOT EXISTS public.reel_cache (
  url_hash text PRIMARY KEY,
  url text NOT NULL,
  concept jsonb,
  roadmap text,
  breakdown jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Fix Supabase 403 Forbidden (42501) by granting access to anon and service_role
GRANT ALL ON public.reel_cache TO anon;
GRANT ALL ON public.reel_cache TO service_role;
GRANT ALL ON public.reel_cache TO authenticated;
