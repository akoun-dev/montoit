-- Migration: Create migration_status table
-- Description: Database migration tracking
-- Order: One hundred fifth table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.migration_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  migration_name text NOT NULL,
  status text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT migration_status_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_migration_status_migration_name ON public.migration_status(migration_name);
CREATE INDEX IF NOT EXISTS idx_migration_status_status ON public.migration_status(status);
CREATE INDEX IF NOT EXISTS idx_migration_status_created_at ON public.migration_status(created_at);

-- Comments
COMMENT ON TABLE public.migration_status IS 'Database migration tracking';

-- RLS Policies
ALTER TABLE public.migration_status ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.migration_status
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No other access - migration status is internal
