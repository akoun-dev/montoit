/*
  # Create Visit Agent Annotations Table - Professional CRM

  1. New Tables
    - `visit_agent_annotations`
      - `id` (uuid, primary key) - Unique identifier
      - `booking_id` (uuid, foreign key) - Visit booking being annotated
      - `agent_id` (uuid, foreign key) - Agent who made annotations
      - `property_id` (uuid, foreign key) - Property visited
      - `visitor_id` (uuid, foreign key) - Visitor who attended
      
      Section 1: Prospect Evaluation
      - `interest_level` (text) - very_high, high, medium, low, very_low
      - `seriousness_level` (text) - very_serious, serious, somewhat_serious, not_serious
      - `conversion_probability` (integer) - 0-100%
      - `is_hot_lead` (boolean) - Flag for hot leads
      
      Section 2: Behavioral Observations
      - `visit_behavior` (text) - Free text observations
      - `questions_asked` (text[]) - Array of question tags
      - `concerns_expressed` (text[]) - Array of concern tags
      - `property_feedback` (text) - Visitor's feedback on property
      
      Section 3: Additional Information
      - `desired_move_in_date` (date) - When they want to move in
      - `confirmed_budget` (numeric) - Budget confirmed during visit
      - `family_composition` (text) - Family details
      - `relocation_reason` (text) - Why relocating
      - `current_situation` (text) - Current living situation
      
      Section 4: Objections and Responses
      - `objections` (jsonb) - [{objection: "", response: "", resolved: boolean}]
      
      Section 5: Next Steps
      - `action_items` (text[]) - Array of action tags
      - `follow_up_date` (date) - When to follow up
      - `follow_up_method` (text) - phone, email, whatsapp, sms
      - `documents_to_request` (text[]) - Documents needed
      
      Section 6: Decision Status
      - `decision_status` (text) - awaiting, wants_to_apply, needs_time, declined, applied, signed
      - `decision_notes` (text) - Additional decision context
      
      Section 7: Private Notes
      - `private_notes` (text) - Confidential agent notes
      
      Section 8: Custom Tags
      - `custom_tags` (text[]) - Flexible categorization
      
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS
    - Only agents can create/view/update annotations
    - Property owners can view annotations for their properties
    - Admins can view all annotations

  3. Features
    - Auto-create follow-up tasks based on follow_up_date
    - Auto-update pipeline stage based on decision_status
    - Track annotation history changes
*/

-- Create visit_agent_annotations table
CREATE TABLE IF NOT EXISTS public.visit_agent_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  booking_id uuid NOT NULL REFERENCES public.property_visit_bookings(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES auth.users(id),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  visitor_id uuid NOT NULL REFERENCES auth.users(id),
  
  -- Section 1: Prospect Evaluation
  interest_level text CHECK (interest_level IN ('very_high', 'high', 'medium', 'low', 'very_low')),
  seriousness_level text CHECK (seriousness_level IN ('very_serious', 'serious', 'somewhat_serious', 'not_serious')),
  conversion_probability integer CHECK (conversion_probability >= 0 AND conversion_probability <= 100),
  is_hot_lead boolean DEFAULT false,
  
  -- Section 2: Behavioral Observations
  visit_behavior text,
  questions_asked text[],
  concerns_expressed text[],
  property_feedback text,
  
  -- Section 3: Additional Information
  desired_move_in_date date,
  confirmed_budget numeric(12,2),
  family_composition text,
  relocation_reason text,
  current_situation text,
  
  -- Section 4: Objections and Responses (structured JSON)
  objections jsonb DEFAULT '[]'::jsonb,
  
  -- Section 5: Next Steps
  action_items text[],
  follow_up_date date,
  follow_up_method text CHECK (follow_up_method IS NULL OR follow_up_method IN ('phone', 'email', 'whatsapp', 'sms')),
  documents_to_request text[],
  
  -- Section 6: Decision Status
  decision_status text DEFAULT 'awaiting' CHECK (decision_status IN ('awaiting', 'wants_to_apply', 'needs_time', 'declined', 'applied', 'signed')),
  decision_notes text,
  
  -- Section 7: Private Notes
  private_notes text,
  
  -- Section 8: Custom Tags
  custom_tags text[],
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Unique constraint: one annotation per booking
  UNIQUE(booking_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_annotations_booking ON public.visit_agent_annotations(booking_id);
CREATE INDEX IF NOT EXISTS idx_annotations_agent ON public.visit_agent_annotations(agent_id);
CREATE INDEX IF NOT EXISTS idx_annotations_property ON public.visit_agent_annotations(property_id);
CREATE INDEX IF NOT EXISTS idx_annotations_visitor ON public.visit_agent_annotations(visitor_id);
CREATE INDEX IF NOT EXISTS idx_annotations_hot_leads ON public.visit_agent_annotations(is_hot_lead) WHERE is_hot_lead = true;
CREATE INDEX IF NOT EXISTS idx_annotations_decision ON public.visit_agent_annotations(decision_status);
CREATE INDEX IF NOT EXISTS idx_annotations_follow_up ON public.visit_agent_annotations(follow_up_date) WHERE follow_up_date IS NOT NULL;

-- Enable RLS
ALTER TABLE public.visit_agent_annotations ENABLE ROW LEVEL SECURITY;

-- Policy: Agents can view their own annotations
CREATE POLICY "Agents can view own annotations"
  ON public.visit_agent_annotations FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

-- Policy: Property owners can view annotations for their properties
CREATE POLICY "Owners can view property annotations"
  ON public.visit_agent_annotations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = visit_agent_annotations.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Policy: Agencies can view annotations for mandate properties
CREATE POLICY "Agencies can view mandate annotations"
  ON public.visit_agent_annotations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_mandates
      WHERE agency_mandates.property_id = visit_agent_annotations.property_id
      AND agency_mandates.agency_id = auth.uid()
      AND agency_mandates.status = 'active'
      AND agency_mandates.end_date > now()
    )
  );

