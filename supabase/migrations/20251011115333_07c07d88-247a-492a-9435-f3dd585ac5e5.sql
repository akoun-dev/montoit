-- Phase 2: US-019 Rapports Mensuels - Table historique + Cron job

-- Table pour stocker l'historique des rapports générés
CREATE TABLE IF NOT EXISTS public.report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('monthly', 'quarterly', 'annual')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID,
  sent_status TEXT DEFAULT 'sent' CHECK (sent_status IN ('sent', 'failed', 'pending')),
  report_data JSONB NOT NULL,
  email_sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_history_owner ON public.report_history(owner_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_history_period ON public.report_history(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_report_history_generated ON public.report_history(generated_at DESC);

ALTER TABLE public.report_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own reports"
  ON public.report_history FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can view all reports"
  ON public.report_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert reports"
  ON public.report_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update reports"
  ON public.report_history FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_report_history_updated_at
  BEFORE UPDATE ON public.report_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

SELECT cron.schedule(
  'generate-monthly-owner-reports',
  '0 9 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://btxhuqtirylvkgvoutoc.supabase.co/functions/v1/generate-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'mode', 'auto',
      'report_type', 'monthly',
      'scheduled', true,
      'timestamp', now()
    )
  ) as request_id;
  $$
);

CREATE OR REPLACE VIEW public.report_statistics AS
SELECT 
  DATE_TRUNC('month', rh.generated_at) as month,
  rh.report_type,
  COUNT(*) as total_reports,
  COUNT(*) FILTER (WHERE rh.sent_status = 'sent') as sent_count,
  COUNT(*) FILTER (WHERE rh.sent_status = 'failed') as failed_count,
  COUNT(DISTINCT rh.owner_id) as unique_owners,
  ROUND(
    COUNT(*) FILTER (WHERE rh.sent_status = 'sent')::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
  2) as success_rate
FROM public.report_history rh
GROUP BY DATE_TRUNC('month', rh.generated_at), rh.report_type;

GRANT SELECT ON public.report_statistics TO authenticated;