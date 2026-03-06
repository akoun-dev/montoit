-- Migration: Create cev_reports table
-- Description: CEV mission reports
-- Order: Forty-first table (references cev_missions, profiles)

CREATE TABLE IF NOT EXISTS public.cev_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL,
  report_type text CHECK (report_type = ANY (ARRAY['verification'::text, 'inspection'::text, 'mediation'::text, 'documentation'::text, 'etat_lieux'::text])),
  report_content jsonb NOT NULL,
  attachments text[] DEFAULT '{}'::text[],
  findings jsonb,
  recommendations jsonb,
  submitted_by uuid NOT NULL,
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  review_notes text,
  CONSTRAINT cev_reports_pkey PRIMARY KEY (id),
  CONSTRAINT cev_reports_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.cev_missions(id) ON DELETE CASCADE,
  CONSTRAINT cev_reports_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT cev_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cev_reports_mission_id ON public.cev_reports(mission_id);
CREATE INDEX IF NOT EXISTS idx_cev_reports_report_type ON public.cev_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_cev_reports_submitted_by ON public.cev_reports(submitted_by);
CREATE INDEX IF NOT EXISTS idx_cev_reports_reviewed_by ON public.cev_reports(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_cev_reports_status ON public.cev_reports(status);
CREATE INDEX IF NOT EXISTS idx_cev_reports_submitted_at ON public.cev_reports(submitted_at);

-- Comments
COMMENT ON TABLE public.cev_reports IS 'CEV mission reports';
COMMENT ON COLUMN public.cev_reports.report_type IS 'Type: verification, inspection, mediation, documentation, etat_lieux';
COMMENT ON COLUMN public.cev_reports.status IS 'Status: pending, approved, rejected';

-- RLS Policies
ALTER TABLE public.cev_reports ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.cev_reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trust agents can view all reports
CREATE POLICY "Trust agents can view reports" ON public.cev_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Users can view their own submitted reports
CREATE POLICY "Users can view own reports" ON public.cev_reports
  FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

-- Property owners can view reports for their properties
CREATE POLICY "Owners can view property reports" ON public.cev_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cev_missions cm
      JOIN public.properties p ON p.id = cm.property_id
      WHERE cm.id = mission_id AND p.owner_id = auth.uid()
    )
  );

-- Trust agents can review reports
CREATE POLICY "Trust agents can review reports" ON public.cev_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );
