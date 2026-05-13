-- Migration: Create notifications table
-- Description: User notifications
-- Order: Twelfth table (references profiles)

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  sent_via_email boolean DEFAULT false,
  sent_via_sms boolean DEFAULT false,
  sent_via_push boolean DEFAULT false,
  sent_via_in_app boolean DEFAULT true,
  data jsonb DEFAULT '{}'::jsonb,
  action_url text,
  action_text text,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  is_archived boolean DEFAULT false,
  archived_at timestamp with time zone,
  delivery_attempts integer DEFAULT 0,
  last_delivery_attempt_at timestamp with time zone,
  delivery_error text,
  category text,
  priority text DEFAULT 'normal'::text,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_is_archived ON public.notifications(is_archived);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);

-- Comments
COMMENT ON TABLE public.notifications IS 'User notifications';
COMMENT ON COLUMN public.notifications.type IS 'Notification type: info, success, warning, error, rent_due, rent_overdue, lease_expiry, lease_renewal, application, message, visit, contract, payment, maintenance';

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notifications
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);
