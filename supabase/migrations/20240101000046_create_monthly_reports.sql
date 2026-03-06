-- Migration: Create monthly_reports table
-- Description: Monthly owner reports
-- Order: Forty-sixth table (references profiles)

CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  report_month text NOT NULL,
  total_revenue numeric,
  total_properties integer,
  properties_rented integer,
  new_leases integer,
  ended_leases integer,
  total_views integer,
  total_applications integer,
  report_data jsonb,
  generated_at timestamp with time zone DEFAULT now(),
  emailed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT monthly_reports_pkey PRIMARY KEY (id),
  CONSTRAINT monthly_reports_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_monthly_reports_owner_id ON public.monthly_reports(owner_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_report_month ON public.monthly_reports(report_month);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_generated_at ON public.monthly_reports(generated_at);

-- Comments
COMMENT ON TABLE public.monthly_reports IS 'Monthly owner reports';

-- RLS Policies
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.monthly_reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Owners can view their own reports
CREATE POLICY "Owners can view own reports" ON public.monthly_reports
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Service role can insert reports
CREATE POLICY "Service role can insert reports" ON public.monthly_reports
  FOR INSERT
  TO service_role
  WITH CHECK (true);
