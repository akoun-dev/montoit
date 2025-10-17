-- Créer la table des documents de bail
CREATE TABLE IF NOT EXISTS public.lease_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'lease_contract', -- Contrat de bail
    'inventory_in', -- État des lieux d'entrée
    'inventory_out', -- État des lieux de sortie
    'rent_receipt', -- Quittance de loyer
    'deposit_receipt', -- Reçu de dépôt de garantie
    'insurance', -- Attestation d'assurance
    'identity_document', -- Pièce d'identité
    'income_proof', -- Justificatif de revenus
    'employment_contract', -- Contrat de travail
    'other' -- Autre
  )),
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lease_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Documents visibles par les parties du bail
CREATE POLICY "Lease parties can view documents"
  ON public.lease_documents FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM public.leases
      WHERE landlord_id = auth.uid() OR tenant_id = auth.uid()
    )
  );

-- RLS Policies - Les parties peuvent uploader des documents
CREATE POLICY "Lease parties can upload documents"
  ON public.lease_documents FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by AND
    lease_id IN (
      SELECT id FROM public.leases
      WHERE landlord_id = auth.uid() OR tenant_id = auth.uid()
    )
  );

-- RLS Policies - L'uploader peut mettre à jour ses documents
CREATE POLICY "Uploaders can update their documents"
  ON public.lease_documents FOR UPDATE
  USING (auth.uid() = uploaded_by);

-- RLS Policies - L'uploader peut supprimer ses documents
CREATE POLICY "Uploaders can delete their documents"
  ON public.lease_documents FOR DELETE
  USING (auth.uid() = uploaded_by);

-- Créer la table des modèles de documents
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL,
  template_content JSONB NOT NULL, -- Contenu du template en JSON
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS pour document_templates (lecture publique pour les utilisateurs authentifiés)
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates"
  ON public.document_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Trigger pour updated_at
CREATE TRIGGER update_lease_documents_updated_at
  BEFORE UPDATE ON public.lease_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_lease_documents_lease ON public.lease_documents(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_documents_type ON public.lease_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_lease_documents_uploader ON public.lease_documents(uploaded_by);

-- Insérer des templates par défaut
INSERT INTO public.document_templates (name, description, document_type, template_content) VALUES
(
  'Quittance de loyer standard',
  'Modèle de quittance de loyer conforme',
  'rent_receipt',
  '{
    "fields": [
      {"name": "landlord_name", "label": "Nom du bailleur", "type": "text"},
      {"name": "tenant_name", "label": "Nom du locataire", "type": "text"},
      {"name": "property_address", "label": "Adresse du bien", "type": "text"},
      {"name": "period", "label": "Période", "type": "text"},
      {"name": "rent_amount", "label": "Montant du loyer", "type": "number"},
      {"name": "charges_amount", "label": "Montant des charges", "type": "number"},
      {"name": "total_amount", "label": "Montant total", "type": "number"},
      {"name": "payment_date", "label": "Date de paiement", "type": "date"}
    ]
  }'::jsonb
),
(
  'État des lieux d''entrée',
  'Modèle d''état des lieux pour l''entrée dans le logement',
  'inventory_in',
  '{
    "fields": [
      {"name": "date", "label": "Date", "type": "date"},
      {"name": "landlord_name", "label": "Nom du bailleur", "type": "text"},
      {"name": "tenant_name", "label": "Nom du locataire", "type": "text"},
      {"name": "property_address", "label": "Adresse", "type": "text"},
      {"name": "rooms", "label": "État des pièces", "type": "array"}
    ]
  }'::jsonb
);