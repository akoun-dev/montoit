-- No mechanism tied a listing's age to its published status — a property
-- could stay ACTIVE (and show up in public search) indefinitely, however
-- stale. Add an expiry date set whenever a property goes ACTIVE (via a
-- trigger, so it's set correctly regardless of which of the several
-- routes performs that transition — moderation, mandat signature, TC
-- verification, TC mission completion), and a scheduled job suspends
-- listings past their expiry.

alter table properties
  add column if not exists listing_expires_at timestamptz;

create or replace function set_property_listing_expiry()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'ACTIVE' and (TG_OP = 'INSERT' or old.status is distinct from 'ACTIVE') then
    new.listing_expires_at := now() + interval '90 days';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_property_listing_expiry on properties;
create trigger trg_set_property_listing_expiry
  before insert or update of status on properties
  for each row
  execute function set_property_listing_expiry();
