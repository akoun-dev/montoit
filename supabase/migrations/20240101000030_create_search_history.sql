-- Migration: Create search_history table
-- Description: User property search history
-- Order: Thirtieth table (references profiles)

CREATE TABLE IF NOT EXISTS public.search_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  search_filters jsonb,
  result_count integer,
  clicked_properties text[],
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT search_history_pkey PRIMARY KEY (id),
  CONSTRAINT search_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON public.search_history(created_at);

-- Comments
COMMENT ON TABLE public.search_history IS 'User property search history';

-- RLS Policies
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.search_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own search history
CREATE POLICY "Users can view own search history" ON public.search_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
