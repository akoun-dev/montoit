-- Migration: Create visit_requests table
-- Description: Visit requests from tenants to properties
-- Order: Eighteenth table (references properties, profiles)

CREATE TABLE IF NOT EXISTS public.visit_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  agent_id uuid,
  preferred_dates jsonb DEFAULT '[]'::jsonb,
  visit_date date,
  visit_time text,
  confirmed_date timestamp with time zone,
  duration_minutes integer DEFAULT 30,
  visit_type visit_type DEFAULT 'in_person'::visit_type,
  contact_phone text,
  contact_email text,
  emergency_contact jsonb DEFAULT '{}'::jsonb,
  status visit_request_status DEFAULT 'pending'::visit_request_status,
  rejection_reason text,
  meeting_point text,
  access_instructions text,
  property_access_code text,
  parking_info text,
  tenant_attended boolean DEFAULT false,
  owner_attended boolean DEFAULT false,
  visit_successful boolean,
  tenant_rating integer,
  owner_rating integer,
  tenant_feedback text,
  owner_feedback text,
  follow_up_required boolean DEFAULT false,
  follow_up_notes text,
  additional_attendees jsonb DEFAULT '[]'::jsonb,
  reminder_sent boolean DEFAULT false,
  last_reminder_at timestamp with time zone,
  confirmation_sent boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  confirmed_at timestamp with time zone,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  CONSTRAINT visit_requests_pkey PRIMARY KEY (id),
  CONSTRAINT visit_requests_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT visit_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT visit_requests_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT visit_requests_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_visit_requests_property_id ON public.visit_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_tenant_id ON public.visit_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_owner_id ON public.visit_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_agent_id ON public.visit_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_status ON public.visit_requests(status);
CREATE INDEX IF NOT EXISTS idx_visit_requests_visit_date ON public.visit_requests(visit_date);
CREATE INDEX IF NOT EXISTS idx_visit_requests_visit_type ON public.visit_requests(visit_type);

-- Comments
COMMENT ON TABLE public.visit_requests IS 'Visit requests from tenants to properties';
COMMENT ON COLUMN public.visit_requests.visit_type IS 'Type: in_person, video_call, virtual';
COMMENT ON COLUMN public.visit_requests.status IS 'Status: pending, confirmed, rejected, cancelled, completed';

-- RLS Policies
ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.visit_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tenants can view their own visit requests
CREATE POLICY "Tenants can view own visit requests" ON public.visit_requests
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth.uid());

-- Property owners can view visit requests for their properties
CREATE POLICY "Owners can view property visit requests" ON public.visit_requests
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Agents can view their assigned visit requests
CREATE POLICY "Agents can view assigned visit requests" ON public.visit_requests
  FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

-- Tenants can insert visit requests
CREATE POLICY "Tenants can insert visit requests" ON public.visit_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth.uid());

-- Owners can update visit requests for their properties
CREATE POLICY "Owners can update property visit requests" ON public.visit_requests
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_visit_requests_updated_at
  BEFORE UPDATE ON public.visit_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
