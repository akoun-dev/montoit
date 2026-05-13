-- Migration: Create report_history table
-- Description: Report generation history
-- Order: Forty-seventh table (references profiles)

CREATE TABLE IF NOT EXISTS public.report_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  report_type text NOT NULL,
  period_start date,
  period_end date,
  generated_by uuid,
  generated_at timestamp with time zone DEFAULT now(),
  sent_status text,
  email_sent_at timestamp with time zone,
  error_message text,
  report_data jsonb,
  CONSTRAINT report_history_pkey PRIMARY KEY (id),
  CONSTRAINT report_history_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT report_history_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_history_owner_id ON public.report_history(owner_id);
CREATE INDEX IF NOT EXISTS idx_report_history_report_type ON public.report_history(report_type);
CREATE INDEX IF NOT EXISTS idx_report_history_generated_by ON public.report_history(generated_by);
CREATE INDEX IF NOT EXISTS idx_report_history_generated_at ON public.report_history(generated_at);
CREATE INDEX IF NOT EXISTS idx_report_history_sent_status ON public.report_history(sent_status);

-- Comments
COMMENT ON TABLE public.report_history IS 'Report generation history';

-- RLS Policies
ALTER TABLE public.report_history ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.report_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Owners can view their own report history
CREATE POLICY "Owners can view own report history" ON public.report_history
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Service role can insert report history
CREATE POLICY "Service role can insert report history" ON public.report_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);
