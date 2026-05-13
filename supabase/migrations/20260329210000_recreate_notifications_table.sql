-- Migration: Recreate notifications table with correct structure
-- Description: Recreate notifications table after it was dropped

-- Drop the existing notifications table if it exists
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Create notifications table with all required columns
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_code TEXT NOT NULL,
  channels TEXT[] NOT NULL DEFAULT '{}',
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  read_channels TEXT[] NOT NULL DEFAULT '{}',
  -- Legacy columns for backward compatibility
  type notification_type,
  title TEXT,
  message TEXT,
  sent_via_email BOOLEAN DEFAULT false,
  sent_via_sms BOOLEAN DEFAULT false,
  sent_via_push BOOLEAN DEFAULT false,
  sent_via_in_app BOOLEAN DEFAULT true,
  action_url TEXT,
  action_text TEXT,
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  delivery_attempts INTEGER DEFAULT 0,
  last_delivery_attempt_at TIMESTAMPTZ,
  delivery_error TEXT,
  category TEXT,
  expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_template_code ON public.notifications(template_code);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_read_channels ON public.notifications USING GIN(read_channels);
CREATE INDEX idx_notifications_channels ON public.notifications USING GIN(channels);

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Authenticated users can update their own notifications
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Authenticated users can insert notifications (for system-generated notifications)
CREATE POLICY "Users can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.notifications IS 'Notifications envoyées aux utilisateurs';
