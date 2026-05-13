-- Migration: Add signature reminder tracking to lease_contracts
-- Description: Track automatic signature reminders sent for pending contracts
-- Sprint 9: Contractualisation - Relance automatique

-- Add columns to track signature reminders
ALTER TABLE public.lease_contracts
  ADD COLUMN IF NOT EXISTS last_signature_reminder timestamp with time zone,
  ADD COLUMN IF NOT EXISTS signature_reminder_count integer DEFAULT 0;

-- Add index for efficient querying of contracts needing reminders
CREATE INDEX IF NOT EXISTS idx_lease_contracts_status_updated_at
  ON public.lease_contracts(status, updated_at)
  WHERE status = 'pending_signature' AND archived_at IS NULL;

-- Add comments
COMMENT ON COLUMN public.lease_contracts.last_signature_reminder IS 'Timestamp of the last automatic signature reminder sent';
COMMENT ON COLUMN public.lease_contracts.signature_reminder_count IS 'Number of automatic signature reminders sent (0, 1, 2, or 3)';
