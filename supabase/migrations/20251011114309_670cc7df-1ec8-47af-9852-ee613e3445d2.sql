-- Phase 1: US-003 Finalisation - Configuration pg_cron et cleanup

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule hourly property alerts check
-- Exécute check-property-alerts toutes les heures à la minute 0
SELECT cron.schedule(
  'check-property-alerts-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://btxhuqtirylvkgvoutoc.supabase.co/functions/v1/check-property-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object('scheduled', true, 'timestamp', now())
  ) as request_id;
  $$
);

-- Schedule daily cleanup of old alert history (keep 90 days)
-- Exécute tous les jours à 3h du matin
SELECT cron.schedule(
  'cleanup-alert-history-daily',
  '0 3 * * *',
  $$
  DELETE FROM public.alert_history 
  WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);

-- Create view for alert analytics
CREATE OR REPLACE VIEW public.property_alerts_analytics AS
SELECT 
  DATE_TRUNC('day', ah.created_at) as date,
  ah.alert_type,
  ah.delivery_method,
  ah.delivery_status,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE ah.opened_at IS NOT NULL) as opened_count,
  COUNT(*) FILTER (WHERE ah.clicked_at IS NOT NULL) as clicked_count,
  ROUND(
    COUNT(*) FILTER (WHERE ah.opened_at IS NOT NULL)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
  2) as open_rate,
  ROUND(
    COUNT(*) FILTER (WHERE ah.clicked_at IS NOT NULL)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
  2) as click_rate
FROM public.alert_history ah
GROUP BY DATE_TRUNC('day', ah.created_at), ah.alert_type, ah.delivery_method, ah.delivery_status;

-- Grant access to view
GRANT SELECT ON public.property_alerts_analytics TO authenticated;

-- Function to get alert statistics
CREATE OR REPLACE FUNCTION public.get_alert_statistics(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_alerts_active BIGINT,
  total_alerts_sent_today BIGINT,
  total_alerts_sent_week BIGINT,
  total_alerts_sent_month BIGINT,
  avg_open_rate NUMERIC,
  avg_click_rate NUMERIC,
  users_with_alerts BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.property_alerts WHERE is_active = true)::BIGINT,
    (SELECT COUNT(*) FROM public.alert_history WHERE created_at >= CURRENT_DATE)::BIGINT,
    (SELECT COUNT(*) FROM public.alert_history WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT,
    (SELECT COUNT(*) FROM public.alert_history WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')::BIGINT,
    (SELECT ROUND(AVG(open_rate), 2) FROM public.property_alerts_analytics WHERE date >= p_start_date AND date <= p_end_date),
    (SELECT ROUND(AVG(click_rate), 2) FROM public.property_alerts_analytics WHERE date >= p_start_date AND date <= p_end_date),
    (SELECT COUNT(DISTINCT user_id) FROM public.property_alerts WHERE is_active = true)::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_alert_statistics TO authenticated;