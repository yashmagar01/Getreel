-- Create the jobs table (used by cache.py and main.py)
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'processing',
  metadata jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create the ip_rate_limits table (used by rate_limiter.py)
CREATE TABLE IF NOT EXISTS public.ip_rate_limits (
  ip_address text PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 1,
  last_request_time timestamp with time zone DEFAULT timezone('utc'::text, now())
);
