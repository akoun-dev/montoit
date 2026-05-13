-- Migration: Create reviews table
-- Description: User reviews (tenant, property, etc.)
-- Order: Twenty-first table (references profiles, properties)

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL,
  reviewee_id uuid,
  property_id uuid,
  rating integer NOT NULL,
  comment text,
  review_type text,
  is_visible boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  moderation_status text DEFAULT 'pending'::text CHECK (moderation_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'flagged'::text])),
  criteria_ratings jsonb DEFAULT '{"prop": 5}'::jsonb,
  response text,
  response_at timestamp with time zone,
  helpful_count integer DEFAULT 0,
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT reviews_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_property_id ON public.reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_review_type ON public.reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status ON public.reviews(moderation_status);
CREATE INDEX IF NOT EXISTS idx_reviews_is_visible ON public.reviews(is_visible);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at);

-- Comments
COMMENT ON TABLE public.reviews IS 'User reviews (tenant, property, etc.)';
COMMENT ON COLUMN public.reviews.moderation_status IS 'Status: pending, approved, rejected, flagged';

-- RLS Policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.reviews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Everyone can view approved reviews
CREATE POLICY "Everyone can view approved reviews" ON public.reviews
  FOR SELECT
  TO authenticated, anon
  USING (is_visible = true AND moderation_status = 'approved');

-- Users can view their own reviews
CREATE POLICY "Users can view own reviews" ON public.reviews
  FOR SELECT
  TO authenticated
  USING (reviewer_id = auth.uid());

-- Users can insert reviews
CREATE POLICY "Users can insert reviews" ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews" ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

-- Admins can update moderation status
CREATE POLICY "Admins can update reviews" ON public.reviews
  FOR UPDATE
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
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
