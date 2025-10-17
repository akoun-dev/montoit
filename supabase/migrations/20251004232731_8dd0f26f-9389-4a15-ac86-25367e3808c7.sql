-- Add certification columns to leases table
ALTER TABLE public.leases
ADD COLUMN IF NOT EXISTS certification_status TEXT DEFAULT 'not_requested',
ADD COLUMN IF NOT EXISTS certification_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS certification_notes TEXT,
ADD COLUMN IF NOT EXISTS certified_by UUID REFERENCES auth.users(id);

-- Add check constraint for certification status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'leases_certification_status_check'
  ) THEN
    ALTER TABLE public.leases
    ADD CONSTRAINT leases_certification_status_check 
    CHECK (certification_status IN ('not_requested', 'pending', 'certified', 'rejected'));
  END IF;
END $$;

-- Create index for certification queries
CREATE INDEX IF NOT EXISTS idx_leases_certification_status ON public.leases(certification_status);

-- Update RLS policies for certification workflow
DROP POLICY IF EXISTS "Admins peuvent certifier baux" ON public.leases;

CREATE POLICY "Admins peuvent certifier baux"
ON public.leases
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));