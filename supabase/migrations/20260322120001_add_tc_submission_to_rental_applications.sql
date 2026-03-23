-- Migration: Add TC submission status to rental_applications
-- Description: Integration with TC (Tiers de Confiance) workflow
-- Sprint 7: Soumission au TC

-- Add tc_submission_status column
ALTER TABLE public.rental_applications
ADD COLUMN IF NOT EXISTS tc_submission_status text
CHECK (tc_submission_status IS NULL OR tc_submission_status = ANY (ARRAY['pending'::text, 'submitted'::text, 'in_review'::text, 'approved'::text, 'rejected'::text]));

-- Add verification_application_id column
ALTER TABLE public.rental_applications
ADD COLUMN IF NOT EXISTS verification_application_id uuid REFERENCES public.verification_applications(id) ON DELETE SET NULL;

-- Create index for tc_submission_status
CREATE INDEX IF NOT EXISTS idx_rental_applications_tc_submission_status ON public.rental_applications(tc_submission_status);

-- Create index for verification_application_id
CREATE INDEX IF NOT EXISTS idx_rental_applications_verification_application_id ON public.rental_applications(verification_application_id);

-- Comments
COMMENT ON COLUMN public.rental_applications.tc_submission_status IS 'TC submission status: pending, submitted, in_review, approved, rejected';
COMMENT ON COLUMN public.rental_applications.verification_application_id IS 'Reference to the verification application (dossier) submitted to TC';

-- Function to update TC status when verification status changes
CREATE OR REPLACE FUNCTION sync_tc_status_from_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Update rental_applications tc_submission_status when verification_applications status changes
  UPDATE public.rental_applications
  SET tc_submission_status = CASE
    WHEN NEW.status = 'pending' THEN 'submitted'::text
    WHEN NEW.status = 'in_review' THEN 'in_review'::text
    WHEN NEW.status = 'approved' THEN 'approved'::text
    WHEN NEW.status = 'rejected' THEN 'rejected'::text
    WHEN NEW.status = 'more_info_requested' THEN 'in_review'::text
    ELSE NULL
  END
  WHERE verification_application_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic sync
DROP TRIGGER IF EXISTS on_verification_status_change ON public.verification_applications;
CREATE TRIGGER on_verification_status_change
AFTER UPDATE OF status ON public.verification_applications
FOR EACH ROW
EXECUTE FUNCTION sync_tc_status_from_verification();
