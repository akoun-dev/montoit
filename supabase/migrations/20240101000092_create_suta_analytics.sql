-- Migration: Create suta_analytics table
-- Description: SUTA chatbot usage analytics
-- Order: Ninety-second table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.suta_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date,
  topic text,
  category text,
  question_count integer,
  positive_feedback integer,
  negative_feedback integer,
  avg_response_time_ms integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT suta_analytics_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suta_analytics_date ON public.suta_analytics(date);
CREATE INDEX IF NOT EXISTS idx_suta_analytics_topic ON public.suta_analytics(topic);
CREATE INDEX IF NOT EXISTS idx_suta_analytics_category ON public.suta_analytics(category);

-- Comments
COMMENT ON TABLE public.suta_analytics IS 'SUTA chatbot usage analytics';

-- RLS Policies
ALTER TABLE public.suta_analytics ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.suta_analytics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view analytics
CREATE POLICY "Admins can view analytics" ON public.suta_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'::user_type
      
    )
  );
