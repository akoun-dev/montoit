-- 004_otp_codes.sql
-- One-time password codes for authentication flows (login, email verify, password reset, bail signature).

create table if not exists otp_codes (
  id         text        primary key,
  phone      text,
  email      text,
  code       text        not null,
  type       otp_type    not null,
  expires_at timestamptz not null,
  is_used    boolean     not null default false,
  created_at timestamptz not null default now(),
  user_id    text        not null references users(id) on delete cascade
);

create index if not exists idx_otp_codes_phone_type on otp_codes (phone, type);
create index if not exists idx_otp_codes_email_type on otp_codes (email, type);
create index if not exists idx_otp_codes_code_phone on otp_codes (code, phone);
create index if not exists idx_otp_codes_code_email on otp_codes (code, email);

alter table otp_codes enable row level security;

-- rls policies for otp codes
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "otp_codes_select_own"
  on otp_codes for select
  to authenticated
  using ((select auth.uid()::text) = user_id);

create policy "otp_codes_insert_anon"
  on otp_codes for insert
  to anon
  with check (true);

create policy "otp_codes_insert_auth"
  on otp_codes for insert
  to authenticated
  with check ((select auth.uid()::text) = user_id);

create policy "otp_codes_update_own"
  on otp_codes for update
  to authenticated
  using ((select auth.uid()::text) = user_id)
  with check ((select auth.uid()::text) = user_id);
