/*
  # Create Visit Organizer Verification Table

  1. New Tables
    - `visit_organizer_verification`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, unique foreign key) - User being verified
      - `organizer_type` (text) - Type: 'owner', 'agency', 'agent'
      - `identity_verified` (boolean) - Identity verification status
      - `identity_verification_method` (text) - Method used: 'oneci', 'cnam', 'passport', 'smile_id'
      - `identity_document_url` (text) - URL to identity document
      - `identity_verified_at` (timestamptz) - When identity was verified
      - `ansut_certified` (boolean) - ANSUT certification status
      - `ansut_certificate_number` (text, unique) - ANSUT certificate number
      - `ansut_certificate_url` (text) - URL to ANSUT certificate
      - `ansut_verified_at` (timestamptz) - When ANSUT certification was verified
      - `biometric_verified` (boolean) - Biometric verification status
      - `biometric_data_hash` (text) - Hash of biometric data (NOT the data itself)
      - `biometric_verified_at` (timestamptz) - When biometric was verified
      - `has_active_mandates` (boolean) - Whether user has active mandates
      - `mandates_count` (integer) - Number of mandates
      - `total_visits_organized` (integer) - Total visits organized
      - `completed_visits` (integer) - Completed visits
      - `cancelled_visits` (integer) - Cancelled visits
      - `no_show_visits` (integer) - No-show visits
      - `average_rating` (numeric) - Average rating from visitors
      - `total_reviews` (integer) - Total number of reviews
      - `fraud_reports_count` (integer) - Number of fraud reports received
      - `fraud_confirmed_count` (integer) - Number of confirmed frauds
      - `is_blacklisted` (boolean) - Whether user is blacklisted
      - `blacklist_reason` (text) - Reason for blacklist
      - `blacklisted_at` (timestamptz) - When user was blacklisted
      - `verification_status` (text) - Overall verification status
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      - `verified_by` (uuid, foreign key) - Admin who verified
      - `verification_notes` (text) - Admin notes

  2. Security
    - Enable RLS
    - Users can view their own verification
    - Public can view verified organizers (for trust)
    - Admins can manage verifications

  3. Indexes
    - Index on user_id
    - Index on verification_status
    - Index on ansut_certified
    - Index on is_blacklisted
*/

-- Create visit_organizer_verification table
CREATE TABLE IF NOT EXISTS public.visit_organizer_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Organizer type
  organizer_type text NOT NULL CHECK (organizer_type IN ('owner', 'agency', 'agent')),
  
  -- Identity verification
  identity_verified boolean DEFAULT false,
  identity_verification_method text CHECK (identity_verification_method IS NULL OR identity_verification_method IN ('oneci', 'cnam', 'passport', 'smile_id')),
  identity_document_url text,
  identity_verified_at timestamptz,
  
  -- ANSUT certification
  ansut_certified boolean DEFAULT false,
  ansut_certificate_number text UNIQUE,
  ansut_certificate_url text,
  ansut_verified_at timestamptz,
  
  -- Biometric verification
  biometric_verified boolean DEFAULT false,
  biometric_data_hash text,
  biometric_verified_at timestamptz,
  
  -- Mandates (for agencies)
  has_active_mandates boolean DEFAULT false,
  mandates_count integer DEFAULT 0 CHECK (mandates_count >= 0),
  
  -- Reputation statistics
  total_visits_organized integer DEFAULT 0 CHECK (total_visits_organized >= 0),
  completed_visits integer DEFAULT 0 CHECK (completed_visits >= 0),
  cancelled_visits integer DEFAULT 0 CHECK (cancelled_visits >= 0),
  no_show_visits integer DEFAULT 0 CHECK (no_show_visits >= 0),
  average_rating numeric(3,2) CHECK (average_rating IS NULL OR (average_rating >= 0 AND average_rating <= 5)),
  total_reviews integer DEFAULT 0 CHECK (total_reviews >= 0),
  
  -- Fraud tracking
  fraud_reports_count integer DEFAULT 0 CHECK (fraud_reports_count >= 0),
  fraud_confirmed_count integer DEFAULT 0 CHECK (fraud_confirmed_count >= 0),
  is_blacklisted boolean DEFAULT false,
  blacklist_reason text,
  blacklisted_at timestamptz,
  
  -- Verification status
  verification_status text DEFAULT 'pending' CHECK (verification_status IN (
    'pending',
    'in_review',
    'verified',
    'rejected',
    'suspended',
    'banned'
  )),
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  verified_by uuid REFERENCES auth.users(id),
  verification_notes text
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizer_user ON public.visit_organizer_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_organizer_status ON public.visit_organizer_verification(verification_status);
CREATE INDEX IF NOT EXISTS idx_organizer_certified ON public.visit_organizer_verification(ansut_certified);
CREATE INDEX IF NOT EXISTS idx_organizer_blacklist ON public.visit_organizer_verification(is_blacklisted);
CREATE INDEX IF NOT EXISTS idx_organizer_verified ON public.visit_organizer_verification(verification_status) 
  WHERE verification_status = 'verified';

