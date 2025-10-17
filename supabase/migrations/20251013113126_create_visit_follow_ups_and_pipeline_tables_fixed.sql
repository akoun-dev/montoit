/*
  # Create Visit Follow-ups and Pipeline Tables - CRM Automation

  1. New Tables
    - `visit_follow_ups`: Automated follow-up tasks
    - `visit_pipeline_stages`: CRM pipeline stage definitions
    - `visit_pipeline_movements`: Historical tracking of stage changes

  2. Follow-ups Features
    - Scheduled follow-up tasks for agents
    - Multiple contact methods (phone, email, WhatsApp, SMS)
    - Task status tracking and completion
    - Automatic reminders

  3. Pipeline Features
    - 8-stage Kanban pipeline
    - Drag-and-drop stage transitions
    - Automatic stage progression
    - Historical movement tracking

  4. Security
    - RLS enabled on all tables
    - Agents see their own tasks/prospects
    - Owners see their property prospects
*/

-- ========================================
-- TABLE 1: visit_follow_ups
-- ========================================
CREATE TABLE IF NOT EXISTS public.visit_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  annotation_id uuid UNIQUE REFERENCES public.visit_agent_annotations(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES auth.users(id),
  visitor_id uuid NOT NULL REFERENCES auth.users(id),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  
  -- Task details
  scheduled_date date NOT NULL,
  contact_method text NOT NULL CHECK (contact_method IN ('phone', 'email', 'whatsapp', 'sms')),
  task_type text NOT NULL CHECK (task_type IN ('urgent_follow_up', 'standard_follow_up', 'long_term_follow_up', 'document_request')),
  task_subject text NOT NULL,
  task_notes text,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled', 'overdue')),
  completed_at timestamptz,
  completed_notes text,
  
  -- Reminders
  reminder_sent boolean DEFAULT false,
  reminder_sent_at timestamptz,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for follow_ups
CREATE INDEX IF NOT EXISTS idx_follow_ups_agent ON public.visit_follow_ups(agent_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_visitor ON public.visit_follow_ups(visitor_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_property ON public.visit_follow_ups(property_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON public.visit_follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_date ON public.visit_follow_ups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_pending ON public.visit_follow_ups(status, scheduled_date) WHERE status IN ('pending', 'scheduled');

-- Enable RLS
ALTER TABLE public.visit_follow_ups ENABLE ROW LEVEL SECURITY;

-- Policies for follow_ups
CREATE POLICY "Agents can view own follow-ups"
  ON public.visit_follow_ups FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Property owners can view property follow-ups"
  ON public.visit_follow_ups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = visit_follow_ups.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Agents can create follow-ups"
  ON public.visit_follow_ups FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own follow-ups"
  ON public.visit_follow_ups FOR UPDATE
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- ========================================
-- TABLE 2: visit_pipeline_stages
-- ========================================
CREATE TABLE IF NOT EXISTS public.visit_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stage details
  stage_name text NOT NULL UNIQUE,
  stage_key text NOT NULL UNIQUE,
  stage_order integer NOT NULL UNIQUE,
  stage_color text NOT NULL,
  stage_description text,
  
  -- Stage configuration
  is_active boolean DEFAULT true,
  auto_progress_to uuid REFERENCES public.visit_pipeline_stages(id) ON DELETE SET NULL,
  auto_progress_condition text,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default pipeline stages
INSERT INTO public.visit_pipeline_stages (stage_name, stage_key, stage_order, stage_color, stage_description) VALUES
  ('Nouveau Lead', 'new_lead', 1, '#94a3b8', 'Demande de visite reçue mais pas encore qualifiée'),
  ('Lead Qualifié', 'qualified_lead', 2, '#3b82f6', 'Lead qualifié avec score de priorité élevé'),
  ('Visite Planifiée', 'visit_scheduled', 3, '#8b5cf6', 'Créneau de visite confirmé et payé'),
  ('Visite Effectuée', 'visit_completed', 4, '#06b6d4', 'Visite terminée, annotations complétées'),
  ('Candidature', 'application', 5, '#f59e0b', 'Dossier de candidature soumis'),
  ('Négociation', 'negotiation', 6, '#ec4899', 'En négociation des termes du bail'),
  ('Gagné', 'won', 7, '#10b981', 'Bail signé avec succès'),
  ('Perdu', 'lost', 8, '#ef4444', 'Opportunité perdue ou abandonnée')
ON CONFLICT (stage_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.visit_pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view stages
CREATE POLICY "Everyone can view pipeline stages"
  ON public.visit_pipeline_stages FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ========================================
-- TABLE 3: visit_pipeline_movements
-- ========================================
CREATE TABLE IF NOT EXISTS public.visit_pipeline_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  visitor_id uuid NOT NULL REFERENCES auth.users(id),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  request_id uuid REFERENCES public.property_visit_requests(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.property_visit_bookings(id) ON DELETE SET NULL,
  
  -- Current stage
  current_stage_id uuid NOT NULL REFERENCES public.visit_pipeline_stages(id),
  previous_stage_id uuid REFERENCES public.visit_pipeline_stages(id),
  
  -- Movement details
  moved_by uuid REFERENCES auth.users(id),
  movement_type text NOT NULL CHECK (movement_type IN ('automatic', 'manual')),
  movement_reason text,
  
  -- Prospect metadata
  lead_temperature text CHECK (lead_temperature IN ('hot', 'warm', 'cold')),
  conversion_probability integer CHECK (conversion_probability >= 0 AND conversion_probability <= 100),
  total_interactions integer DEFAULT 0,
  last_interaction_at timestamptz,
  
  -- Audit
  created_at timestamptz DEFAULT now()
);

-- Indexes for pipeline_movements
CREATE INDEX IF NOT EXISTS idx_pipeline_visitor ON public.visit_pipeline_movements(visitor_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_property ON public.visit_pipeline_movements(property_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON public.visit_pipeline_movements(current_stage_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_temperature ON public.visit_pipeline_movements(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_pipeline_created ON public.visit_pipeline_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_visitor_property ON public.visit_pipeline_movements(visitor_id, property_id);

-- Enable RLS
ALTER TABLE public.visit_pipeline_movements ENABLE ROW LEVEL SECURITY;

-- Policies for pipeline_movements
CREATE POLICY "Agents can view relevant movements"
  ON public.visit_pipeline_movements FOR SELECT
  TO authenticated
  USING (
    moved_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = visit_pipeline_movements.property_id
      AND properties.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.agency_mandates
      WHERE agency_mandates.property_id = visit_pipeline_movements.property_id
      AND agency_mandates.agency_id = auth.uid()
      AND agency_mandates.status = 'active'
    )
  );

CREATE POLICY "Agents can create movements"
  ON public.visit_pipeline_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    moved_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Function: Auto-update updated_at for follow_ups
CREATE OR REPLACE FUNCTION update_follow_ups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_follow_ups_updated_at ON public.visit_follow_ups;
CREATE TRIGGER trigger_update_follow_ups_updated_at
  BEFORE UPDATE ON public.visit_follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_ups_updated_at();

-- Function: Mark overdue follow-ups
CREATE OR REPLACE FUNCTION mark_overdue_follow_ups()
RETURNS void AS $$
BEGIN
  UPDATE public.visit_follow_ups
  SET status = 'overdue'
  WHERE status IN ('pending', 'scheduled')
    AND scheduled_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function: Get current pipeline stage for visitor/property
CREATE OR REPLACE FUNCTION get_current_pipeline_stage(p_visitor_id uuid, p_property_id uuid)
RETURNS uuid AS $$
DECLARE
  v_stage_id uuid;
BEGIN
  SELECT current_stage_id INTO v_stage_id
  FROM public.visit_pipeline_movements
  WHERE visitor_id = p_visitor_id
    AND property_id = p_property_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN v_stage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-create pipeline movement on request creation
CREATE OR REPLACE FUNCTION create_pipeline_movement_on_request()
RETURNS TRIGGER AS $$
DECLARE
  v_stage_id uuid;
  v_existing_stage uuid;
BEGIN
  -- Get "new_lead" stage id
  SELECT id INTO v_stage_id
  FROM public.visit_pipeline_stages
  WHERE stage_key = 'new_lead';
  
  -- Check if movement already exists
  v_existing_stage := get_current_pipeline_stage(NEW.requester_id, NEW.property_id);
  
  -- Only create if no existing movement
  IF v_existing_stage IS NULL THEN
    INSERT INTO public.visit_pipeline_movements (
      visitor_id,
      property_id,
      request_id,
      current_stage_id,
      movement_type,
      movement_reason,
      lead_temperature,
      conversion_probability
    ) VALUES (
      NEW.requester_id,
      NEW.property_id,
      NEW.id,
      v_stage_id,
      'automatic',
      'Nouvelle demande de visite créée',
      CASE 
        WHEN NEW.priority_score >= 80 THEN 'hot'
        WHEN NEW.priority_score >= 50 THEN 'warm'
        ELSE 'cold'
      END,
      NEW.priority_score
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_pipeline_on_request ON public.property_visit_requests;
CREATE TRIGGER trigger_create_pipeline_on_request
  AFTER INSERT ON public.property_visit_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_pipeline_movement_on_request();

-- Function: Progress pipeline on booking completion
CREATE OR REPLACE FUNCTION progress_pipeline_on_visit_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_stage_id uuid;
  v_current_stage uuid;
BEGIN
  -- Only when visit is completed
  IF NEW.visit_status = 'completed' AND OLD.visit_status != 'completed' THEN
    -- Get "visit_completed" stage
    SELECT id INTO v_stage_id
    FROM public.visit_pipeline_stages
    WHERE stage_key = 'visit_completed';
    
    -- Get current stage
    v_current_stage := get_current_pipeline_stage(NEW.visitor_id, NEW.property_id);
    
    -- Create new movement to "visit_completed" stage if different
    IF v_current_stage IS NULL OR v_current_stage != v_stage_id THEN
      INSERT INTO public.visit_pipeline_movements (
        visitor_id,
        property_id,
        booking_id,
        current_stage_id,
        previous_stage_id,
        movement_type,
        movement_reason,
        lead_temperature,
        conversion_probability
      ) VALUES (
        NEW.visitor_id,
        NEW.property_id,
        NEW.id,
        v_stage_id,
        v_current_stage,
        'automatic',
        'Visite effectuée avec succès',
        'warm',
        60
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_progress_pipeline_on_completion ON public.property_visit_bookings;
CREATE TRIGGER trigger_progress_pipeline_on_completion
  AFTER UPDATE ON public.property_visit_bookings
  FOR EACH ROW
  EXECUTE FUNCTION progress_pipeline_on_visit_completion();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_overdue_follow_ups TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_pipeline_stage TO authenticated;