-- Migration: Create monartisan_quotes table
-- Description: MonArtisan quotes for job requests
-- Order: One hundred first table (references monartisan_job_requests)

CREATE TABLE IF NOT EXISTS public.monartisan_quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_request_id uuid,
  amount numeric,
  details text,
  status text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT monartisan_quotes_pkey PRIMARY KEY (id),
  CONSTRAINT monartisan_quotes_job_request_id_fkey FOREIGN KEY (job_request_id) REFERENCES public.monartisan_job_requests(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_monartisan_quotes_job_request_id ON public.monartisan_quotes(job_request_id);
CREATE INDEX IF NOT EXISTS idx_monartisan_quotes_status ON public.monartisan_quotes(status);

-- Comments
COMMENT ON TABLE public.monartisan_quotes IS 'MonArtisan quotes for job requests';

-- RLS Policies
ALTER TABLE public.monartisan_quotes ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.monartisan_quotes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view quotes for their job requests
CREATE POLICY "Users can view quotes" ON public.monartisan_quotes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.monartisan_job_requests mr
      JOIN public.maintenance_requests m ON m.id = mr.maintenance_request_id
      WHERE mr.id = job_request_id AND m.tenant_id = auth.uid()
    )
  );
