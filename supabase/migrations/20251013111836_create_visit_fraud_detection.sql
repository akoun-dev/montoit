/*
  # Create Visit Fraud Detection Table

  1. New Tables
    - `visit_fraud_detection`
      - `id` (uuid, primary key) - Unique identifier
      - `target_type` (text) - Type of target: 'user', 'booking', 'slot'
      - `target_id` (uuid) - ID of the target entity
      - `fraud_type` (text) - Type of fraud detected
      - `confidence_score` (numeric) - Confidence level (0-1)
      - `detection_method` (text) - How fraud was detected
      - `evidence` (jsonb) - Evidence of fraud
      - `action_taken` (text) - Action taken
      - `action_date` (timestamptz) - When action was taken
      - `detected_at` (timestamptz) - When fraud was detected
      - `reviewed_by` (uuid, foreign key) - Admin who reviewed
      - `reviewed_at` (timestamptz) - When it was reviewed
      - `review_notes` (text) - Admin notes

  2. Fraud Types
    - fake_organizer: Organizer not verified
    - no_mandate: No valid mandate
    - excessive_fees: Fees exceed 10,000 FCFA
    - multiple_bookings_same_slot: Overbooking
    - pattern_suspicious: Suspicious patterns (same IP, phone)
    - no_show_pattern: High no-show rate
    - negative_reviews_pattern: Repeated negative reviews
    - property_not_exists: Property doesn't exist
    - duplicate_payment: Duplicate payment detected

  3. Security
    - Enable RLS
    - Only admins can view fraud detection data
    - System can insert fraud detections
    - Admins can update fraud investigations

  4. Indexes
    - Index on target_type and target_id
    - Index on fraud_type
    - Index on confidence_score
    - Index on action_taken
*/

