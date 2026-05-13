-- Migration: Create hero_slides table
-- Description: Homepage hero slider content
-- Order: One hundred fourth table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.hero_slides (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT hero_slides_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hero_slides_display_order ON public.hero_slides(display_order);
CREATE INDEX IF NOT EXISTS idx_hero_slides_is_active ON public.hero_slides(is_active);

-- Comments
COMMENT ON TABLE public.hero_slides IS 'Homepage hero slider content';

-- RLS Policies
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.hero_slides
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Everyone can view active slides
CREATE POLICY "Everyone can view active slides" ON public.hero_slides
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Admins can manage slides
CREATE POLICY "Admins can manage slides" ON public.hero_slides
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

-- Updated at trigger
CREATE TRIGGER update_hero_slides_updated_at
  BEFORE UPDATE ON public.hero_slides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
