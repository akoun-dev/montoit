-- Migration: Create saved_searches table
-- Description: User saved property searches
-- Order: Twenty-fifth table (references profiles)

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  search_criteria jsonb NOT NULL,
  alert_enabled boolean DEFAULT true,
  alert_frequency text DEFAULT 'immediate'::text,
  last_alert_sent_at timestamp with time zone,
  last_search_run_at timestamp with time zone,
  total_matches integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_public boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT saved_searches_pkey PRIMARY KEY (id),
  CONSTRAINT saved_searches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_is_active ON public.saved_searches(is_active);
CREATE INDEX IF NOT EXISTS idx_saved_searches_is_public ON public.saved_searches(is_public);
CREATE INDEX IF NOT EXISTS idx_saved_searches_alert_enabled ON public.saved_searches(alert_enabled);
CREATE INDEX IF NOT EXISTS idx_saved_searches_tags ON public.saved_searches USING GIN(tags);

-- Comments
COMMENT ON TABLE public.saved_searches IS 'User saved property searches';
COMMENT ON COLUMN public.saved_searches.alert_frequency IS 'Frequency: immediate, daily, weekly';

-- RLS Policies
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.saved_searches
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own saved searches
CREATE POLICY "Users can view own saved searches" ON public.saved_searches
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_public = true);

-- Users can insert saved searches
CREATE POLICY "Users can insert saved searches" ON public.saved_searches
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own saved searches
CREATE POLICY "Users can update own saved searches" ON public.saved_searches
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own saved searches
CREATE POLICY "Users can delete own saved searches" ON public.saved_searches
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
