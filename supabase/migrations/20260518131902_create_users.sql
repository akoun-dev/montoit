-- 002_users.sql
-- Main user entity for the Mon Toit platform.
-- Supports roles: LOCATAIRE (tenant), PROPRIETAIRE (owner), AGENCE (agency),
-- ADMIN, TIERS_CONFIANCE (trusted third party).
-- KYC fields for identity verification via ONECI and NeoFace.
-- This table mirrors Supabase auth.users but adds application-specific profile data.

-- helper function shared by all later updated_at triggers.
-- it is defined here because users is the first migration that actually needs it.
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists users (
  id                  text        primary key,
  phone               text        unique,
  email               text        not null unique,
  password_hash       text        not null,
  first_name          text        not null,
  last_name           text        not null,
  role                user_role   not null default 'LOCATAIRE',
  active_role         user_role   not null default 'LOCATAIRE',
  avatar_url          text,
  is_active           boolean     not null default true,
  is_email_verified   boolean     not null default false,
  is_phone_verified   boolean     not null default false,
  gender              text,
  city                text,
  address             text,
  birth_date          timestamptz,
  nni                 text,
  neoface_verified    boolean     not null default false,
  neoface_verified_at timestamptz,
  kyc_document_id     text,
  oneci_verified      boolean     not null default false,
  oneci_verified_at   timestamptz,
  password_updated_at timestamptz,
  bio                 text,
  company_name        text,
  show_phone          boolean     not null default true,
  show_email          boolean     not null default false,
  two_factor_enabled  boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- indexes for common query patterns
create index if not exists idx_users_role on users (role);
create index if not exists idx_users_phone on users (phone);
create index if not exists idx_users_email on users (email);

-- enable row level security
alter table users enable row level security;

-- trigger to auto-update updated_at
create trigger trg_users_updated_at
  before update on users
  for each row
  execute function update_updated_at_column();

-- rls policies for users
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "users_select_own"
  on users for select
  to authenticated
  using ((select auth.uid()::text) = id);

-- allows unauthenticated user registration
create policy "users_insert_anon"
  on users for insert
  to anon
  with check (true);

create policy "users_update_own"
  on users for update
  to authenticated
  using ((select auth.uid()::text) = id)
  with check ((select auth.uid()::text) = id);
