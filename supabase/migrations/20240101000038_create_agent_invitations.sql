-- Migration: Create agent_invitations table
-- Description: Agent invitations from agencies
-- Order: Thirty-eighth table (references agencies, profiles)

CREATE TABLE IF NOT EXISTS public.agent_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  email text NOT NULL,
  token text NOT NULL DEFAULT upper(md5(((random())::text || (clock_timestamp())::text))) UNIQUE,
  role text DEFAULT 'agent'::text,
  status text DEFAULT 'pending'::text,
  invited_by uuid,
  commission_split numeric DEFAULT 50,
  target_monthly numeric DEFAULT 0,
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  first_name text,
  last_name text,
  phone text,
  bio text,
  CONSTRAINT agent_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT agent_invitations_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE,
  CONSTRAINT agent_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_invitations_agency_id ON public.agent_invitations(agency_id);
CREATE INDEX IF NOT EXISTS idx_agent_invitations_email ON public.agent_invitations(email);
CREATE INDEX IF NOT EXISTS idx_agent_invitations_token ON public.agent_invitations(token);
CREATE INDEX IF NOT EXISTS idx_agent_invitations_status ON public.agent_invitations(status);
CREATE INDEX IF NOT EXISTS idx_agent_invitations_expires_at ON public.agent_invitations(expires_at);

-- Comments
COMMENT ON TABLE public.agent_invitations IS 'Agent invitations from agencies';
COMMENT ON COLUMN public.agent_invitations.status IS 'Status: pending, accepted, expired, cancelled';

-- RLS Policies
ALTER TABLE public.agent_invitations ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.agent_invitations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Agency users can view their invitations
CREATE POLICY "Agency users can view own invitations" ON public.agent_invitations
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE id = auth.uid()
    )
  );

-- Agency users can insert invitations
CREATE POLICY "Agency users can insert invitations" ON public.agent_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies WHERE id = auth.uid()
    )
  );

-- Agency users can update invitations
CREATE POLICY "Agency users can update invitations" ON public.agent_invitations
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
