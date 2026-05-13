-- Migration: Create cev_missions table
-- Description: CEV (Contrôle d'État des Lieux) missions
-- Order: Fortieth table (references properties, field_agents)

CREATE TABLE IF NOT EXISTS public.cev_missions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  assigned_agent_id uuid NOT NULL,
  created_by uuid,
  mission_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  urgency text NOT NULL DEFAULT 'normal'::text,
  scheduled_date timestamp with time zone,
  completed_at timestamp with time zone,
  documents jsonb,
  photos jsonb,
  verification_checklist jsonb,
  etat_lieux_report jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cev_missions_pkey PRIMARY KEY (id),
  CONSTRAINT cev_missions_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL,
  CONSTRAINT cev_missions_assigned_agent_id_fkey FOREIGN KEY (assigned_agent_id) REFERENCES public.field_agents(id) ON DELETE RESTRICT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cev_missions_property_id ON public.cev_missions(property_id);
CREATE INDEX IF NOT EXISTS idx_cev_missions_assigned_agent_id ON public.cev_missions(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_cev_missions_status ON public.cev_missions(status);
CREATE INDEX IF NOT EXISTS idx_cev_missions_mission_type ON public.cev_missions(mission_type);
CREATE INDEX IF NOT EXISTS idx_cev_missions_urgency ON public.cev_missions(urgency);
CREATE INDEX IF NOT EXISTS idx_cev_missions_scheduled_date ON public.cev_missions(scheduled_date);

-- Comments
COMMENT ON TABLE public.cev_missions IS 'CEV (Contrôle d''État des Lieux) missions';
COMMENT ON COLUMN public.cev_missions.status IS 'Status: pending, in_progress, completed, cancelled';
COMMENT ON COLUMN public.cev_missions.urgency IS 'Urgency: low, normal, high, urgent';
COMMENT ON COLUMN public.cev_missions.mission_type IS 'Type: verification, inspection, etat_lieux, mediation';

-- RLS Policies
ALTER TABLE public.cev_missions ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.cev_missions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trust agents can view all missions
CREATE POLICY "Trust agents can view missions" ON public.cev_missions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Field agents can view their assigned missions
CREATE POLICY "Field agents can view assigned missions" ON public.cev_missions
  FOR SELECT
  TO authenticated
  USING (assigned_agent_id IN (
    SELECT id FROM public.field_agents WHERE email IN (
      SELECT email FROM public.profiles WHERE id = auth.uid()
    )
  ));

-- Property owners can view missions for their properties
CREATE POLICY "Owners can view property missions" ON public.cev_missions
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Updated at trigger
CREATE TRIGGER update_cev_missions_updated_at
  BEFORE UPDATE ON public.cev_missions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
