-- Migration: Create property_alerts table
-- Description: Property search alerts for users
-- Order: Twenty-ninth table (references profiles)

CREATE TABLE IF NOT EXISTS public.property_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  city text,
  neighborhood text,
  property_type text,
  min_bedrooms integer,
  max_bedrooms integer,
  min_price numeric,
  max_price numeric,
  is_active boolean DEFAULT true,
  last_notified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT property_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT property_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_alerts_user_id ON public.property_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_property_alerts_city ON public.property_alerts(city);
CREATE INDEX IF NOT EXISTS idx_property_alerts_is_active ON public.property_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_property_alerts_property_type ON public.property_alerts(property_type);

-- Comments
COMMENT ON TABLE public.property_alerts IS 'Property search alerts for users';

-- RLS Policies
ALTER TABLE public.property_alerts ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.property_alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own alerts
CREATE POLICY "Users can view own property alerts" ON public.property_alerts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert alerts
CREATE POLICY "Users can insert property alerts" ON public.property_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own alerts
CREATE POLICY "Users can update own property alerts" ON public.property_alerts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own alerts
CREATE POLICY "Users can delete own property alerts" ON public.property_alerts
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_property_alerts_updated_at
  BEFORE UPDATE ON public.property_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
