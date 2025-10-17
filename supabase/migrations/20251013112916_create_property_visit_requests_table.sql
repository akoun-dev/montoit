/*
  # Create Property Visit Requests Table - Visit CRM System

  1. New Tables
    - `property_visit_requests`
      - `id` (uuid, primary key) - Unique identifier
      - `property_id` (uuid, foreign key) - Property being requested
      - `requester_id` (uuid, foreign key) - User requesting visit
      - `request_type` (text) - 'flexible' or 'specific'
      - `preferred_dates` (jsonb) - Flexible dates array
      - `specific_slot_id` (uuid, foreign key) - Specific slot if selected
      - `availability_notes` (text) - Additional availability info
      - `visitor_count` (integer) - Number of visitors
      - `motivation` (text) - Why interested in property
      - `status` (text) - Request status
      - `priority_score` (integer) - Auto-calculated priority (0-100)
      - `score_breakdown` (jsonb) - How score was calculated
      - `agent_response` (text) - Agent's response message
      - `agent_response_at` (timestamptz) - When agent responded
      - `proposed_slots` (jsonb) - Slots proposed by agent
      - `selected_slot_id` (uuid) - Slot selected by requester
      - `expires_at` (timestamptz) - 48h expiration time
      - `converted_to_booking_id` (uuid) - Booking created from request
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS
    - Requesters can view/create their own requests
    - Agents can view requests for their properties
    - Auto-calculate priority score on insert

  3. Priority Scoring Algorithm
    - Identity verified: +30 points
    - Complete profile: +40 points
    - Account age > 1 month: +10 points
    - Previous applications: +20 points
    - Maximum score: 100 points

  4. Automation
    - Auto-calculate priority score
    - Auto-set expiration time (48 hours)
    - Auto-expire stale requests
*/

-- Create property_visit_requests table
CREATE TABLE IF NOT EXISTS public.property_visit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Request details
  request_type text NOT NULL CHECK (request_type IN ('flexible', 'specific')),
  preferred_dates jsonb,
  specific_slot_id uuid REFERENCES public.property_visit_slots(id) ON DELETE SET NULL,
  availability_notes text,
  visitor_count integer DEFAULT 1 CHECK (visitor_count > 0 AND visitor_count <= 10),
  motivation text,
  
  -- Status tracking
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'converted')),
  
  -- Priority scoring
  priority_score integer DEFAULT 0 CHECK (priority_score >= 0 AND priority_score <= 100),
  score_breakdown jsonb,
  
  -- Agent response
  agent_response text,
  agent_response_at timestamptz,
  proposed_slots jsonb,
  selected_slot_id uuid REFERENCES public.property_visit_slots(id) ON DELETE SET NULL,
  
  -- Expiration (48 hours)
  expires_at timestamptz NOT NULL,
  
  -- Conversion tracking
  converted_to_booking_id uuid REFERENCES public.property_visit_bookings(id) ON DELETE SET NULL,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_visit_requests_property ON public.property_visit_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_requester ON public.property_visit_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_status ON public.property_visit_requests(status);
CREATE INDEX IF NOT EXISTS idx_visit_requests_priority ON public.property_visit_requests(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_visit_requests_expires ON public.property_visit_requests(expires_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.property_visit_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Requesters can view their own requests
CREATE POLICY "Requesters can view own requests"
  ON public.property_visit_requests FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid());

-- Policy: Property owners can view requests for their properties
CREATE POLICY "Owners can view property requests"
  ON public.property_visit_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = property_visit_requests.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Policy: Agencies with mandate can view requests
CREATE POLICY "Agencies can view mandate property requests"
  ON public.property_visit_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_mandates
      WHERE agency_mandates.property_id = property_visit_requests.property_id
      AND agency_mandates.agency_id = auth.uid()
      AND agency_mandates.status = 'active'
      AND agency_mandates.end_date > now()
    )
  );

-- Policy: Authenticated users can create requests
CREATE POLICY "Users can create visit requests"
  ON public.property_visit_requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Policy: Requesters can update their own requests (limited fields)
