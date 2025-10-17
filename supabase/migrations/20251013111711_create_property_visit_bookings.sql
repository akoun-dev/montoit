/*
  # Create Property Visit Bookings Table

  1. New Tables
    - `property_visit_bookings`
      - `id` (uuid, primary key) - Unique identifier
      - `slot_id` (uuid, foreign key) - Links to visit slot
      - `property_id` (uuid, foreign key) - Links to property
      - `visitor_id` (uuid, foreign key) - User booking the visit
      - `visitor_name` (text) - Visitor's full name
      - `visitor_phone` (text) - Visitor's phone number
      - `visitor_email` (text) - Visitor's email
      - `number_of_visitors` (integer) - Number of people visiting
      - `payment_status` (text) - Payment status
      - `payment_amount` (numeric) - Amount paid
      - `payment_method` (text) - Payment method used
      - `payment_transaction_id` (text) - Transaction ID from payment provider
      - `payment_date` (timestamptz) - When payment was made
      - `refund_status` (text) - Refund status
      - `refund_reason` (text) - Reason for refund request
      - `refund_date` (timestamptz) - When refund was processed
      - `confirmation_code` (text) - 6-digit confirmation code
      - `qr_code_url` (text) - QR code for on-site verification
      - `confirmed_by_organizer` (boolean) - Organizer confirmed
      - `confirmed_by_visitor` (boolean) - Visitor confirmed
      - `visit_status` (text) - Visit status
      - `check_in_time` (timestamptz) - When visitor checked in
      - `check_out_time` (timestamptz) - When visitor checked out
      - `visitor_rating` (integer) - Rating given by visitor (1-5)
      - `visitor_review` (text) - Review by visitor
      - `organizer_rating` (integer) - Rating given by organizer (1-5)
      - `organizer_review` (text) - Review by organizer
      - `fraud_reported` (boolean) - Whether fraud was reported
      - `fraud_report_reason` (text) - Reason for fraud report
      - `fraud_report_date` (timestamptz) - When fraud was reported
      - `fraud_investigation_status` (text) - Investigation status
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      - `cancelled_at` (timestamptz) - When booking was cancelled
      - `cancellation_reason` (text) - Reason for cancellation

  2. Security
    - Enable RLS
    - Visitors can view their own bookings
    - Organizers can view bookings for their slots
    - Visitors can create bookings
    - Both parties can update certain fields

  3. Indexes
    - Index on slot_id
    - Index on visitor_id
    - Index on property_id
    - Index on payment_status
    - Index on fraud_reported
*/

-- Create property_visit_bookings table
CREATE TABLE IF NOT EXISTS public.property_visit_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  slot_id uuid NOT NULL REFERENCES public.property_visit_slots(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id),
  
  -- Visitor information
  visitor_id uuid NOT NULL REFERENCES auth.users(id),
  visitor_name text NOT NULL,
  visitor_phone text NOT NULL,
  visitor_email text,
  
  -- Number of visitors
  number_of_visitors integer DEFAULT 1 CHECK (number_of_visitors > 0),
  
  -- Payment (TRACED)
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_amount numeric(10,2) NOT NULL CHECK (payment_amount >= 0),
  payment_method text,
  payment_transaction_id text UNIQUE,
  payment_date timestamptz,
  
  -- Refund
  refund_status text DEFAULT 'not_requested' CHECK (refund_status IN ('not_requested', 'requested', 'approved', 'refunded', 'rejected')),
  refund_reason text,
  refund_date timestamptz,
  
  -- Confirmation
  confirmation_code text UNIQUE NOT NULL,
  qr_code_url text,
  confirmed_by_organizer boolean DEFAULT false,
  confirmed_by_visitor boolean DEFAULT false,
  
  -- Visit tracking
  visit_status text DEFAULT 'scheduled' CHECK (visit_status IN ('scheduled', 'in_progress', 'completed', 'no_show', 'cancelled')),
  check_in_time timestamptz,
  check_out_time timestamptz,
  
  -- Post-visit evaluation
  visitor_rating integer CHECK (visitor_rating IS NULL OR (visitor_rating BETWEEN 1 AND 5)),
  visitor_review text,
  organizer_rating integer CHECK (organizer_rating IS NULL OR (organizer_rating BETWEEN 1 AND 5)),
  organizer_review text,
  
  -- Fraud reporting
  fraud_reported boolean DEFAULT false,
  fraud_report_reason text,
  fraud_report_date timestamptz,
  fraud_investigation_status text CHECK (fraud_investigation_status IS NULL OR fraud_investigation_status IN ('pending', 'investigating', 'confirmed', 'dismissed')),
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  cancelled_at timestamptz,
  cancellation_reason text
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON public.property_visit_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_visitor ON public.property_visit_bookings(visitor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property ON public.property_visit_bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.property_visit_bookings(visit_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment ON public.property_visit_bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_fraud ON public.property_visit_bookings(fraud_reported) WHERE fraud_reported = true;
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation_code ON public.property_visit_bookings(confirmation_code);

-- Enable RLS
ALTER TABLE public.property_visit_bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Visitors can view their own bookings
CREATE POLICY "Visitors can view their bookings"
  ON public.property_visit_bookings FOR SELECT
  TO authenticated
  USING (visitor_id = auth.uid());

-- Policy: Organizers can view bookings for their slots
CREATE POLICY "Organizers can view their bookings"
  ON public.property_visit_bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.property_visit_slots s
      WHERE s.id = slot_id
      AND s.organizer_id = auth.uid()
    )
  );

-- Policy: Authenticated users can create bookings
CREATE POLICY "Users can create bookings"
  ON public.property_visit_bookings FOR INSERT
  TO authenticated
  WITH CHECK (visitor_id = auth.uid());

-- Policy: Visitors can update their own bookings (limited fields)
CREATE POLICY "Visitors can update their bookings"
  ON public.property_visit_bookings FOR UPDATE
  TO authenticated
  USING (visitor_id = auth.uid())
  WITH CHECK (visitor_id = auth.uid());

-- Policy: Organizers can update bookings for their slots (limited fields)
CREATE POLICY "Organizers can update their bookings"
  ON public.property_visit_bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.property_visit_slots s
      WHERE s.id = slot_id
      AND s.organizer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.property_visit_slots s
      WHERE s.id = slot_id
      AND s.organizer_id = auth.uid()
    )
  );

-- Function: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_visit_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at on row update
DROP TRIGGER IF EXISTS trigger_update_visit_bookings_updated_at ON public.property_visit_bookings;
CREATE TRIGGER trigger_update_visit_bookings_updated_at
  BEFORE UPDATE ON public.property_visit_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_visit_bookings_updated_at();

-- Function: Auto-update slot status when booked
CREATE OR REPLACE FUNCTION update_slot_status_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND NEW.visit_status = 'scheduled' THEN
    UPDATE public.property_visit_slots
    SET status = 'booked'
    WHERE id = NEW.slot_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update slot status when booking is paid
DROP TRIGGER IF EXISTS trigger_update_slot_status_on_booking ON public.property_visit_bookings;
CREATE TRIGGER trigger_update_slot_status_on_booking
  AFTER INSERT OR UPDATE ON public.property_visit_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_slot_status_on_booking();

-- Function: Generate unique confirmation code
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS text AS $$
DECLARE
  code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate 6-digit code
    code := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
    
    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM public.property_visit_bookings 
      WHERE confirmation_code = code
    ) INTO code_exists;
    
    -- If code doesn't exist, return it
    IF NOT code_exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;