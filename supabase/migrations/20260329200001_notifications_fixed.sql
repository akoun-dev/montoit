-- Migration: Update notifications table structure
-- Description: Modify existing notifications table to support template-based system

-- Since the table already exists, we need to modify it rather than create it

DO $$
BEGIN
  -- Drop the existing notifications table and recreate with correct structure
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

END $$;

-- Indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_template_code ON public.notifications(template_code);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_read_channels ON public.notifications USING GIN(read_channels);
CREATE INDEX idx_notifications_channels ON public.notifications USING GIN(channels);

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT TO service_role WITH CHECK (true);

-- Table pour les préférences de notification
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  categories JSONB NOT NULL DEFAULT '{
    "verification_result": true,
    "document_request": true,
    "approval_needed": true,
    "payment": true,
    "contract": true,
    "message": true,
    "system": true,
    "profile": true
  }',
  quiet_hours JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table pour la file d'attente des notifications
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Index pour la file d'attente
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_notification_id ON notification_queue(notification_id);

-- Commentaires
COMMENT ON TABLE public.notifications IS 'Notifications envoyées aux utilisateurs';
COMMENT ON TABLE notification_preferences IS 'Préférences de notification des utilisateurs';
COMMENT ON TABLE notification_queue IS 'File d''attente pour l''envoi des notifications';
