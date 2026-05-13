-- Migration: Create monartisan_contractors table
-- Description: MonArtisan contractor profiles
-- Order: Ninety-ninth table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.monartisan_contractors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  specialty text,
  rating numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT monartisan_contractors_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_monartisan_contractors_name ON public.monartisan_contractors(name);
CREATE INDEX IF NOT EXISTS idx_monartisan_contractors_specialty ON public.monartisan_contractors(specialty);
CREATE INDEX IF NOT EXISTS idx_monartisan_contractors_rating ON public.monartisan_contractors(rating);

-- Comments
COMMENT ON TABLE public.monartisan_contractors IS 'MonArtisan contractor profiles';

-- RLS Policies
ALTER TABLE public.monartisan_contractors ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.monartisan_contractors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Everyone can view contractors
CREATE POLICY "Everyone can view contractors" ON public.monartisan_contractors
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage contractors
CREATE POLICY "Admins can manage contractors" ON public.monartisan_contractors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'::user_type
      
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'::user_type
      
    )
  );