-- Policy: Admins can view all annotations
CREATE POLICY "Admins can view all annotations"
  ON public.visit_agent_annotations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Agents can create annotations for their visits
CREATE POLICY "Agents can create annotations"
  ON public.visit_agent_annotations FOR INSERT
  TO authenticated
  WITH CHECK (
    agent_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.property_visit_bookings b
      JOIN public.property_visit_slots s ON s.id = b.slot_id
      WHERE b.id = booking_id
      AND s.organizer_id = auth.uid()
      AND b.visit_status = 'completed'
    )
  );

-- Policy: Agents can update their own annotations
CREATE POLICY "Agents can update own annotations"
  ON public.visit_agent_annotations FOR UPDATE
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Function: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_annotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at on row update
DROP TRIGGER IF EXISTS trigger_update_annotations_updated_at ON public.visit_agent_annotations;
CREATE TRIGGER trigger_update_annotations_updated_at
  BEFORE UPDATE ON public.visit_agent_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_annotations_updated_at();

-- Function: Auto-create follow-up task when annotation is created/updated
CREATE OR REPLACE FUNCTION create_follow_up_from_annotation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create follow-up if follow_up_date is set
  IF NEW.follow_up_date IS NOT NULL THEN
    -- Insert or update follow-up task
    INSERT INTO public.visit_follow_ups (
      annotation_id,
      agent_id,
      visitor_id,
      property_id,
      scheduled_date,
      contact_method,
      task_type,
      task_subject,
      status
    ) VALUES (
      NEW.id,
      NEW.agent_id,
      NEW.visitor_id,
      NEW.property_id,
      NEW.follow_up_date,
      COALESCE(NEW.follow_up_method, 'email'),
      CASE 
        WHEN NEW.is_hot_lead THEN 'urgent_follow_up'
        ELSE 'standard_follow_up'
      END,
      CASE 
        WHEN NEW.is_hot_lead THEN 'Relance prioritaire après visite'
        ELSE 'Suite à votre visite'
      END,
      'pending'
    )
    ON CONFLICT (annotation_id) 
    DO UPDATE SET
      scheduled_date = EXCLUDED.scheduled_date,
      contact_method = EXCLUDED.contact_method,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Create follow-up on annotation insert/update
DROP TRIGGER IF EXISTS trigger_create_follow_up_from_annotation ON public.visit_agent_annotations;
CREATE TRIGGER trigger_create_follow_up_from_annotation
  AFTER INSERT OR UPDATE ON public.visit_agent_annotations
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_up_from_annotation();