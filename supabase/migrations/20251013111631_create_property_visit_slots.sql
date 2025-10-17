/*
  # Create Property Visit Slots Table

  1. New Tables
    - `property_visit_slots`
      - `id` (uuid, primary key) - Unique identifier for the visit slot
      - `property_id` (uuid, foreign key) - Links to the property being visited
      - `organizer_id` (uuid, foreign key) - User organizing the visit (must be verified)
      - `organizer_type` (text) - Type of organizer: 'owner', 'agency', or 'agent'
      - `mandate_verified` (boolean) - Whether the mandate has been verified
      - `mandate_verification_date` (timestamptz) - When the mandate was verified
      - `mandate_document_url` (text) - URL to proof of mandate (contract, power of attorney)
      - `start_time` (timestamptz) - Visit start time
      - `end_time` (timestamptz) - Visit end time
      - `max_visitors` (integer) - Maximum number of visitors (default 1)
      - `status` (text) - Slot status: 'available', 'booked', 'completed', 'cancelled'
      - `visit_fee_amount` (numeric) - Visit fee in FCFA (max 10,000)
      - `visit_fee_currency` (text) - Currency (default 'XOF')
      - `visit_fee_refundable` (boolean) - Whether fee is refundable if lease signed
      - `visit_fee_refund_conditions` (text) - Conditions for refund
      - `meeting_point` (text) - Where to meet for the visit
      - `instructions` (text) - Special instructions for visitors
      - `created_at` (timestamptz) - When the slot was created
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `property_visit_slots` table
    - Add policy for public to view available slots
    - Add policy for verified organizers to create slots
    - Add policy for organizers to update their own slots

  3. Indexes
    - Index on property_id for fast property lookup
    - Index on organizer_id for fast organizer lookup
    - Index on time range for scheduling queries
    - Index on status for filtering available slots

  4. Constraints
    - End time must be after start time
    - Visit fee must not exceed 10,000 FCFA (ANSUT regulation)
    - Organizer must be property owner or have active mandate
*/

-- Create property_visit_slots table
CREATE TABLE IF NOT EXISTS public.property_visit_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Property link
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  
  -- Organizer (MUST BE VERIFIED)
  organizer_id uuid NOT NULL REFERENCES auth.users(id),
  organizer_type text NOT NULL CHECK (organizer_type IN ('owner', 'agency', 'agent')),
  
  -- Mandate verification
  mandate_verified boolean DEFAULT false,
  mandate_verification_date timestamptz,
  mandate_document_url text,
  
  -- Time slot
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  max_visitors integer DEFAULT 1 CHECK (max_visitors > 0),
  
  -- Status
  status text DEFAULT 'available' CHECK (status IN ('available', 'booked', 'completed', 'cancelled')),
  
  -- Visit fee (REGULATED)
  visit_fee_amount numeric(10,2) DEFAULT 0 CHECK (visit_fee_amount >= 0),
  visit_fee_currency text DEFAULT 'XOF',
  visit_fee_refundable boolean DEFAULT true,
  visit_fee_refund_conditions text,
  
  -- Meeting details
  meeting_point text,
  instructions text,
  
  -- Audit timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT reasonable_fee CHECK (visit_fee_amount <= 10000)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_visit_slots_property ON public.property_visit_slots(property_id);
CREATE INDEX IF NOT EXISTS idx_visit_slots_organizer ON public.property_visit_slots(organizer_id);
CREATE INDEX IF NOT EXISTS idx_visit_slots_time ON public.property_visit_slots(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_visit_slots_status ON public.property_visit_slots(status);
CREATE INDEX IF NOT EXISTS idx_visit_slots_available ON public.property_visit_slots(property_id, status) 
  WHERE status = 'available';

-- Enable RLS
ALTER TABLE public.property_visit_slots ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view available slots (for booking)
CREATE POLICY "Anyone can view available slots"
  ON public.property_visit_slots FOR SELECT
  USING (status = 'available' AND start_time > now());

-- Policy: Authenticated users can view all slots for properties they're interested in
CREATE POLICY "Authenticated users can view all slots"
  ON public.property_visit_slots FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only verified property owners can create slots
CREATE POLICY "Property owners can create slots"
  ON public.property_visit_slots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
      AND p.owner_id = auth.uid()
    )
  );

-- Policy: Agency with active mandate can create slots
CREATE POLICY "Agencies with mandate can create slots"
  ON public.property_visit_slots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_mandates am
      WHERE am.property_id = property_visit_slots.property_id
      AND am.agency_id = auth.uid()
      AND am.status = 'active'
      AND am.end_date > now()
    )
  );

-- Policy: Organizers can update their own slots
CREATE POLICY "Organizers can update their slots"
  ON public.property_visit_slots FOR UPDATE
  TO authenticated
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

-- Policy: Organizers can delete their own slots
CREATE POLICY "Organizers can delete their slots"
  ON public.property_visit_slots FOR DELETE
  TO authenticated
  USING (organizer_id = auth.uid());

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_visit_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at on row update
DROP TRIGGER IF EXISTS trigger_update_visit_slots_updated_at ON public.property_visit_slots;
CREATE TRIGGER trigger_update_visit_slots_updated_at
  BEFORE UPDATE ON public.property_visit_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_visit_slots_updated_at();

-- Function: Auto-verify mandate on slot creation
CREATE OR REPLACE FUNCTION auto_verify_mandate()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user is property owner
  IF EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = NEW.property_id
    AND owner_id = NEW.organizer_id
  ) THEN
    NEW.mandate_verified = true;
    NEW.mandate_verification_date = now();
    NEW.organizer_type = 'owner';
  -- Check if user has active agency mandate
  ELSIF EXISTS (
    SELECT 1 FROM public.agency_mandates
    WHERE property_id = NEW.property_id
    AND agency_id = NEW.organizer_id
    AND status = 'active'
    AND end_date > now()
  ) THEN
    NEW.mandate_verified = true;
    NEW.mandate_verification_date = now();
    NEW.organizer_type = 'agency';
  ELSE
    NEW.mandate_verified = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Verify mandate on insert
DROP TRIGGER IF EXISTS trigger_auto_verify_mandate ON public.property_visit_slots;
CREATE TRIGGER trigger_auto_verify_mandate
  BEFORE INSERT ON public.property_visit_slots
  FOR EACH ROW
  EXECUTE FUNCTION auto_verify_mandate();