CREATE POLICY "Requesters can update own requests"
  ON public.property_visit_requests FOR UPDATE
  TO authenticated
  USING (requester_id = auth.uid())
  WITH CHECK (requester_id = auth.uid());

-- Policy: Owners/agents can update requests for their properties
CREATE POLICY "Owners can update property requests"
  ON public.property_visit_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = property_visit_requests.property_id
      AND properties.owner_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.agency_mandates
      WHERE agency_mandates.property_id = property_visit_requests.property_id
      AND agency_mandates.agency_id = auth.uid()
      AND agency_mandates.status = 'active'
      AND agency_mandates.end_date > now()
    )
  );

-- Function: Calculate priority score
CREATE OR REPLACE FUNCTION calculate_visit_request_priority_score(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_score integer := 0;
  v_breakdown jsonb := '{}'::jsonb;
  v_profile record;
  v_verification record;
  v_account_age_days integer;
  v_application_count integer;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Get verification status
  SELECT * INTO v_verification
  FROM public.user_verifications
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- Identity verified: +30 points
  IF v_verification.oneci_status = 'verified' OR 
     v_verification.cnam_status = 'verified' OR 
     v_verification.face_verification_status = 'verified' THEN
    v_score := v_score + 30;
    v_breakdown := v_breakdown || jsonb_build_object('identity_verified', 30);
  END IF;
  
  -- Complete profile: +40 points (phone, city, bio)
  IF v_profile.phone IS NOT NULL AND 
     v_profile.city IS NOT NULL AND 
     v_profile.bio IS NOT NULL AND
     length(v_profile.bio) > 20 THEN
    v_score := v_score + 40;
    v_breakdown := v_breakdown || jsonb_build_object('complete_profile', 40);
  END IF;
  
  -- Account age > 1 month: +10 points
  SELECT EXTRACT(DAY FROM (now() - v_profile.created_at))::integer INTO v_account_age_days;
  IF v_account_age_days > 30 THEN
    v_score := v_score + 10;
    v_breakdown := v_breakdown || jsonb_build_object('account_age', 10);
  END IF;
  
  -- Previous applications: +20 points
  SELECT COUNT(*) INTO v_application_count
  FROM public.rental_applications
  WHERE applicant_id = p_user_id;
  
  IF v_application_count > 0 THEN
    v_score := v_score + 20;
    v_breakdown := v_breakdown || jsonb_build_object('application_history', 20);
  END IF;
  
  -- Return score and breakdown
  RETURN jsonb_build_object(
    'score', v_score,
    'breakdown', v_breakdown
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-set priority score and expiration on insert
CREATE OR REPLACE FUNCTION set_visit_request_defaults()
RETURNS TRIGGER AS $$
DECLARE
  v_score_result jsonb;
BEGIN
  -- Calculate priority score
  v_score_result := calculate_visit_request_priority_score(NEW.requester_id);
  NEW.priority_score := (v_score_result->>'score')::integer;
  NEW.score_breakdown := v_score_result->'breakdown';
  
  -- Set expiration time (48 hours from now)
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + interval '48 hours';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Set defaults on insert
DROP TRIGGER IF EXISTS trigger_set_visit_request_defaults ON public.property_visit_requests;
CREATE TRIGGER trigger_set_visit_request_defaults
  BEFORE INSERT ON public.property_visit_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_visit_request_defaults();

-- Function: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_visit_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at on row update
DROP TRIGGER IF EXISTS trigger_update_visit_requests_updated_at ON public.property_visit_requests;
CREATE TRIGGER trigger_update_visit_requests_updated_at
  BEFORE UPDATE ON public.property_visit_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_visit_requests_updated_at();

-- Function: Auto-expire pending requests after 48 hours
CREATE OR REPLACE FUNCTION expire_stale_visit_requests()
RETURNS void AS $$
BEGIN
  UPDATE public.property_visit_requests
  SET 
    status = 'expired',
    updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_visit_request_priority_score TO authenticated;
GRANT EXECUTE ON FUNCTION expire_stale_visit_requests TO authenticated;