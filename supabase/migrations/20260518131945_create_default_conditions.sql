-- Migration: Create default_conditions table for owner rental preferences
-- This table stores default rental conditions per owner (caution, policies, etc.)
-- Each owner gets a single row referenced by a composite key `owner_default_conditions_{userId}`

create table if not exists default_conditions (
  key       text        primary key,
  value     jsonb       not null default '{}'::jsonb,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for faster lookup by key prefix (owner_default_conditions_*)
create index if not exists idx_default_conditions_key
  on default_conditions (key);

-- Trigger to auto-update updated_at
create trigger trg_default_conditions_updated_at
  before update on default_conditions
  for each row
  execute function update_updated_at_column();

-- Enable RLS
alter table default_conditions enable row level security;

-- Policy: users can read their own conditions (key prefix contains their user ID)
create policy "default_conditions_select_own"
  on default_conditions for select
  to authenticated
  using (key like 'owner_default_conditions_' || auth.uid() || '%');

-- Policy: users can insert their own conditions
create policy "default_conditions_insert_own"
  on default_conditions for insert
  to authenticated
  with check (key like 'owner_default_conditions_' || auth.uid() || '%');

-- Policy: users can update their own conditions
create policy "default_conditions_update_own"
  on default_conditions for update
  to authenticated
  using (key like 'owner_default_conditions_' || auth.uid() || '%')
  with check (key like 'owner_default_conditions_' || auth.uid() || '%');
