-- Migration: Create test_data_templates table
-- Description: Test data generation templates
-- Order: One hundred sixth table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.test_data_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_type text NOT NULL,
  description text,
  generation_rules jsonb,
  ai_prompt text,
  active boolean DEFAULT true,
  payload jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT test_data_templates_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_data_templates_name ON public.test_data_templates(name);
CREATE INDEX IF NOT EXISTS idx_test_data_templates_template_type ON public.test_data_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_test_data_templates_active ON public.test_data_templates(active);

-- Comments
COMMENT ON TABLE public.test_data_templates IS 'Test data generation templates';

-- RLS Policies
ALTER TABLE public.test_data_templates ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.test_data_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No other access - test data templates are for development/testing

-- Updated at trigger
CREATE TRIGGER update_test_data_templates_updated_at
  BEFORE UPDATE ON public.test_data_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
