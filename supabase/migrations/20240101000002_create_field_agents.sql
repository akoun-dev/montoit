-- Migration: Create field_agents table
-- Description: Field agents for property verification
-- Order: Second table (references only auth.users)

CREATE TABLE IF NOT EXISTS public.field_agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  address text,
  city text,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text])),
  missions_count integer DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT field_agents_pkey PRIMARY KEY (id),
  CONSTRAINT field_agents_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_field_agents_email ON public.field_agents(email);
CREATE INDEX IF NOT EXISTS idx_field_agents_status ON public.field_agents(status);
CREATE INDEX IF NOT EXISTS idx_field_agents_city ON public.field_agents(city);
CREATE INDEX IF NOT EXISTS idx_field_agents_created_by ON public.field_agents(created_by);

-- Comments
COMMENT ON TABLE public.field_agents IS 'Field agents for property verification and CEV missions';
COMMENT ON COLUMN public.field_agents.status IS 'Agent status: active, inactive';
COMMENT ON COLUMN public.field_agents.missions_count IS 'Number of completed missions';

-- RLS Policies
ALTER TABLE public.field_agents ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.field_agents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins and trust agents can view field agents (based on user_type in profiles)
CREATE POLICY "Admins and trust agents can view field agents" ON public.field_agents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
    )
  );

-- Admins and trust agents can insert field agents
CREATE POLICY "Admins and trust agents can insert field agents" ON public.field_agents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
    )
  );

-- Admins and trust agents can update field agents
CREATE POLICY "Admins and trust agents can update field agents" ON public.field_agents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
    )
  );

-- Updated at trigger
CREATE TRIGGER update_field_agents_updated_at
  BEFORE UPDATE ON public.field_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
