-- Create certification_status enum type if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certification_status') THEN
    CREATE TYPE certification_status AS ENUM ('not_requested', 'pending', 'in_review', 'certified', 'rejected');
  END IF;
END $$;

-- Create lease certification history table
CREATE TABLE IF NOT EXISTS public.lease_certification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lease_certification_history ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lease_certification_history' AND policyname = 'Lease parties can view certification history'
  ) THEN
    CREATE POLICY "Lease parties can view certification history" ON public.lease_certification_history FOR SELECT
    USING (lease_id IN (SELECT id FROM public.leases WHERE landlord_id = auth.uid() OR tenant_id = auth.uid()));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lease_certification_history' AND policyname = 'Admins can insert certification history'
  ) THEN
    CREATE POLICY "Admins can insert certification history" ON public.lease_certification_history FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Pre-certification validation function
CREATE OR REPLACE FUNCTION public.pre_validate_lease_for_certification(p_lease_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lease RECORD; v_landlord_verified BOOLEAN; v_tenant_verified BOOLEAN;
  v_result JSONB; v_checks JSONB := '[]'::jsonb;
BEGIN
  SELECT * INTO v_lease FROM public.leases WHERE id = p_lease_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bail non trouvé'; END IF;
  
  v_checks := v_checks || jsonb_build_object('check_name', 'signatures', 'label', 'Signatures des deux parties',
    'passed', v_lease.landlord_signed_at IS NOT NULL AND v_lease.tenant_signed_at IS NOT NULL,
    'message', CASE WHEN v_lease.landlord_signed_at IS NULL AND v_lease.tenant_signed_at IS NULL THEN 'Aucune signature'
      WHEN v_lease.landlord_signed_at IS NULL THEN 'Signature propriétaire manquante'
      WHEN v_lease.tenant_signed_at IS NULL THEN 'Signature locataire manquante' ELSE 'Signé par les deux parties' END);
  
  SELECT oneci_verified INTO v_landlord_verified FROM public.profiles WHERE id = v_lease.landlord_id;
  v_checks := v_checks || jsonb_build_object('check_name', 'landlord_verified', 'label', 'Identité propriétaire vérifiée',
    'passed', COALESCE(v_landlord_verified, false),
    'message', CASE WHEN COALESCE(v_landlord_verified, false) THEN 'Propriétaire vérifié' ELSE 'Propriétaire non vérifié' END);
  
  SELECT oneci_verified INTO v_tenant_verified FROM public.profiles WHERE id = v_lease.tenant_id;
  v_checks := v_checks || jsonb_build_object('check_name', 'tenant_verified', 'label', 'Identité locataire vérifiée',
    'passed', COALESCE(v_tenant_verified, false),
    'message', CASE WHEN COALESCE(v_tenant_verified, false) THEN 'Locataire vérifié' ELSE 'Locataire non vérifié' END);
  
  v_checks := v_checks || jsonb_build_object('check_name', 'document', 'label', 'Document PDF généré',
    'passed', v_lease.document_url IS NOT NULL,
    'message', CASE WHEN v_lease.document_url IS NOT NULL THEN 'Document PDF disponible' ELSE 'Document PDF non généré' END);
  
  v_checks := v_checks || jsonb_build_object('check_name', 'dates', 'label', 'Dates valides',
    'passed', v_lease.end_date > v_lease.start_date,
    'message', CASE WHEN v_lease.end_date > v_lease.start_date THEN 'Dates cohérentes' ELSE 'Dates invalides' END);
  
  v_checks := v_checks || jsonb_build_object('check_name', 'amounts', 'label', 'Montants valides',
    'passed', v_lease.monthly_rent > 0 AND COALESCE(v_lease.deposit_amount, 0) >= 0,
    'message', CASE WHEN v_lease.monthly_rent > 0 THEN 'Montants cohérents' ELSE 'Montants invalides' END);
  
  v_result := jsonb_build_object('lease_id', p_lease_id, 'checks', v_checks,
    'all_passed', NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_checks) AS chk WHERE (chk->>'passed')::boolean = false),
    'validated_at', now());
  RETURN v_result;
END; $$;

-- Insert default template
INSERT INTO public.lease_templates (name, description, template_type, is_default, is_active, variables, content)
SELECT 'Bail résidentiel standard - Côte d''Ivoire', 'Modèle de bail conforme à la législation ivoirienne', 'residential', true, true,
  jsonb_build_array(
    jsonb_build_object('name', 'landlord_name', 'label', 'Nom du propriétaire', 'required', true),
    jsonb_build_object('name', 'tenant_name', 'label', 'Nom du locataire', 'required', true),
    jsonb_build_object('name', 'property_address', 'label', 'Adresse du bien', 'required', true),
    jsonb_build_object('name', 'monthly_rent', 'label', 'Loyer mensuel', 'required', true),
    jsonb_build_object('name', 'deposit_amount', 'label', 'Caution', 'required', true),
    jsonb_build_object('name', 'start_date', 'label', 'Date de début', 'required', true),
    jsonb_build_object('name', 'end_date', 'label', 'Date de fin', 'required', true)
  ),
  jsonb_build_object('title', 'CONTRAT DE BAIL D''HABITATION',
    'sections', jsonb_build_array(
      jsonb_build_object('title', 'Article 1 - OBJET', 'content', 'Le Bailleur donne à bail au Preneur un logement situé :\n{{property_address}}'),
      jsonb_build_object('title', 'Article 2 - DURÉE', 'content', 'Bail du {{start_date}} au {{end_date}}.'),
      jsonb_build_object('title', 'Article 3 - LOYER', 'content', 'Loyer mensuel : {{monthly_rent}} FCFA.'),
      jsonb_build_object('title', 'Article 4 - CAUTION', 'content', 'Dépôt de garantie : {{deposit_amount}} FCFA.')
    )
  )
WHERE NOT EXISTS (SELECT 1 FROM public.lease_templates WHERE name = 'Bail résidentiel standard - Côte d''Ivoire');