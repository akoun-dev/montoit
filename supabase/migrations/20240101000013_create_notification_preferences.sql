-- Migration: Create notification_preferences table
-- Description: User notification preferences
-- Order: Thirteenth table (references profiles)

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  push_notifications boolean DEFAULT true,
  in_app_notifications boolean DEFAULT true,
  payment_notifications boolean DEFAULT true,
  application_notifications boolean DEFAULT true,
  message_notifications boolean DEFAULT true,
  lease_notifications boolean DEFAULT true,
  marketing_notifications boolean DEFAULT false,
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time without time zone DEFAULT '22:00:00'::time without time zone,
  quiet_hours_end time without time zone DEFAULT '08:00:00'::time without time zone,
  timezone text DEFAULT 'Africa/Abidjan'::text,
  digest_mode boolean DEFAULT false,
  digest_frequency text DEFAULT 'daily'::text,
  email_address text,
  phone_number text,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- Comments
COMMENT ON TABLE public.notification_preferences IS 'User notification preferences';
COMMENT ON COLUMN public.notification_preferences.digest_frequency IS 'Digest frequency: instant, daily, weekly';

-- RLS Policies
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.notification_preferences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences" ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences" ON public.notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences" ON public.notification_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
