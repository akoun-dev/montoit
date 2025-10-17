/*
  # Create Agency Mandates Table

  1. New Tables
    - `agency_mandates`
      - `id` (uuid, primary key) - Unique identifier
      - `property_id` (uuid, foreign key) - Property being managed
      - `agency_id` (uuid, foreign key) - Agency managing the property
      - `owner_id` (uuid, foreign key) - Property owner granting the mandate
      - `status` (text) - Mandate status: 'pending', 'active', 'expired', 'cancelled'
      - `start_date` (timestamptz) - When mandate starts
      - `end_date` (timestamptz) - When mandate expires
      - `commission_rate` (numeric) - Commission percentage
      - `mandate_document_url` (text) - URL to signed mandate document
      - `terms` (text) - Terms and conditions
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `agency_mandates` table
    - Add policy for property owners to view their mandates
    - Add policy for agencies to view their mandates
    - Add policy for owners to create mandates
    - Add policy for both parties to update mandates

  3. Indexes
    - Index on property_id
    - Index on agency_id
    - Index on owner_id
    - Index on status
    - Index on end_date for active mandates
*/

-- Create agency_mandates table
CREATE TABLE IF NOT EXISTS public.agency_mandates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Property and parties
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES auth.users(id),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  
  -- Mandate details
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  commission_rate numeric(5,2) CHECK (commission_rate >= 0 AND commission_rate <= 100),
  
  -- Documents
  mandate_document_url text,
  terms text,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agency_mandates_property ON public.agency_mandates(property_id);
CREATE INDEX IF NOT EXISTS idx_agency_mandates_agency ON public.agency_mandates(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_mandates_owner ON public.agency_mandates(owner_id);
CREATE INDEX IF NOT EXISTS idx_agency_mandates_status ON public.agency_mandates(status);
CREATE INDEX IF NOT EXISTS idx_agency_mandates_active ON public.agency_mandates(status, end_date) 
  WHERE status = 'active';

-- Enable RLS
ALTER TABLE public.agency_mandates ENABLE ROW LEVEL SECURITY;

-- Policy: Property owners can view their mandates
CREATE POLICY "Owners can view their mandates"
  ON public.agency_mandates FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Policy: Agencies can view their mandates
CREATE POLICY "Agencies can view their mandates"
  ON public.agency_mandates FOR SELECT
  TO authenticated
  USING (agency_id = auth.uid());

-- Policy: Property owners can create mandates for their properties
CREATE POLICY "Owners can create mandates"
  ON public.agency_mandates FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.properties 
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

-- Policy: Both parties can update mandates
CREATE POLICY "Parties can update mandates"
  ON public.agency_mandates FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR agency_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() OR agency_id = auth.uid());

-- Function: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_agency_mandates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at on row update
DROP TRIGGER IF EXISTS trigger_update_agency_mandates_updated_at ON public.agency_mandates;
CREATE TRIGGER trigger_update_agency_mandates_updated_at
  BEFORE UPDATE ON public.agency_mandates
  FOR EACH ROW
  EXECUTE FUNCTION update_agency_mandates_updated_at();

-- Function: Auto-expire mandates
CREATE OR REPLACE FUNCTION auto_expire_mandates()
RETURNS void AS $$
BEGIN
  UPDATE public.agency_mandates
  SET status = 'expired'
  WHERE status = 'active'
  AND end_date < now();
END;
$$ LANGUAGE plpgsql;