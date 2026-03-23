-- Table pour stocker les notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_code TEXT NOT NULL,
  channels TEXT[] NOT NULL DEFAULT '{}',
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  read_channels TEXT[] NOT NULL DEFAULT '{}'
);

-- Index pour optimiser les recherches
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'notifications'
        AND column_name = 'status'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
    END IF;
  END;
  $$;
  CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'notifications'
        AND column_name = 'scheduled_for'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;
    END IF;
  END;
  $$;

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
COMMENT ON TABLE notifications IS 'Notifications envoyées aux utilisateurs';
COMMENT ON TABLE notification_preferences IS 'Préférences de notification des utilisateurs';
COMMENT ON TABLE notification_queue IS 'File d''attente pour l''envoi des notifications';
