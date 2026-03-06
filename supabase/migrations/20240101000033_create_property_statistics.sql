-- Migration: Create property_statistics table
-- Description: Daily property view and application statistics
-- Order: Thirty-third table (references properties)

CREATE TABLE IF NOT EXISTS public.property_statistics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  date date NOT NULL,
  total_views integer DEFAULT 0,
  applications integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT property_statistics_pkey PRIMARY KEY (id),
  CONSTRAINT property_statistics_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_statistics_property_id ON public.property_statistics(property_id);
CREATE INDEX IF NOT EXISTS idx_property_statistics_date ON public.property_statistics(date);
CREATE INDEX IF NOT EXISTS idx_property_statistics_property_date ON public.property_statistics(property_id, date);

-- Comments
COMMENT ON TABLE public.property_statistics IS 'Daily property view and application statistics';

-- RLS Policies
ALTER TABLE public.property_statistics ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.property_statistics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Property owners can view statistics for their properties
CREATE POLICY "Owners can view property statistics" ON public.property_statistics
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Service role can insert statistics
CREATE POLICY "Service role can insert statistics" ON public.property_statistics
  FOR INSERT
  TO service_role
  WITH CHECK (true);
