-- Migration: Create rental_history table
-- Description: Tenant rental history records
-- Order: Forty-fifth table (references profiles)

CREATE TABLE IF NOT EXISTS public.rental_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  property_address text NOT NULL,
  city text NOT NULL,
  property_type text,
  monthly_rent numeric NOT NULL,
  start_date date NOT NULL,
  end_date date,
  departure_reason text,
  landlord_name text,
  landlord_email text,
  landlord_phone text,
  proof_documents jsonb,
  self_payment_rating integer,
  self_condition_rating integer,
  is_current boolean,
  verification_status text,
  verification_notes text,
  verified_at timestamp with time zone,
  verified_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rental_history_pkey PRIMARY KEY (id),
  CONSTRAINT rental_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rental_history_tenant_id ON public.rental_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rental_history_city ON public.rental_history(city);
CREATE INDEX IF NOT EXISTS idx_rental_history_start_date ON public.rental_history(start_date);
CREATE INDEX IF NOT EXISTS idx_rental_history_end_date ON public.rental_history(end_date);
CREATE INDEX IF NOT EXISTS idx_rental_history_is_current ON public.rental_history(is_current);
CREATE INDEX IF NOT EXISTS idx_rental_history_verification_status ON public.rental_history(verification_status);
CREATE INDEX IF NOT EXISTS idx_rental_history_verified_by ON public.rental_history(verified_by);

-- Comments
COMMENT ON TABLE public.rental_history IS 'Tenant rental history records';

-- RLS Policies
ALTER TABLE public.rental_history ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.rental_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own rental history
CREATE POLICY "Users can view own rental history" ON public.rental_history
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth.uid());

-- Trust agents and admins can view all rental history
CREATE POLICY "Trust agents can view rental history" ON public.rental_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Users can insert their own rental history
CREATE POLICY "Users can insert own rental history" ON public.rental_history
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth.uid());

-- Users can update their own rental history
CREATE POLICY "Users can update own rental history" ON public.rental_history
  FOR UPDATE
  TO authenticated
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- Trust agents can verify rental history
CREATE POLICY "Trust agents can verify rental history" ON public.rental_history
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Updated at trigger
CREATE TRIGGER update_rental_history_updated_at
  BEFORE UPDATE ON public.rental_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
