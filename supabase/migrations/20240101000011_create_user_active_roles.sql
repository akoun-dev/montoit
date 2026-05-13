-- Migration: Create user_active_roles table
-- Description: User active role tracking for role switching
-- Order: Eleventh table (references profiles)

CREATE TABLE IF NOT EXISTS public.user_active_roles (
  user_id uuid NOT NULL,
  active_role text NOT NULL,
  available_roles text[] NOT NULL DEFAULT '{}'::text[],
  last_switch_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_active_roles_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_active_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_active_roles_active_role ON public.user_active_roles(active_role);

-- Comments
COMMENT ON TABLE public.user_active_roles IS 'User active role tracking for role switching';
COMMENT ON COLUMN public.user_active_roles.active_role IS 'Currently active role';
COMMENT ON COLUMN public.user_active_roles.available_roles IS 'List of available roles for the user';

-- RLS Policies
ALTER TABLE public.user_active_roles ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.user_active_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own active roles
CREATE POLICY "Users can view own active roles" ON public.user_active_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own active roles
CREATE POLICY "Users can update own active roles" ON public.user_active_roles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role can insert
CREATE POLICY "Service role can insert" ON public.user_active_roles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Updated at trigger
CREATE TRIGGER update_user_active_roles_updated_at
  BEFORE UPDATE ON public.user_active_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
