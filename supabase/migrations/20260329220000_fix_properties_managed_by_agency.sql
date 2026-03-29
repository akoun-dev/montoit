-- Migration: Fix managed_by_agency for properties from active mandates
-- Description: Update properties.managed_by_agency based on active agency mandates

-- Update all properties that have an active agency mandate but wrong/null managed_by_agency
UPDATE public.properties p
SET managed_by_agency = am.agency_id
FROM public.agency_mandates am
WHERE p.id = am.property_id
  AND am.status = 'active'
  AND (p.managed_by_agency IS NULL OR p.managed_by_agency != am.agency_id);

-- Log the results
DO $$
DECLARE
  updated_count integer;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % properties with correct managed_by_agency', updated_count;
END $$;