-- Enable RLS
ALTER TABLE public.visit_organizer_verification ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own verification status
CREATE POLICY "Users can view their verification"
  ON public.visit_organizer_verification FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Anyone can view verified organizers (for trust badges)
CREATE POLICY "Public can view verified organizers"
  ON public.visit_organizer_verification FOR SELECT
  USING (verification_status = 'verified' AND NOT is_blacklisted);

-- Policy: Admins can view all verifications
CREATE POLICY "Admins can view all verifications"
  ON public.visit_organizer_verification FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Users can request verification
CREATE POLICY "Users can request verification"
  ON public.visit_organizer_verification FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own verification (limited fields)
CREATE POLICY "Users can update their verification"
  ON public.visit_organizer_verification FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Admins can update all verifications
CREATE POLICY "Admins can update verifications"
  ON public.visit_organizer_verification FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_organizer_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at on row update
DROP TRIGGER IF EXISTS trigger_update_organizer_verification_updated_at ON public.visit_organizer_verification;
CREATE TRIGGER trigger_update_organizer_verification_updated_at
  BEFORE UPDATE ON public.visit_organizer_verification
  FOR EACH ROW
  EXECUTE FUNCTION update_organizer_verification_updated_at();

-- Function: Update reputation stats from bookings
CREATE OR REPLACE FUNCTION update_organizer_reputation()
RETURNS void AS $$
BEGIN
  UPDATE public.visit_organizer_verification v
  SET
    total_visits_organized = (
      SELECT COUNT(*) FROM public.property_visit_bookings b
      JOIN public.property_visit_slots s ON s.id = b.slot_id
      WHERE s.organizer_id = v.user_id
    ),
    completed_visits = (
      SELECT COUNT(*) FROM public.property_visit_bookings b
      JOIN public.property_visit_slots s ON s.id = b.slot_id
      WHERE s.organizer_id = v.user_id
      AND b.visit_status = 'completed'
    ),
    cancelled_visits = (
      SELECT COUNT(*) FROM public.property_visit_bookings b
      JOIN public.property_visit_slots s ON s.id = b.slot_id
      WHERE s.organizer_id = v.user_id
      AND b.visit_status = 'cancelled'
    ),
    no_show_visits = (
      SELECT COUNT(*) FROM public.property_visit_bookings b
      JOIN public.property_visit_slots s ON s.id = b.slot_id
      WHERE s.organizer_id = v.user_id
      AND b.visit_status = 'no_show'
    ),
    average_rating = (
      SELECT AVG(organizer_rating)::numeric(3,2) FROM public.property_visit_bookings b
      JOIN public.property_visit_slots s ON s.id = b.slot_id
      WHERE s.organizer_id = v.user_id
      AND b.organizer_rating IS NOT NULL
    ),
    total_reviews = (
      SELECT COUNT(*) FROM public.property_visit_bookings b
      JOIN public.property_visit_slots s ON s.id = b.slot_id
      WHERE s.organizer_id = v.user_id
      AND b.organizer_rating IS NOT NULL
    ),
    fraud_reports_count = (
      SELECT COUNT(*) FROM public.property_visit_bookings b
      JOIN public.property_visit_slots s ON s.id = b.slot_id
      WHERE s.organizer_id = v.user_id
      AND b.fraud_reported = true
    );
END;
$$ LANGUAGE plpgsql;

-- Function: Update mandate counts
CREATE OR REPLACE FUNCTION update_organizer_mandates()
RETURNS void AS $$
BEGIN
  UPDATE public.visit_organizer_verification v
  SET
    has_active_mandates = (
      SELECT COUNT(*) > 0 FROM public.agency_mandates
      WHERE agency_id = v.user_id
      AND status = 'active'
      AND end_date > now()
    ),
    mandates_count = (
      SELECT COUNT(*) FROM public.agency_mandates
      WHERE agency_id = v.user_id
      AND status = 'active'
      AND end_date > now()
    );
END;
$$ LANGUAGE plpgsql;