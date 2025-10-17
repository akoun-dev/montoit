-- Create lease_templates table
CREATE TABLE IF NOT EXISTS public.lease_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'residential',
  content JSONB NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lease_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all templates"
ON public.lease_templates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active templates"
ON public.lease_templates
FOR SELECT
TO authenticated
USING (is_active = true);

-- Index for performance
CREATE INDEX idx_lease_templates_active ON public.lease_templates(is_active);
CREATE INDEX idx_lease_templates_type ON public.lease_templates(template_type);
CREATE INDEX idx_lease_templates_default ON public.lease_templates(is_default);

-- Trigger for updated_at
CREATE TRIGGER update_lease_templates_updated_at
BEFORE UPDATE ON public.lease_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default residential template
INSERT INTO public.lease_templates (
  name,
  description,
  template_type,
  is_default,
  is_active,
  variables,
  content
) VALUES (
  'Bail résidentiel standard ANSUT',
  'Modèle de bail résidentiel conforme aux normes ANSUT',
  'residential',
  true,
  true,
  '["landlord_name", "landlord_address", "landlord_phone", "tenant_name", "tenant_address", "tenant_phone", "property_address", "property_type", "bedrooms", "bathrooms", "surface_area", "monthly_rent", "deposit_amount", "charges_amount", "start_date", "end_date", "lease_duration"]'::jsonb,
  '{
    "sections": [
      {
        "title": "PARTIES AU CONTRAT",
        "content": "Entre les soussignés :\n\nLE BAILLEUR :\nNom : {{landlord_name}}\nAdresse : {{landlord_address}}\nTéléphone : {{landlord_phone}}\n\nET\n\nLE LOCATAIRE :\nNom : {{tenant_name}}\nAdresse : {{tenant_address}}\nTéléphone : {{tenant_phone}}"
      },
      {
        "title": "OBJET DU BAIL",
        "content": "Le bailleur loue au locataire qui accepte les lieux désignés ci-après :\n\nAdresse : {{property_address}}\nType : {{property_type}}\nSuperficie : {{surface_area}} m²\nNombre de chambres : {{bedrooms}}\nNombre de salles de bain : {{bathrooms}}"
      },
      {
        "title": "DURÉE DU BAIL",
        "content": "Le présent bail est conclu pour une durée de {{lease_duration}}.\n\nDate de début : {{start_date}}\nDate de fin : {{end_date}}\n\nÀ l''expiration de cette période, le bail sera renouvelable par tacite reconduction sauf préavis de l''une des parties."
      },
      {
        "title": "LOYER ET CHARGES",
        "content": "Le loyer mensuel est fixé à {{monthly_rent}} FCFA, payable le premier jour de chaque mois.\n\nCharges mensuelles : {{charges_amount}} FCFA\nDépôt de garantie : {{deposit_amount}} FCFA\n\nLe dépôt de garantie sera restitué au locataire dans un délai de 30 jours après la fin du bail, déduction faite des éventuelles réparations locatives."
      },
      {
        "title": "OBLIGATIONS DU LOCATAIRE",
        "content": "Le locataire s''engage à :\n- Payer le loyer aux échéances convenues\n- User paisiblement des lieux loués\n- Entretenir les lieux en bon état\n- Ne pas sous-louer sans l''accord écrit du bailleur\n- Respecter le règlement intérieur de l''immeuble\n- Souscrire une assurance habitation"
      },
      {
        "title": "OBLIGATIONS DU BAILLEUR",
        "content": "Le bailleur s''engage à :\n- Délivrer au locataire les lieux loués en bon état\n- Assurer la jouissance paisible des lieux\n- Effectuer les réparations nécessaires autres que locatives\n- Maintenir les équipements en bon état de fonctionnement"
      },
      {
        "title": "RÉSILIATION",
        "content": "Le présent bail pourra être résilié :\n- Par le locataire moyennant un préavis de 3 mois\n- Par le bailleur moyennant un préavis de 6 mois\n- En cas de manquement grave aux obligations contractuelles"
      },
      {
        "title": "CERTIFICATION ANSUT",
        "content": "Le présent bail a été certifié par l''Agence Nationale de Sécurisation des Transactions Urbaines (ANSUT) conformément à la réglementation en vigueur.\n\nCe document fait foi entre les parties et auprès des autorités compétentes."
      }
    ]
  }'::jsonb
);