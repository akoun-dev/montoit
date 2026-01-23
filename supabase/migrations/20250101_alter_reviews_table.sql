-- Met à jour la table reviews existante pour correspondre à la nouvelle structure

-- Create reviews table first if it doesn't exist
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid references public.profiles(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  contract_id uuid references public.lease_contracts(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  type text check (type in ('tenant_to_owner', 'owner_to_tenant')),
  communication integer check (communication between 1 and 5),
  cleanliness integer check (cleanliness between 1 and 5),
  respect_of_property integer check (respect_of_property between 1 and 5),
  payment_punctuality integer check (payment_punctuality between 1 and 5),
  is_visible boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ajouter les colonnes manquantes si elles n'existent pas (for safety, on sait elles existent maintenant)
do $$
begin
  -- Already created above with all columns, no need to add
  null;
end
$$;

-- Créer les index s'ils n'existent pas
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews(reviewee_id) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_reviews_contract ON public.reviews(contract_id);
CREATE INDEX IF NOT EXISTS idx_reviews_type ON public.reviews(type) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating) WHERE is_visible = true;

-- Ajouter les colonnes de statistiques dans profiles si elles n'existent pas
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Mettre à jour les RLS policies si nécessaires
alter table public.reviews enable row level security;

DROP POLICY IF EXISTS "Users can view visible reviews" ON public.reviews;
CREATE POLICY "Users can view visible reviews"
ON public.reviews
FOR SELECT
USING (is_visible = true);

COMMENT ON TABLE public.reviews IS 'Avis après location entre locataires et propriétaires';
