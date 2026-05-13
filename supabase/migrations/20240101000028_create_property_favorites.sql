-- Migration: Create property_favorites table
-- Description: Property favorites with notes
-- Order: Twenty-eighth table (references profiles, properties)

CREATE TABLE IF NOT EXISTS public.property_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL,
  notes text,
  priority integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT property_favorites_pkey PRIMARY KEY (id),
  CONSTRAINT property_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT property_favorites_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_favorites_user_id ON public.property_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_property_favorites_property_id ON public.property_favorites(property_id);
CREATE INDEX IF NOT EXISTS idx_property_favorites_user_property ON public.property_favorites(user_id, property_id);
CREATE INDEX IF NOT EXISTS idx_property_favorites_priority ON public.property_favorites(priority);

-- Comments
COMMENT ON TABLE public.property_favorites IS 'Property favorites with notes and priority';

-- RLS Policies
ALTER TABLE public.property_favorites ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.property_favorites
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own favorites
CREATE POLICY "Users can view own property favorites" ON public.property_favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert favorites
CREATE POLICY "Users can insert property favorites" ON public.property_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own favorites
CREATE POLICY "Users can update own property favorites" ON public.property_favorites
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own favorites
CREATE POLICY "Users can delete own property favorites" ON public.property_favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_property_favorites_updated_at
  BEFORE UPDATE ON public.property_favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
