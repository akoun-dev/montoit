-- Migration: Fix properties.managed_by_agency foreign key
-- Description: The managed_by_agency column references agencies(id) which doesn't exist.
--              Agencies are stored in profiles table with user_type='agency'.
--              This migration updates the foreign key to reference profiles(id).

-- First, drop the existing foreign key constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'properties_managed_by_agency_fkey'
    ) THEN
        ALTER TABLE public.properties
        DROP CONSTRAINT properties_managed_by_agency_fkey;
    END IF;
END $$;

-- Add the correct foreign key constraint referencing profiles
ALTER TABLE public.properties
ADD CONSTRAINT properties_managed_by_agency_fkey
FOREIGN KEY (managed_by_agency)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN public.properties.managed_by_agency IS
'ID of the agency managing this property (references profiles.id where user_type=agency)';
