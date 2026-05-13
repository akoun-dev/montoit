-- Migration: Fix agency_mandates agency_id foreign key
-- Description: Change agency_id FK from agencies(id) to profiles(id)
-- Reason: agencies table is not used, profiles with user_type='agency' is used instead

-- Drop the old foreign key constraint
ALTER TABLE public.agency_mandates
DROP CONSTRAINT IF EXISTS agency_mandates_agency_id_fkey;

-- Add the new foreign key constraint referencing profiles
ALTER TABLE public.agency_mandates
ADD CONSTRAINT agency_mandates_agency_id_fkey
FOREIGN KEY (agency_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update the RLS policy for agency users
DROP POLICY IF EXISTS "Agency users can view own mandates" ON public.agency_mandates;

CREATE POLICY "Agency users can view own mandates" ON public.agency_mandates
  FOR SELECT
  TO authenticated
  USING (agency_id = auth.uid());

-- Comment to clarify the change
COMMENT ON COLUMN public.agency_mandates.agency_id IS 'References profiles.id where user_type = ''agency''';
