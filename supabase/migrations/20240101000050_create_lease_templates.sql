-- Migration: Create lease_templates table
-- Description: Lease contract templates
-- Order: Fiftieth table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.lease_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lease_templates_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lease_templates_name ON public.lease_templates(name);

-- Comments
COMMENT ON TABLE public.lease_templates IS 'Lease contract templates';

-- RLS Policies
ALTER TABLE public.lease_templates ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.lease_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can view templates
CREATE POLICY "Authenticated users can view templates" ON public.lease_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Updated at trigger
CREATE TRIGGER update_lease_templates_updated_at
  BEFORE UPDATE ON public.lease_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
