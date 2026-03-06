-- Migration: Create agency_agents table
-- Description: Agents working for agencies
-- Order: Twenty-second table (references agencies, profiles)

CREATE TABLE IF NOT EXISTS public.agency_agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  user_id uuid,
  email text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'agent'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  commission_split numeric DEFAULT 0,
  target_monthly numeric DEFAULT 0,
  specialties text[],
  bio text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agency_agents_pkey PRIMARY KEY (id),
  CONSTRAINT agency_agents_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE,
  CONSTRAINT agency_agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agency_agents_agency_id ON public.agency_agents(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_agents_user_id ON public.agency_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_agents_email ON public.agency_agents(email);
CREATE INDEX IF NOT EXISTS idx_agency_agents_status ON public.agency_agents(status);
CREATE INDEX IF NOT EXISTS idx_agency_agents_role ON public.agency_agents(role);

-- Comments
COMMENT ON TABLE public.agency_agents IS 'Agents working for agencies';
COMMENT ON COLUMN public.agency_agents.status IS 'Status: pending, active, inactive, suspended';

-- RLS Policies
ALTER TABLE public.agency_agents ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.agency_agents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Agency users can view their agents
CREATE POLICY "Agency users can view own agents" ON public.agency_agents
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE id = auth.uid()
    )
  );

-- Agents can view their own record
CREATE POLICY "Agents can view own record" ON public.agency_agents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Agency users can insert agents
CREATE POLICY "Agency users can insert agents" ON public.agency_agents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies WHERE id = auth.uid()
    )
  );

-- Agency users can update agents
CREATE POLICY "Agency users can update agents" ON public.agency_agents
  FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies WHERE id = auth.uid()
    )
  );

-- Updated at trigger
CREATE TRIGGER update_agency_agents_updated_at
  BEFORE UPDATE ON public.agency_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
