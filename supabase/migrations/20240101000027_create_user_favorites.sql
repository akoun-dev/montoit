-- Migration: Create user_favorites table
-- Description: User favorite properties (current)
-- Order: Twenty-seventh table (references profiles, properties)

CREATE TABLE IF NOT EXISTS public.user_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_favorites_pkey PRIMARY KEY (id),
  CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_favorites_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_property_id ON public.user_favorites(property_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_property ON public.user_favorites(user_id, property_id);

-- Comments
COMMENT ON TABLE public.user_favorites IS 'User favorite properties (current table)';

-- RLS Policies
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.user_favorites
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites" ON public.user_favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert favorites
CREATE POLICY "Users can insert favorites" ON public.user_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own favorites
CREATE POLICY "Users can delete own favorites" ON public.user_favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
