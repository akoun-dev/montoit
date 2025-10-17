-- Fonction pour vérifier accès maintenance
CREATE OR REPLACE FUNCTION public.can_access_maintenance(p_property_id uuid)
RETURNS boolean 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- L'utilisateur doit avoir :
  -- 1. Un dossier approuvé pour ce bien OU
  -- 2. Un bail actif pour ce bien
  
  RETURN EXISTS (
    SELECT 1 FROM public.rental_applications
    WHERE applicant_id = auth.uid()
      AND property_id = p_property_id
      AND status = 'approved'
  ) OR EXISTS (
    SELECT 1 FROM public.leases
    WHERE tenant_id = auth.uid()
      AND property_id = p_property_id
      AND status = 'active'
  );
END;
$$;

COMMENT ON FUNCTION public.can_access_maintenance(uuid) IS 
'Vérifie si un utilisateur peut accéder aux demandes de maintenance pour un bien';

-- Table pour les demandes de maintenance
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('plumbing', 'electrical', 'heating', 'other')),
  title text NOT NULL,
  description text NOT NULL,
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'emergency')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  images jsonb DEFAULT '[]'::jsonb,
  assigned_to uuid,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_maintenance_property ON public.maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requester ON public.maintenance_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_requests(status);

-- RLS policies
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Locataire peut créer ses demandes
CREATE POLICY "Locataires peuvent créer demandes maintenance"
  ON public.maintenance_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id 
    AND public.can_access_maintenance(property_id)
  );

-- Locataire voit ses demandes
CREATE POLICY "Locataires voient leurs demandes"
  ON public.maintenance_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = requester_id
    OR property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Propriétaire peut mettre à jour statut
CREATE POLICY "Propriétaires mettent à jour demandes"
  ON public.maintenance_requests
  FOR UPDATE
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Trigger pour updated_at
CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();