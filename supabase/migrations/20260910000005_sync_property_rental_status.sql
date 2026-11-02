-- Centralize the properties.rental_status <-> leases.status sync in a single
-- trigger. Several routes (rental-files/[id]/action, leases/[id]/sign,
-- leases/[id]/cancel, leases/[id]/terminate) already set rental_status by
-- hand and keep working as before — this trigger is a backstop so any lease
-- transition (including ones created directly, e.g. via leases/create,
-- which never flipped the property to "loue") reliably keeps the property's
-- availability in sync instead of depending on every call site remembering
-- to do it.
create or replace function sync_property_rental_status()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('PENDING_SIGNATURE', 'ACTIVE') then
    update properties
      set rental_status = 'loue', updated_at = now()
      where id = new.property_id and rental_status <> 'loue';
  elsif new.status in ('CANCELLED', 'TERMINATED', 'EXPIRED') then
    -- Only release the property if no other lease still holds it.
    if not exists (
      select 1 from leases
      where property_id = new.property_id
        and status in ('PENDING_SIGNATURE', 'ACTIVE')
        and id <> new.id
    ) then
      update properties
        set rental_status = 'disponible', updated_at = now()
        where id = new.property_id and rental_status <> 'disponible';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_property_rental_status on leases;
create trigger trg_sync_property_rental_status
  after insert or update of status on leases
  for each row
  execute function sync_property_rental_status();
