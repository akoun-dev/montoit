-- Migration: Add review request tracking to lease_contracts
-- Description: Track automatic review requests sent for terminated/ended leases
-- Sprint 10: Clôture & confiance - Déclenchement automatique de notation

-- Add columns to track review requests
ALTER TABLE public.lease_contracts
  ADD COLUMN IF NOT EXISTS review_request_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_request_sent_at timestamp with time zone;

-- Add index for efficient querying of contracts needing review requests
CREATE INDEX IF NOT EXISTS idx_lease_contracts_review_request_sent
  ON public.lease_contracts(review_request_sent)
  WHERE review_request_sent = false AND archived_at IS NULL;

-- Add comments
COMMENT ON COLUMN public.lease_contracts.review_request_sent IS 'Indicates if review requests have been sent to both parties';
COMMENT ON COLUMN public.lease_contracts.review_request_sent_at IS 'Timestamp when review requests were sent';
