-- Migration: Property Alert Trigger
-- Description: Trigger to automatically check for matching saved searches when a property is created/updated
-- Order: After saved_searches table

-- Créer la fonction pour appeler l'edge function de matching
CREATE OR REPLACE FUNCTION public.trigger_property_alerts()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  edge_function_key TEXT;
  response TEXT;
  http_result TEXT;
BEGIN
  -- Récupérer l'URL de l'edge function depuis les variables d'environnement ou utiliser une valeur par défaut
  -- Note: En production, utilisez l'URL de votre edge function déployée
  edge_function_url := 'https://votre-projet.supabase.co/functions/v1/property-alerts-matcher';
  edge_function_key := COALESCE(current_setting('app.settings.edge_function_key'), '');

  -- Préparer le payload
  SELECT json_build_object(
    'propertyId', NEW.id
  ) INTO http_result;

  -- Appeler l'edge function via pg_net (extension disponible dans Supabase)
  -- Note: pg_net doit être activé ou utilisez un autre mécanisme

  -- Option 1: Utiliser pg_net si disponible
  -- PERFORM net.http_post(
  --   edge_function_url,
  --   http_result,
  --   json_build_object(
  --     'Authorization', 'Bearer ' || edge_function_key,
  --     'Content-Type', 'application/json'
  --   )
  -- );

  -- Option 2: Insérer dans une file d'attente pour traitement asynchrone
  INSERT INTO public.property_alert_queue (property_id, action, created_at)
  VALUES (NEW.id, 'check_matches', NOW())
  ON CONFLICT (property_id) DO NOTHING;

  -- Option 3: Utiliser un background worker (recommandé pour la production)
  -- Cette approche évite de bloquer l'insertion du bien

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Logger l'erreur mais ne pas bloquer l'insertion
  RAISE WARNING 'Failed to trigger property alerts: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer la table de file d'attente pour les alerts
CREATE TABLE IF NOT EXISTS public.property_alert_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  action text NOT NULL DEFAULT 'check_matches',
  processed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  error_message text,
  CONSTRAINT property_alert_queue_pkey PRIMARY KEY (id),
  CONSTRAINT property_alert_queue_property_id_fkey FOREIGN KEY (property_id)
    REFERENCES public.properties(id) ON DELETE CASCADE
);

-- Index pour optimiser le traitement
CREATE INDEX IF NOT EXISTS idx_property_alert_queue_processed
  ON public.property_alert_queue(processed, created_at)
  WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_property_alert_queue_created_at
  ON public.property_alert_queue(created_at);

-- Commentaires
COMMENT ON TABLE public.property_alert_queue IS 'Queue for property alert matching operations';
COMMENT ON FUNCTION public.trigger_property_alerts() IS 'Triggers property alert matching when properties are created';

-- Créer le trigger sur la table properties
DROP TRIGGER IF EXISTS on_property_insert_for_alerts ON public.properties;

CREATE TRIGGER on_property_insert_for_alerts
  AFTER INSERT ON public.properties
  FOR EACH ROW
  WHEN (NEW.status = 'available') -- Seulement pour les biens disponibles
  EXECUTE FUNCTION public.trigger_property_alerts();

-- Créer aussi un trigger pour les mises à jour (si le statut devient disponible)
DROP TRIGGER IF EXISTS on_property_update_for_alerts ON public.properties;

CREATE TRIGGER on_property_update_for_alerts
  AFTER UPDATE ON public.properties
  FOR EACH ROW
  WHEN (
    NEW.status = 'available' AND
    (OLD.status IS DISTINCT FROM NEW.status OR
     OLD.price IS DISTINCT FROM NEW.price OR
     OLD.city IS DISTINCT FROM NEW.city)
  )
  EXECUTE FUNCTION public.trigger_property_alerts();

-- RLS Policies pour la file d'attente
ALTER TABLE public.property_alert_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on property_alert_queue"
  ON public.property_alert_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Créer une fonction pour traiter la file d'attente (appelée par un cron job ou worker)
CREATE OR REPLACE FUNCTION public.process_property_alert_queue(batch_size INT DEFAULT 50)
RETURNS TABLE(
  queue_id uuid,
  property_id uuid,
  success boolean,
  message TEXT
) AS $$
DECLARE
  queue_record RECORD;
  api_url TEXT;
  api_key TEXT;
BEGIN
  -- Récupérer les enregistrements à traiter
  FOR queue_record IN
    SELECT id, property_id
    FROM public.property_alert_queue
    WHERE processed = false
    ORDER BY created_at ASC
    LIMIT batch_size
  LOOP
    -- Marquer comme en cours de traitement
    UPDATE public.property_alert_queue
    SET processed = true, processed_at = NOW()
    WHERE id = queue_record.id;

    -- Ici vous appelleriez votre edge function
    -- Pour l'instant, on retourne un indicateur de succès
    RETURN QUERY SELECT
      queue_record.id,
      queue_record.property_id,
      true,
      'Processed'::TEXT;
  END LOOP;
  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.process_property_alert_queue(batch_size INT) IS
  'Processes the property alert queue. Can be called by a cron job or background worker.';
