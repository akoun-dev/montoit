-- Migration: Add RLS policies for agency_mandates signature updates
-- Description: Allow agencies and owners to update their own signatures on mandates

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view agency_mandates where they are owner" ON public.agency_mandates;
DROP POLICY IF EXISTS "Users can view agency_mandates where they are agency" ON public.agency_mandates;
DROP POLICY IF EXISTS "Users can update owner signature" ON public.agency_mandates;
DROP POLICY IF EXISTS "Users can update agency signature" ON public.agency_mandates;

-- Agencies can view mandates where they are the agency
CREATE POLICY "Agencies can view mandates where they are agency"
  ON public.agency_mandates
  FOR SELECT
  TO authenticated
  USING (agency_id = auth.uid());

-- Owners can view mandates where they are the owner
CREATE POLICY "Owners can view mandates where they are owner"
  ON public.agency_mandates
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Owners can update their own signature (owner_signed_at)
CREATE POLICY "Owners can update their signature"
  ON public.agency_mandates
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Agencies can update their own signature (agency_signed_at)
CREATE POLICY "Agencies can update their signature"
  ON public.agency_mandates
  FOR UPDATE
  TO authenticated
  USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

COMMENT ON POLICY "Owners can update their signature" ON public.agency_mandates IS
  'Allow property owners to sign mandates where they are the owner';

COMMENT ON POLICY "Agencies can update their signature" ON public.agency_mandates IS
  'Allow agencies to sign mandates where they are the agency';
