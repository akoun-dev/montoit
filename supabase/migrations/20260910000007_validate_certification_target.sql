-- certifications.type = 'AGENCY' identifies its target through user_id
-- (agencies are plain `users` rows with role = 'AGENCE', there is no
-- separate agencies table), but nothing enforced that the certified user
-- actually holds that role, nor that a PROPERTY certification's property_id
-- actually belongs to the certified user. Enforce both at the DB level so
-- a certification can never silently point at the wrong entity, regardless
-- of which route creates it.
create or replace function validate_certification_target()
returns trigger
language plpgsql
as $$
declare
  target_role user_role;
  prop_owner_id text;
begin
  if new.type = 'AGENCY' then
    select role into target_role from users where id = new.user_id;
    if target_role is distinct from 'AGENCE' then
      raise exception 'AGENCY certification target must be a user with role AGENCE';
    end if;
  end if;

  if new.type = 'PROPERTY' and new.property_id is not null then
    select owner_id into prop_owner_id from properties where id = new.property_id;
    if prop_owner_id is distinct from new.user_id then
      raise exception 'PROPERTY certification property_id must belong to the certified user';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_certification_target on certifications;
create trigger trg_validate_certification_target
  before insert or update of type, user_id, property_id on certifications
  for each row
  execute function validate_certification_target();
