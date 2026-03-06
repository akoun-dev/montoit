-- Migration: Create favorites table
-- Description: User favorite properties (legacy)
-- Order: Twenty-sixth table (references profiles, properties)

CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT favorites_pkey PRIMARY KEY (id),
  CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT favorites_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property_id ON public.favorites(property_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_property ON public.favorites(user_id, property_id);

-- Comments
COMMENT ON TABLE public.favorites IS 'User favorite properties (legacy table)';

-- RLS Policies
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.favorites
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites" ON public.favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert favorites
CREATE POLICY "Users can insert favorites" ON public.favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own favorites
CREATE POLICY "Users can delete own favorites" ON public.favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
