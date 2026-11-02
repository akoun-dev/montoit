-- 040_signature_aliases.sql
-- CRYPTONEO / ANSUT electronic signature aliases.
-- Each user has one alias certificate for digital signing of leases and mandats.

create table if not exists signature_aliases (
  id                text        primary key,
  alias_certificat  text        not null unique,
  first_name        text        not null,
  last_name         text        not null,
  gender            text,
  email             text        not null,
  phone             text,
  organisation      text,
  type_piece        text        not null default 'CNI',
  hash_piece        text,
  certificate_data  text,
  is_active         boolean     not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  user_id           text        not null unique references users(id) on delete cascade
);

create index if not exists idx_signature_aliases_certificat on signature_aliases (alias_certificat);
create index if not exists idx_signature_aliases_user_id on signature_aliases (user_id);

alter table signature_aliases enable row level security;

create trigger trg_signature_aliases_updated_at
  before update on signature_aliases
  for each row
  execute function update_updated_at_column();

-- rls policies for signature aliases
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "signature_aliases_select_own"
  on signature_aliases for select
  to authenticated
  using ((select auth.uid()::text) = user_id);

create policy "signature_aliases_insert_own"
  on signature_aliases for insert
  to authenticated
  with check ((select auth.uid()::text) = user_id);

create policy "signature_aliases_update_own"
  on signature_aliases for update
  to authenticated
  using ((select auth.uid()::text) = user_id)
  with check ((select auth.uid()::text) = user_id);
