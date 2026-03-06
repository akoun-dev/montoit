-- Migration: Create email_templates table
-- Description: Email template configurations
-- Order: Sixty-fifth table (references profiles)

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text NOT NULL,
  variables text[] DEFAULT '{}'::text[],
  category email_template_category DEFAULT 'custom'::email_template_category,
  created_by uuid,
  active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  preview_data jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}'::text[],
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_templates_pkey PRIMARY KEY (id),
  CONSTRAINT email_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON public.email_templates(name);
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON public.email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON public.email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates(active);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON public.email_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_tags ON public.email_templates USING GIN(tags);

-- Comments
COMMENT ON TABLE public.email_templates IS 'Email template configurations';

-- RLS Policies
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.email_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Everyone can view active templates
CREATE POLICY "Everyone can view active templates" ON public.email_templates
  FOR SELECT
  TO authenticated
  USING (active = true);

-- Admins can manage all templates
CREATE POLICY "Admins can manage templates" ON public.email_templates
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
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
