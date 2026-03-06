-- Migration: Create reminder_settings table
-- Description: Owner reminder preferences
-- Order: Seventy-fourth table (references auth.users)

CREATE TABLE IF NOT EXISTS public.reminder_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  rent_reminder_schedule integer[] NOT NULL DEFAULT '{-7,-3,0,3,7}'::integer[],
  default_channel text DEFAULT 'email'::text CHECK (default_channel = ANY (ARRAY['email'::text, 'sms'::text, 'both'::text])),
  reminders_enabled boolean DEFAULT true,
  renewal_reminders_enabled boolean DEFAULT true,
  renewal_reminder_days integer DEFAULT 30,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reminder_settings_pkey PRIMARY KEY (id),
  CONSTRAINT reminder_settings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reminder_settings_owner_id ON public.reminder_settings(owner_id);

-- Comments
COMMENT ON TABLE public.reminder_settings IS 'Owner reminder preferences';
COMMENT ON COLUMN public.reminder_settings.rent_reminder_schedule IS 'Days before/after rent due date to send reminders';

-- RLS Policies
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.reminder_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Owners can view their own settings
CREATE POLICY "Owners can view own settings" ON public.reminder_settings
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Owners can insert their own settings
CREATE POLICY "Owners can insert own settings" ON public.reminder_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their own settings
CREATE POLICY "Owners can update own settings" ON public.reminder_settings
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_reminder_settings_updated_at
  BEFORE UPDATE ON public.reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
