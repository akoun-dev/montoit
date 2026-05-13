-- Migration: Create user_reminders table
-- Description: User reminders
-- Order: Forty-ninth table (references profiles)

CREATE TABLE IF NOT EXISTS public.user_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reminder_type text NOT NULL,
  title text,
  message text,
  link text,
  is_active boolean DEFAULT true,
  last_sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_reminders_pkey PRIMARY KEY (id),
  CONSTRAINT user_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_reminders_user_id ON public.user_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reminders_reminder_type ON public.user_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_user_reminders_is_active ON public.user_reminders(is_active);
CREATE INDEX IF NOT EXISTS idx_user_reminders_last_sent_at ON public.user_reminders(last_sent_at);

-- Comments
COMMENT ON TABLE public.user_reminders IS 'User reminders';

-- RLS Policies
ALTER TABLE public.user_reminders ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.user_reminders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own reminders
CREATE POLICY "Users can view own reminders" ON public.user_reminders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own reminders
CREATE POLICY "Users can insert own reminders" ON public.user_reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own reminders
CREATE POLICY "Users can update own reminders" ON public.user_reminders
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own reminders
CREATE POLICY "Users can delete own reminders" ON public.user_reminders
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
