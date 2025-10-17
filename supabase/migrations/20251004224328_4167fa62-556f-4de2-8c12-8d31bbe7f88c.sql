-- Phase 4: Table Properties pour Mon Toit

CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  property_type TEXT NOT NULL CHECK (property_type IN ('appartement', 'villa', 'studio', 'duplex', 'bureau', 'local_commercial')),
  status TEXT NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'loue', 'en_attente', 'retire')),
  
  -- Location
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Caractéristiques
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  surface_area DECIMAL(10, 2),
  floor_number INTEGER,
  has_parking BOOLEAN DEFAULT false,
  has_garden BOOLEAN DEFAULT false,
  is_furnished BOOLEAN DEFAULT false,
  has_ac BOOLEAN DEFAULT false,
  
  -- Prix
  monthly_rent DECIMAL(12, 2) NOT NULL,
  deposit_amount DECIMAL(12, 2),
  charges_amount DECIMAL(12, 2),
  
  -- Images (array of URLs)
  images TEXT[],
  main_image TEXT,
  
  -- Metadata
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_properties_owner ON public.properties(owner_id);
CREATE INDEX idx_properties_city ON public.properties(city);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_type ON public.properties(property_type);
CREATE INDEX idx_properties_rent ON public.properties(monthly_rent);
CREATE INDEX idx_properties_location ON public.properties(latitude, longitude);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Propriétés publiquement visibles"
  ON public.properties FOR SELECT
  USING (true);

CREATE POLICY "Propriétaires peuvent créer leurs biens"
  ON public.properties FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Propriétaires peuvent mettre à jour leurs biens"
  ON public.properties FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Propriétaires peuvent supprimer leurs biens"
  ON public.properties FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Trigger pour updated_at
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();