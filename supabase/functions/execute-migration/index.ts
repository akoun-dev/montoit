import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getServiceRoleClient } from '../_shared/service-role.ts';

Deno.serve(async (req: Request) => {
  const supabase = getServiceRoleClient();

  const sql = `
    -- Mettre à jour la table reviews
    ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.lease_contracts(id) ON DELETE CASCADE;
    ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reviewee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('tenant_to_owner', 'owner_to_tenant'));
    ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS communication INTEGER CHECK (communication BETWEEN 1 AND 5);
    ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS cleanliness INTEGER CHECK (cleanliness BETWEEN 1 AND 5);
    ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS respect_of_property INTEGER CHECK (respect_of_property BETWEEN 1 AND 5);
    ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS payment_punctuality INTEGER CHECK (payment_punctuality BETWEEN 1 AND 5);
    ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

    -- Créer les index
    CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews(reviewee_id) WHERE is_visible = true;
    CREATE INDEX IF NOT EXISTS idx_reviews_contract ON public.reviews(contract_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_type ON public.reviews(type) WHERE is_visible = true;
    CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating) WHERE is_visible = true;

    -- Ajouter les colonnes de statistiques dans profiles
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
  `;

  const { data, error } = await supabase.rpc('exec', { sql });

  if (error) {
    return new Response(JSON.stringify({ error: error.message, details: error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, result: data }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