-- Create visit_fraud_detection table
CREATE TABLE IF NOT EXISTS public.visit_fraud_detection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Target of fraud detection
  target_type text NOT NULL CHECK (target_type IN ('user', 'booking', 'slot')),
  target_id uuid NOT NULL,
  
  -- Fraud details
  fraud_type text NOT NULL CHECK (fraud_type IN (
    'fake_organizer',
    'no_mandate',
    'excessive_fees',
    'multiple_bookings_same_slot',
    'pattern_suspicious',
    'no_show_pattern',
    'negative_reviews_pattern',
    'property_not_exists',
    'duplicate_payment',
    'identity_mismatch',
    'payment_fraud',
    'manual_report'
  )),
  
  -- Confidence and evidence
  confidence_score numeric(3,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  detection_method text CHECK (detection_method IN ('rule_based', 'ml_model', 'manual_report', 'automated_check')),
  evidence jsonb,
  
  -- Action taken
  action_taken text DEFAULT 'none' CHECK (action_taken IN ('none', 'warning', 'suspension', 'ban', 'refund', 'investigation')),
  action_date timestamptz,
  
  -- Timestamps
  detected_at timestamptz DEFAULT now(),
  
  -- Review
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fraud_target ON public.visit_fraud_detection(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_fraud_type ON public.visit_fraud_detection(fraud_type);
CREATE INDEX IF NOT EXISTS idx_fraud_confidence ON public.visit_fraud_detection(confidence_score);
CREATE INDEX IF NOT EXISTS idx_fraud_action ON public.visit_fraud_detection(action_taken);
CREATE INDEX IF NOT EXISTS idx_fraud_detected ON public.visit_fraud_detection(detected_at);
CREATE INDEX IF NOT EXISTS idx_fraud_high_confidence ON public.visit_fraud_detection(confidence_score) 
  WHERE confidence_score >= 0.7;

-- Enable RLS
ALTER TABLE public.visit_fraud_detection ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view fraud detections
CREATE POLICY "Admins can view fraud detections"
  ON public.visit_fraud_detection FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: System can insert fraud detections (service role)
CREATE POLICY "System can insert fraud detections"
  ON public.visit_fraud_detection FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can update fraud investigations
CREATE POLICY "Admins can update fraud detections"
  ON public.visit_fraud_detection FOR UPDATE
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

-- Function: Detect unverified organizers
CREATE OR REPLACE FUNCTION detect_unverified_organizers()
RETURNS void AS $$
BEGIN
  INSERT INTO public.visit_fraud_detection (target_type, target_id, fraud_type, confidence_score, detection_method, evidence)
  SELECT 
    'user',
    s.organizer_id,
    'fake_organizer',
    1.0,
    'rule_based',
    jsonb_build_object(
      'reason', 'Organizer not verified or verification pending',
      'slots_created', COUNT(s.id),
      'detection_time', now()
    )
  FROM public.property_visit_slots s
  LEFT JOIN public.visit_organizer_verification v ON v.user_id = s.organizer_id
  WHERE (v.verification_status IS NULL OR v.verification_status != 'verified')
  AND s.created_at > now() - interval '7 days'
  GROUP BY s.organizer_id
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Detect excessive fees
CREATE OR REPLACE FUNCTION detect_excessive_fees()
RETURNS void AS $$
BEGIN
  INSERT INTO public.visit_fraud_detection (target_type, target_id, fraud_type, confidence_score, detection_method, evidence)
  SELECT 
    'slot',
    id,
    'excessive_fees',
    CASE 
      WHEN visit_fee_amount > 10000 THEN 1.0
      WHEN visit_fee_amount > 7500 THEN 0.8
      WHEN visit_fee_amount > 5000 THEN 0.5
      ELSE 0.3
    END,
    'rule_based',
    jsonb_build_object(
      'fee_amount', visit_fee_amount,
      'max_allowed', 10000,
      'property_id', property_id,
      'organizer_id', organizer_id
    )
  FROM public.property_visit_slots
  WHERE visit_fee_amount > 5000
  AND created_at > now() - interval '7 days'
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Detect no-show patterns
CREATE OR REPLACE FUNCTION detect_no_show_pattern()
RETURNS void AS $$
BEGIN
  INSERT INTO public.visit_fraud_detection (target_type, target_id, fraud_type, confidence_score, detection_method, evidence)
  SELECT 
    'user',
    s.organizer_id,
    'no_show_pattern',
    CASE 
      WHEN (no_show_count::float / NULLIF(total_bookings, 0)) > 0.5 THEN 1.0
      WHEN (no_show_count::float / NULLIF(total_bookings, 0)) > 0.3 THEN 0.7
      ELSE 0.4
    END,
    'rule_based',
    jsonb_build_object(
      'no_show_count', no_show_count,
      'total_bookings', total_bookings,
      'no_show_rate', ROUND((no_show_count::float / NULLIF(total_bookings, 0))::numeric, 2),
      'organizer_id', s.organizer_id
    )
  FROM (
    SELECT 
      s.organizer_id,
      COUNT(b.id) FILTER (WHERE b.visit_status = 'no_show') as no_show_count,
      COUNT(b.id) as total_bookings
    FROM public.property_visit_slots s
    JOIN public.property_visit_bookings b ON b.slot_id = s.id
    WHERE b.created_at > now() - interval '30 days'
    GROUP BY s.organizer_id
    HAVING COUNT(b.id) >= 5
  ) stats
  WHERE (no_show_count::float / NULLIF(total_bookings, 0)) > 0.3
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Detect negative review patterns
CREATE OR REPLACE FUNCTION detect_negative_review_pattern()
RETURNS void AS $$
BEGIN
  INSERT INTO public.visit_fraud_detection (target_type, target_id, fraud_type, confidence_score, detection_method, evidence)
  SELECT 
    'user',
    s.organizer_id,
    'negative_reviews_pattern',
    CASE 
      WHEN avg_rating < 2.0 THEN 1.0
      WHEN avg_rating < 2.5 THEN 0.8
      WHEN avg_rating < 3.0 THEN 0.5
      ELSE 0.3
    END,
    'rule_based',
    jsonb_build_object(
      'average_rating', avg_rating,
      'total_reviews', total_reviews,
      'organizer_id', s.organizer_id
    )
  FROM (
    SELECT 
      s.organizer_id,
      AVG(b.organizer_rating)::numeric(3,2) as avg_rating,
      COUNT(b.organizer_rating) as total_reviews
    FROM public.property_visit_slots s
    JOIN public.property_visit_bookings b ON b.slot_id = s.id
    WHERE b.organizer_rating IS NOT NULL
    AND b.created_at > now() - interval '30 days'
    GROUP BY s.organizer_id
    HAVING COUNT(b.organizer_rating) >= 3
  ) stats
  WHERE avg_rating < 3.0
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Run all fraud detection checks
CREATE OR REPLACE FUNCTION run_all_fraud_checks()
RETURNS void AS $$
BEGIN
  PERFORM detect_unverified_organizers();
  PERFORM detect_excessive_fees();
  PERFORM detect_no_show_pattern();
  PERFORM detect_negative_review_pattern();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;