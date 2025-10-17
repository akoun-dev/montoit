-- ÉPIC 10: Table pour les rappels utilisateurs
CREATE TABLE IF NOT EXISTS public.user_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reminder_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_active BOOLEAN DEFAULT true,
  frequency TEXT DEFAULT 'daily',
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour user_reminders
CREATE POLICY "Users can view their own reminders"
  ON public.user_reminders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders"
  ON public.user_reminders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
  ON public.user_reminders
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
  ON public.user_reminders
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage all reminders"
  ON public.user_reminders
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ÉPIC 11: Table pour les litiges
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES public.leases(id),
  reporter_id UUID REFERENCES auth.users(id) NOT NULL,
  reported_id UUID REFERENCES auth.users(id) NOT NULL,
  dispute_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  resolution_notes TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  priority TEXT DEFAULT 'medium',
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour disputes
CREATE POLICY "Users can view disputes they're involved in"
  ON public.disputes
  FOR SELECT
  USING (auth.uid() = reporter_id OR auth.uid() = reported_id OR auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  ));

CREATE POLICY "Users can create disputes"
  ON public.disputes
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can update disputes"
  ON public.disputes
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  ));

-- ÉPIC 11: Mise à jour table reviews pour modération
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS moderation_notes TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users(id);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

-- Trigger pour mettre à jour updated_at sur user_reminders
CREATE OR REPLACE FUNCTION public.update_updated_at_user_reminders()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_reminders_updated_at
  BEFORE UPDATE ON public.user_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_user_reminders();

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_user_reminders_user_id ON public.user_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reminders_is_active ON public.user_reminders(is_active);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_reporter_id ON public.disputes(reporter_id);
CREATE INDEX IF NOT EXISTS idx_disputes_reported_id ON public.disputes(reported_id);
CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status ON public.reviews(moderation_status);