-- Migration: Create suta_knowledge_base table
-- Description: SUTA chatbot knowledge base
-- Order: Ninetieth table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.suta_knowledge_base (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL,
  keywords text[],
  priority integer,
  usage_count integer,
  positive_feedback_count integer,
  negative_feedback_count integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT suta_knowledge_base_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suta_knowledge_base_question ON public.suta_knowledge_base(question);
CREATE INDEX IF NOT EXISTS idx_suta_knowledge_base_category ON public.suta_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_suta_knowledge_base_is_active ON public.suta_knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_suta_knowledge_base_keywords ON public.suta_knowledge_base USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_suta_knowledge_base_priority ON public.suta_knowledge_base(priority);

-- Comments
COMMENT ON TABLE public.suta_knowledge_base IS 'SUTA chatbot knowledge base';

-- RLS Policies
ALTER TABLE public.suta_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.suta_knowledge_base
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Everyone can view active knowledge base entries
CREATE POLICY "Everyone can view active knowledge" ON public.suta_knowledge_base
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Admins can manage knowledge base
CREATE POLICY "Admins can manage knowledge base" ON public.suta_knowledge_base
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
CREATE TRIGGER update_suta_knowledge_base_updated_at
  BEFORE UPDATE ON public.suta_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
