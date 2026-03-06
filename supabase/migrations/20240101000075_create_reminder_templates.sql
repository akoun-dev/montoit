-- Migration: Create reminder_templates table
-- Description: Custom reminder templates for owners
-- Order: Seventy-fifth table (references auth.users)

CREATE TABLE IF NOT EXISTS public.reminder_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['rent_due'::text, 'rent_overdue'::text, 'lease_expiry'::text, 'lease_renewal'::text, 'custom'::text])),
  subject text,
  body text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reminder_templates_pkey PRIMARY KEY (id),
  CONSTRAINT reminder_templates_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reminder_templates_owner_id ON public.reminder_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_reminder_templates_type ON public.reminder_templates(type);
CREATE INDEX IF NOT EXISTS idx_reminder_templates_is_default ON public.reminder_templates(is_default);

-- Comments
COMMENT ON TABLE public.reminder_templates IS 'Custom reminder templates for owners';

-- RLS Policies
ALTER TABLE public.reminder_templates ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.reminder_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Owners can view their own templates
CREATE POLICY "Owners can view own templates" ON public.reminder_templates
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Owners can insert their own templates
CREATE POLICY "Owners can insert own templates" ON public.reminder_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their own templates
CREATE POLICY "Owners can update own templates" ON public.reminder_templates
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Owners can delete their own templates
CREATE POLICY "Owners can delete own templates" ON public.reminder_templates
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_reminder_templates_updated_at
  BEFORE UPDATE ON public.reminder_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
