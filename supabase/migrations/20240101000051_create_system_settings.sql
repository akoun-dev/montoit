-- Migration: Create system_settings table
-- Description: System-wide configuration settings
-- Order: Fifty-first table (references auth.users)

CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  category text DEFAULT 'general'::text,
  is_public boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid,
  CONSTRAINT system_settings_pkey PRIMARY KEY (id),
  CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_is_public ON public.system_settings(is_public);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON public.system_settings(updated_by);

-- Comments
COMMENT ON TABLE public.system_settings IS 'System-wide configuration settings';
COMMENT ON COLUMN public.system_settings.is_public IS 'Whether the setting is publicly accessible';

-- RLS Policies
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.system_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Everyone can view public settings
CREATE POLICY "Everyone can view public settings" ON public.system_settings
  FOR SELECT
  TO authenticated, anon
  USING (is_public = true);

-- Admins can view all settings
CREATE POLICY "Admins can view all settings" ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'::user_type
      
    )
  );

-- Admins can insert settings
CREATE POLICY "Admins can insert settings" ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'::user_type
      
    )
  );

-- Admins can update settings
CREATE POLICY "Admins can update settings" ON public.system_settings
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
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
