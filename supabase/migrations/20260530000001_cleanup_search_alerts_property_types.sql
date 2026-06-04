-- 20260530000001_cleanup_search_alerts_property_types.sql
-- Clean up search_alerts with invalid property_type values
-- Aligns existing data with the property_type enum (APPARTEMENT, MAISON, STUDIO, DUPLEX, PENTHOUSE, VILLA)

begin;

-- Fix typo: APPARTMENT → APPARTEMENT
update search_alerts
set property_type = 'APPARTEMENT',
    updated_at = now()
where property_type = 'APPARTMENT';

-- Fix English → French: HOUSE → MAISON
update search_alerts
set property_type = 'MAISON',
    updated_at = now()
where property_type = 'HOUSE';

-- Delete alerts with COMMERCIAL (no equivalent in the property_type enum)
delete from search_alerts
where property_type = 'COMMERCIAL';

commit;
