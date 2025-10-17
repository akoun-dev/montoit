-- Create certification_status enum type
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

CREATE POLICY "Lease parties can view certification history"
ON public.lease_certification_history FOR SELECT
USING (lease_id IN (SELECT id FROM public.leases WHERE landlord_id = auth.uid() OR tenant_id = auth.uid()));

CREATE POLICY "Admins can insert certification history"
ON public.lease_certification_history FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Pre-certification validation function
CREATE OR REPLACE FUNCTION public.pre_validate_lease_for_certification(p_lease_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lease RECORD;
  v_landlord_verified BOOLEAN;
  v_tenant_verified BOOLEAN;
  v_result JSONB;
  v_checks JSONB := '[]'::jsonb;
BEGIN
  SELECT * INTO v_lease FROM public.leases WHERE id = p_lease_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bail non trouvé'; END IF;
  
  v_checks := v_checks || jsonb_build_object(
    'check_name', 'signatures', 'label', 'Signatures des deux parties',
    'passed', v_lease.landlord_signed_at IS NOT NULL AND v_lease.tenant_signed_at IS NOT NULL,
    'message', CASE 
      WHEN v_lease.landlord_signed_at IS NULL AND v_lease.tenant_signed_at IS NULL THEN 'Aucune signature'
      WHEN v_lease.landlord_signed_at IS NULL THEN 'Signature propriétaire manquante'
      WHEN v_lease.tenant_signed_at IS NULL THEN 'Signature locataire manquante'
      ELSE 'Signé par les deux parties' END
  );
  
  SELECT oneci_verified INTO v_landlord_verified FROM public.profiles WHERE id = v_lease.landlord_id;
  v_checks := v_checks || jsonb_build_object(
    'check_name', 'landlord_verified', 'label', 'Identité propriétaire vérifiée (ONECI)',
    'passed', COALESCE(v_landlord_verified, false),
    'message', CASE WHEN COALESCE(v_landlord_verified, false) THEN 'Propriétaire vérifié ONECI' ELSE 'Propriétaire non vérifié' END
  );
  
  SELECT oneci_verified INTO v_tenant_verified FROM public.profiles WHERE id = v_lease.tenant_id;
  v_checks := v_checks || jsonb_build_object(
    'check_name', 'tenant_verified', 'label', 'Identité locataire vérifiée (ONECI)',
    'passed', COALESCE(v_tenant_verified, false),
    'message', CASE WHEN COALESCE(v_tenant_verified, false) THEN 'Locataire vérifié ONECI' ELSE 'Locataire non vérifié' END
  );
  
  v_checks := v_checks || jsonb_build_object(
    'check_name', 'document', 'label', 'Document PDF généré',
    'passed', v_lease.document_url IS NOT NULL,
    'message', CASE WHEN v_lease.document_url IS NOT NULL THEN 'Document PDF disponible' ELSE 'Document PDF non généré' END
  );
  
  v_checks := v_checks || jsonb_build_object(
    'check_name', 'dates', 'label', 'Dates valides',
    'passed', v_lease.end_date > v_lease.start_date,
    'message', CASE WHEN v_lease.end_date > v_lease.start_date THEN 'Dates cohérentes' ELSE 'Date de fin doit être après date de début' END
  );
  
  v_checks := v_checks || jsonb_build_object(
    'check_name', 'amounts', 'label', 'Montants valides',
    'passed', v_lease.monthly_rent > 0 AND COALESCE(v_lease.deposit_amount, 0) >= 0,
    'message', CASE WHEN v_lease.monthly_rent > 0 THEN 'Montants cohérents' ELSE 'Loyer doit être supérieur à 0' END
  );
  
  v_result := jsonb_build_object(
    'lease_id', p_lease_id, 'checks', v_checks,
    'all_passed', NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_checks) AS chk WHERE (chk->>'passed')::boolean = false),
    'validated_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- Insert default Ivory Coast lease template
INSERT INTO public.lease_templates (name, description, template_type, is_default, is_active, variables, content)
VALUES (
  'Bail résidentiel standard - Côte d''Ivoire',
  'Modèle de bail conforme à la législation ivoirienne pour locations résidentielles',
  'residential', true, true,
  jsonb_build_array(
    jsonb_build_object('name', 'landlord_name', 'label', 'Nom du propriétaire', 'required', true),
    jsonb_build_object('name', 'landlord_cni', 'label', 'CNI propriétaire', 'required', true),
    jsonb_build_object('name', 'tenant_name', 'label', 'Nom du locataire', 'required', true),
    jsonb_build_object('name', 'tenant_cni', 'label', 'CNI locataire', 'required', true),
    jsonb_build_object('name', 'property_address', 'label', 'Adresse du bien', 'required', true),
    jsonb_build_object('name', 'monthly_rent', 'label', 'Loyer mensuel', 'required', true),
    jsonb_build_object('name', 'deposit_amount', 'label', 'Caution', 'required', true),
    jsonb_build_object('name', 'start_date', 'label', 'Date de début', 'required', true),
    jsonb_build_object('name', 'end_date', 'label', 'Date de fin', 'required', true)
  ),
  jsonb_build_object(
    'title', 'CONTRAT DE BAIL D''HABITATION',
    'sections', jsonb_build_array(
      jsonb_build_object('title', 'ENTRE LES SOUSSIGNÉS', 'content', 'D''une part,\n{{landlord_name}}, titulaire de la CNI n° {{landlord_cni}}, ci-après dénommé « le Bailleur »\n\nEt d''autre part,\n{{tenant_name}}, titulaire de la CNI n° {{tenant_cni}}, ci-après dénommé « le Preneur »'),
      jsonb_build_object('title', 'Article 1 - OBJET', 'content', 'Le Bailleur donne à bail au Preneur qui accepte, un logement à usage d''habitation situé :\n{{property_address}}'),
      jsonb_build_object('title', 'Article 2 - DURÉE', 'content', 'Le présent bail est consenti pour une durée déterminée à compter du {{start_date}} et prenant fin le {{end_date}}.'),
      jsonb_build_object('title', 'Article 3 - LOYER', 'content', 'Le loyer mensuel est fixé à {{monthly_rent}} FCFA, payable le premier jour de chaque mois.'),
      jsonb_build_object('title', 'Article 4 - DÉPÔT DE GARANTIE', 'content', 'Un dépôt de garantie de {{deposit_amount}} FCFA est versé par le Preneur au Bailleur à la signature du présent contrat.'),
      jsonb_build_object('title', 'Article 5 - OBLIGATIONS DU PRENEUR', 'content', 'Le Preneur s''engage à :\n- Payer le loyer aux échéances convenues\n- Maintenir les lieux en bon état d''entretien\n- Ne pas sous-louer sans l''accord du Bailleur\n- Souscrire une assurance habitation'),
      jsonb_build_object('title', 'Article 6 - OBLIGATIONS DU BAILLEUR', 'content', 'Le Bailleur s''engage à :\n- Délivrer le logement en bon état\n- Assurer la jouissance paisible des lieux\n- Effectuer les grosses réparations'),
      jsonb_build_object('title', 'Article 7 - RÉSILIATION', 'content', 'Chaque partie pourra résilier le bail moyennant un préavis de trois mois notifié par lettre recommandée.')
    )
  )
) ON CONFLICT DO NOTHING;