-- Migration: Create property_visits table
-- Description: Property visit appointments
-- Order: Seventeenth table (references properties, profiles)

CREATE TABLE IF NOT EXISTS public.property_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  agent_id uuid,
  visit_date timestamp with time zone NOT NULL,
  duration_minutes integer DEFAULT 30,
  status visit_status DEFAULT 'scheduled'::visit_status,
  contact_phone text,
  meeting_point text,
  special_instructions text,
  tenant_feedback integer,
  tenant_notes text,
  property_showback_notes text,
  calendar_event_id text,
  reminders_sent jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  confirmed_at timestamp with time zone,
  completed_at timestamp with time zone,
  CONSTRAINT property_visits_pkey PRIMARY KEY (id),
  CONSTRAINT property_visits_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT property_visits_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT property_visits_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_visits_property_id ON public.property_visits(property_id);
CREATE INDEX IF NOT EXISTS idx_property_visits_tenant_id ON public.property_visits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_visits_agent_id ON public.property_visits(agent_id);
CREATE INDEX IF NOT EXISTS idx_property_visits_status ON public.property_visits(status);
CREATE INDEX IF NOT EXISTS idx_property_visits_visit_date ON public.property_visits(visit_date);

-- Comments
COMMENT ON TABLE public.property_visits IS 'Property visit appointments';
COMMENT ON COLUMN public.property_visits.status IS 'Status: scheduled, confirmed, in_progress, completed, cancelled, no_show';

-- RLS Policies
ALTER TABLE public.property_visits ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.property_visits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tenants can view their own visits
CREATE POLICY "Tenants can view own visits" ON public.property_visits
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth.uid());

-- Property owners can view visits for their properties
CREATE POLICY "Owners can view property visits" ON public.property_visits
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Agents can view their assigned visits
CREATE POLICY "Agents can view assigned visits" ON public.property_visits
  FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

-- Tenants can insert visits
CREATE POLICY "Tenants can insert visits" ON public.property_visits
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_property_visits_updated_at
  BEFORE UPDATE ON public.property_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
