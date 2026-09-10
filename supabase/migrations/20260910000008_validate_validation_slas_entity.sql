-- validation_slas.entity_id is a polymorphic reference (keyed by
-- entity_type) with no foreign key at all, so a typo'd or stale entity_id
-- silently matches nothing instead of failing loudly. It was also never
-- populated outside of seed data: no route ever inserted a row here, so the
-- SLA dashboard and overdue-detection queries had nothing real to read.
-- (src/lib/validation-sla.ts now opens a row when a rental file or owner
-- dossier is submitted for TC review.)
--
-- Add a trigger that validates entity_id against the right table for each
-- entity_type: RENTAL_FILE -> rental_files, OWNER_PROFILE -> owner_files,
-- AGENCY -> users (an AGENCE-role account, agencies have no dedicated table).
create or replace function validate_validation_sla_entity()
returns trigger
language plpgsql
as $$
begin
  if new.entity_type = 'RENTAL_FILE' then
    if not exists (select 1 from rental_files where id = new.entity_id) then
      raise exception 'validation_slas.entity_id must reference an existing rental_files row for entity_type RENTAL_FILE';
    end if;
  elsif new.entity_type = 'OWNER_PROFILE' then
    if not exists (select 1 from owner_files where id = new.entity_id) then
      raise exception 'validation_slas.entity_id must reference an existing owner_files row for entity_type OWNER_PROFILE';
    end if;
  elsif new.entity_type = 'AGENCY' then
    if not exists (select 1 from users where id = new.entity_id and role = 'AGENCE') then
      raise exception 'validation_slas.entity_id must reference an existing AGENCE user for entity_type AGENCY';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_validation_sla_entity on validation_slas;
create trigger trg_validate_validation_sla_entity
  before insert or update of entity_type, entity_id on validation_slas
  for each row
  execute function validate_validation_sla_entity();
