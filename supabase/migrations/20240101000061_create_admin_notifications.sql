-- Migration: Create admin_notifications table
-- Description: Admin notifications
-- Order: Sixty-first table (references profiles)

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text,
  data jsonb DEFAULT '{}'::jsonb,
  link text,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT admin_notifications_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin_id ON public.admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read_at ON public.admin_notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at);

-- Comments
COMMENT ON TABLE public.admin_notifications IS 'Admin notifications';

-- RLS Policies
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.admin_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view their own notifications
CREATE POLICY "Admins can view own notifications" ON public.admin_notifications
  FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'::user_type
      
    )
  );

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications" ON public.admin_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins can update their notifications
CREATE POLICY "Admins can update own notifications" ON public.admin_notifications
  FOR UPDATE
  TO authenticated
  USING (
    admin_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'::user_type
      
    )
  )
  WITH CHECK (
    admin_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'::user_type
      
    )
  );
