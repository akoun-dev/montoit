-- Migration: Create business_rules table
-- Description: Business rule configurations
-- Order: Fifty-second table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.business_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rule_key text NOT NULL,
  rule_name text NOT NULL,
  rule_type text NOT NULL,
  category text NOT NULL,
  description text,
  value_boolean boolean,
  value_json jsonb,
  value_number numeric,
  min_value numeric,
  max_value numeric,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_rules_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_rules_rule_key ON public.business_rules(rule_key);
CREATE INDEX IF NOT EXISTS idx_business_rules_rule_type ON public.business_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_business_rules_category ON public.business_rules(category);
CREATE INDEX IF NOT EXISTS idx_business_rules_is_enabled ON public.business_rules(is_enabled);

-- Comments
COMMENT ON TABLE public.business_rules IS 'Business rule configurations';

-- RLS Policies
ALTER TABLE public.business_rules ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.business_rules
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Everyone can view enabled rules
CREATE POLICY "Everyone can view enabled rules" ON public.business_rules
  FOR SELECT
  TO authenticated
  USING (is_enabled = true);

-- Admins can view all rules
CREATE POLICY "Admins can view all rules" ON public.business_rules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'::user_type
      
    )
  );

-- Admins can manage rules
CREATE POLICY "Admins can manage rules" ON public.business_rules
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
CREATE TRIGGER update_business_rules_updated_at
  BEFORE UPDATE ON public.business_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
