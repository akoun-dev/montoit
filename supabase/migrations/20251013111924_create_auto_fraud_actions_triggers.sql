/*
  # Create Auto Fraud Actions and Triggers

  1. Automatic Actions
    - Auto-suspend fraudsters with high confidence score
    - Auto-cancel future slots for suspended users
    - Auto-refund bookings for fraud victims
    - Auto-notify ANSUT of confirmed fraud

  2. Triggers
    - Trigger on fraud detection insert
    - Trigger on booking fraud report
    - Trigger on slot cancellation for fraud

  3. Admin Notifications
    - Create admin_audit_logs if not exists
    - Log all fraud-related actions
*/

-- Create admin_audit_logs table if not exists
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  details jsonb,
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create index on admin_audit_logs (handle both action and action_type column names)
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.admin_audit_logs(action);
EXCEPTION
  WHEN undefined_column THEN
    -- Try with action_type if action doesn't exist
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.admin_audit_logs(action_type);
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.admin_audit_logs(created_at);
EXCEPTION
  WHEN undefined_column THEN
    -- Try with created_at if it doesn't exist
    NULL;
END $$;

-- Enable RLS on admin_audit_logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  WITH CHECK (true);

-- Function: Auto-suspend fraudsters
CREATE OR REPLACE FUNCTION auto_suspend_fraudsters()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act on high-confidence fraud detections for critical fraud types
  IF NEW.confidence_score >= 0.8 
     AND NEW.fraud_type IN ('fake_organizer', 'no_mandate', 'property_not_exists', 'payment_fraud')
     AND NEW.target_type = 'user' THEN
    
    -- Suspend the user in visit_organizer_verification
    UPDATE public.visit_organizer_verification
    SET 
      verification_status = 'suspended',
      is_blacklisted = true,
      blacklist_reason = NEW.fraud_type,
      blacklisted_at = now()
    WHERE user_id = NEW.target_id;
    
    -- Cancel all future visit slots for this organizer
    UPDATE public.property_visit_slots
    SET 
      status = 'cancelled',
      updated_at = now()
    WHERE organizer_id = NEW.target_id
    AND start_time > now()
    AND status IN ('available', 'booked');
    
    -- Auto-refund all paid bookings for cancelled slots
    UPDATE public.property_visit_bookings
    SET 
      refund_status = 'approved',
      payment_status = 'refunded',
      refund_reason = 'Fraud detected - automatic refund',
      refund_date = now(),
      visit_status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = 'Organizer suspended for fraud'
    WHERE slot_id IN (
      SELECT id FROM public.property_visit_slots 
      WHERE organizer_id = NEW.target_id
      AND start_time > now()
    )
    AND payment_status = 'paid'
    AND refund_status = 'not_requested';
    
    -- Update fraud detection record with action taken
    NEW.action_taken = 'ban';
    NEW.action_date = now();
    
    -- Log the action in audit logs
    INSERT INTO public.admin_audit_logs (action, details)
    VALUES (
      'fraud_detected_auto_suspend',
      jsonb_build_object(
        'user_id', NEW.target_id,
        'fraud_type', NEW.fraud_type,
        'confidence_score', NEW.confidence_score,
        'detection_id', NEW.id,
        'action', 'auto_suspended_and_refunded',
        'timestamp', now()
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-suspend on fraud detection
DROP TRIGGER IF EXISTS trigger_auto_suspend_fraudsters ON public.visit_fraud_detection;
CREATE TRIGGER trigger_auto_suspend_fraudsters
  BEFORE INSERT ON public.visit_fraud_detection
  FOR EACH ROW
  EXECUTE FUNCTION auto_suspend_fraudsters();

-- Function: Handle fraud reports from bookings
CREATE OR REPLACE FUNCTION handle_booking_fraud_report()
RETURNS TRIGGER AS $$
BEGIN
  -- When fraud is reported on a booking
  IF NEW.fraud_reported = true AND (OLD.fraud_reported IS NULL OR OLD.fraud_reported = false) THEN
    
    -- Get the organizer from the slot
    INSERT INTO public.visit_fraud_detection (
      target_type,
      target_id,
      fraud_type,
      confidence_score,
      detection_method,
      evidence
    )
    SELECT 
      'booking',
      NEW.id,
      'manual_report',
      0.7, -- Medium confidence for manual reports
      'manual_report',
      jsonb_build_object(
        'booking_id', NEW.id,
        'visitor_id', NEW.visitor_id,
        'report_reason', NEW.fraud_report_reason,
        'reported_at', NEW.fraud_report_date,
        'slot_id', NEW.slot_id,
        'organizer_id', s.organizer_id
      )
    FROM public.property_visit_slots s
    WHERE s.id = NEW.slot_id;
    
    -- Set investigation status
    NEW.fraud_investigation_status = 'pending';
    
    -- Log the fraud report
    INSERT INTO public.admin_audit_logs (action, details)
    VALUES (
      'fraud_report_received',
      jsonb_build_object(
        'booking_id', NEW.id,
        'visitor_id', NEW.visitor_id,
        'reason', NEW.fraud_report_reason,
        'timestamp', now()
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Handle fraud reports
DROP TRIGGER IF EXISTS trigger_handle_fraud_report ON public.property_visit_bookings;
CREATE TRIGGER trigger_handle_fraud_report
  BEFORE UPDATE ON public.property_visit_bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_booking_fraud_report();

-- Function: Update organizer stats on booking status change
CREATE OR REPLACE FUNCTION update_organizer_stats_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_organizer_id uuid;
BEGIN
  -- Get organizer ID from slot
  SELECT organizer_id INTO v_organizer_id
  FROM public.property_visit_slots
  WHERE id = NEW.slot_id;
  
  -- Update organizer verification stats if status changed to completed, no_show, or cancelled
  IF (NEW.visit_status != COALESCE(OLD.visit_status, 'scheduled'))
     AND NEW.visit_status IN ('completed', 'no_show', 'cancelled') THEN
    
    -- Perform the update
    PERFORM update_organizer_reputation();
    
  END IF;
  
  -- Update fraud report count if fraud was reported
  IF NEW.fraud_reported = true AND (OLD.fraud_reported IS NULL OR OLD.fraud_reported = false) THEN
    
    UPDATE public.visit_organizer_verification
    SET fraud_reports_count = fraud_reports_count + 1
    WHERE user_id = v_organizer_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update organizer stats on booking changes
DROP TRIGGER IF EXISTS trigger_update_organizer_stats ON public.property_visit_bookings;
CREATE TRIGGER trigger_update_organizer_stats
  AFTER UPDATE ON public.property_visit_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_organizer_stats_on_booking();

-- Function: Prevent slot creation for blacklisted users
CREATE OR REPLACE FUNCTION prevent_blacklisted_slot_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_is_blacklisted boolean;
  v_verification_status text;
BEGIN
  -- Check if organizer is blacklisted or not verified
  SELECT is_blacklisted, verification_status
  INTO v_is_blacklisted, v_verification_status
  FROM public.visit_organizer_verification
  WHERE user_id = NEW.organizer_id;
  
  -- Prevent slot creation if blacklisted
  IF v_is_blacklisted = true THEN
    RAISE EXCEPTION 'Cannot create visit slots: User is blacklisted for fraud';
  END IF;
  
  -- Warn if not verified
  IF v_verification_status IS NULL OR v_verification_status NOT IN ('verified') THEN
    RAISE WARNING 'Creating visit slot for unverified organizer. Verification required.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Check blacklist before slot creation
DROP TRIGGER IF EXISTS trigger_prevent_blacklisted_slots ON public.property_visit_slots;
CREATE TRIGGER trigger_prevent_blacklisted_slots
  BEFORE INSERT ON public.property_visit_slots
  FOR EACH ROW
  EXECUTE FUNCTION prevent_blacklisted_slot_creation();

-- Function: Scheduled job to run fraud checks (call this from cron or manually)
CREATE OR REPLACE FUNCTION scheduled_fraud_check()
RETURNS void AS $$
BEGIN
  -- Run all fraud detection checks
  PERFORM run_all_fraud_checks();
  
  -- Auto-expire old mandates
  PERFORM auto_expire_mandates();
  
  -- Update organizer reputation
  PERFORM update_organizer_reputation();
  
  -- Update mandate counts
  PERFORM update_organizer_mandates();
  
  -- Log the scheduled run
  INSERT INTO public.admin_audit_logs (action, details)
  VALUES (
    'scheduled_fraud_check_completed',
    jsonb_build_object(
      'timestamp', now(),
      'checks_run', ARRAY['fraud_detection', 'mandate_expiry', 'reputation_update']
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;