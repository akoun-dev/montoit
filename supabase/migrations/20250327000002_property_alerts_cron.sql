-- Migration: Scheduled Property Alerts Cron Job
-- Description: Configure pg_cron for scheduled property alert matching
-- Order: After property_alert_trigger migration

-- Activer l'extension pg_cron si ce n'est pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Nettoyer les anciens jobs s'ils existent
DELETE FROM public.cron_job WHERE jobname LIKE 'property-alerts%';

-- ===== ALERTES HORAIRES =====
-- Exécuté toutes les heures pour vérifier les nouveaux biens des dernières 60 minutes
SELECT cron.schedule(
  'property-alerts-hourly',
  '0 * * * *', -- Toutes les heures à la minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://votre-projet.supabase.co/functions/v1/scheduled-property-alerts?frequency=hourly',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.edge_function_key', '')
      ),
      body := jsonb_build_object('dryRun', 'false')::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);

-- ===== ALERTES QUOTIDIENNES =====
-- Exécuté tous les jours à 8h du matin pour envoyer les résumés quotidiens
SELECT cron.schedule(
  'property-alerts-daily',
  '0 8 * * *', -- Tous les jours à 8h00
  $$
  SELECT
    net.http_post(
      url := 'https://votre-projet.supabase.co/functions/v1/scheduled-property-alerts?frequency=daily',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.edge_function_key', '')
      ),
      body := jsonb_build_object('dryRun', 'false')::jsonb,
      timeout_milliseconds := 60000
    );
  $$
);

-- ===== ALERTES HEBDOMADAIRES =====
-- Exécuté tous les lundis à 9h du matin pour envoyer les résumés hebdomadaires
SELECT cron.schedule(
  'property-alerts-weekly',
  '0 9 * * 1', -- Tous les lundis à 9h00
  $$
  SELECT
    net.http_post(
      url := 'https://votre-projet.supabase.co/functions/v1/scheduled-property-alerts?frequency=weekly',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.edge_function_key', '')
      ),
      body := jsonb_build_object('dryRun', 'false')::jsonb,
      timeout_milliseconds := 90000
    );
  $$
);

-- ===== NETTOYAGE AUTOMATIQUE =====
-- Nettoyer les enregistrements traités de la file d'attente (plus de 7 jours)
SELECT cron.schedule(
  'property-alerts-queue-cleanup',
  '0 3 * * *', -- Tous les jours à 3h du matin
  $$
  DELETE FROM public.property_alert_queue
  WHERE processed = true
    AND processed_at < NOW() - INTERVAL '7 days'
  $$
);

-- ===== SYNCHRONISATION DES RECHERCHES =====
-- Mettre à jour la date de dernière exécution pour le suivi
SELECT cron.schedule(
  'property-alerts-heartbeat',
  '*/30 * * * *', -- Toutes les 30 minutes
  $$
  INSERT INTO public.system_metrics (metric_name, metric_value, recorded_at)
  VALUES ('property_alerts_last_check', EXTRACT(EPOCH FROM NOW()), NOW())
  ON CONFLICT (metric_name) DO UPDATE SET
    metric_value = EXTRACT(EPOCH FROM NOW()),
    recorded_at = NOW()
  $$
);

-- Commentaires pour documentation
COMMENT ON CRON JOB 'property-alerts-hourly' IS
  'Vérifie toutes les heures les nouveaux biens correspondant aux recherches sauvegardées (alertes immédiates)';

COMMENT ON CRON JOB 'property-alerts-daily' IS
  'Envoie un résumé quotidien des biens correspondant aux recherches sauvegardées';

COMMENT ON CRON JOB 'property-alerts-weekly' IS
  'Envoie un résumé hebdomadaire des biens correspondant aux recherches sauvegardées';

COMMENT ON CRON JOB 'property-alerts-queue-cleanup' IS
  'Nettoie les entrées traitées de la file d''attente des alertes propriétés';

COMMENT ON CRON JOB 'property-alerts-heartbeat' IS
  'Enregistre un heartbeat pour le monitoring du système d''alertes';

-- Table pour les métriques système (créée si elle n'existe pas)
CREATE TABLE IF NOT EXISTS public.system_metrics (
  metric_name TEXT PRIMARY KEY,
  metric_value NUMERIC,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- RLS pour system_metrics
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage system_metrics"
  ON public.system_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can read system_metrics"
  ON public.system_metrics
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.system_metrics IS
  'System metrics for monitoring and health checks';

-- Fonction utilitaire pour vérifier l'état des cron jobs
CREATE OR REPLACE FUNCTION public.get_property_alerts_status()
RETURNS TABLE(
  jobname TEXT,
  schedule TEXT,
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    jobname,
    schedule,
    last_run,
    next_run,
    'active'::TEXT as status
  FROM public.cron_job
  WHERE jobname LIKE 'property-alerts%'
  ORDER BY jobname;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_property_alerts_status() IS
  'Retourne le statut de tous les cron jobs d''alertes propriétés';

-- Fonction pour exécuter manuellement le matching (pour tests ou déclenchement manuel)
CREATE OR REPLACE FUNCTION public.trigger_property_alerts_manual(property_id_param UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  edge_function_url TEXT;
  edge_function_key TEXT;
  request_body JSONB;
  response TEXT;
BEGIN
  edge_function_url := 'https://votre-projet.supabase.co/functions/v1/property-alerts-matcher';
  edge_function_key := COALESCE(current_setting('app.settings.edge_function_key'), '');

  request_body := jsonb_build_object(
    'propertyId', property_id_param
  );

  -- Insérer dans la file pour traitement asynchrone
  IF property_id_param IS NOT NULL THEN
    INSERT INTO public.property_alert_queue (property_id, action, created_at)
    VALUES (property_id_param, 'check_matches', NOW())
    ON CONFLICT (property_id) DO UPDATE SET
      processed = false,
      created_at = NOW();

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Property added to alert queue',
      'property_id', property_id_param
    );
  END IF;

  -- Sans property_id, déclencher le matching pour tous les biens récents
  INSERT INTO public.property_alert_queue (property_id, action, created_at)
  SELECT id, 'check_matches', NOW()
  FROM public.properties
  WHERE status = 'available'
    AND created_at > NOW() - INTERVAL '1 hour'
  LIMIT 100;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Recent properties added to alert queue',
    'count', SQLROWCOUNT
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.trigger_property_alerts_manual(property_id_param UUID) IS
  'Déclenche manuellement le matching d''alertes pour un bien ou tous les biens récents.
  Usage: SELECT trigger_property_alerts_manual('''uuid-du-bien''); -- pour un bien spécifique
         SELECT trigger_property_alerts_manual(); -- pour tous les biens récents';
