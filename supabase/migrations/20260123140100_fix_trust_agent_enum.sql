-- Check and fix user_role enum
-- This migration checks if trust_agent is in the user_role enum and adds it if missing

do $$
begin
  -- Check if trust_agent exists in user_role enum
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'trust_agent'
    and enumtypid = (select oid from pg_type where typname = 'user_role')
  ) then
    -- Add trust_agent to the enum
    alter type user_role add value 'trust_agent';
  end if;
end
$$;
