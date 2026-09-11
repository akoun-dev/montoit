-- ONECI/RNPP verification results were only ever written as a single
-- boolean+timestamp pair on users (oneci_verified/oneci_verified_at),
-- overwritten on every new attempt — unlike NeoFace, which keeps a full
-- history per attempt in facial_verifications (score, provider response,
-- failure reason). A failed ONECI attempt left no trace at all. Mirror
-- facial_verifications so every ONECI decision (match, face auth, or a
-- manual TC override) is historized the same way.

create table if not exists oneci_verifications (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            text        not null references users(id) on delete cascade,
  method             text        not null, -- 'MATCH', 'FACE_AUTH', 'MANUAL_TC'
  status             text        not null, -- 'PASSED', 'FAILED'
  score              numeric,
  provider_response  jsonb,
  failure_reason     text,
  created_at         timestamptz not null default now()
);

create index if not exists idx_oneci_verifications_user_id on oneci_verifications (user_id);
create index if not exists idx_oneci_verifications_method on oneci_verifications (method);
create index if not exists idx_oneci_verifications_created_at on oneci_verifications (created_at);

alter table oneci_verifications enable row level security;

create policy "oneci_verifications_service_role"
  on oneci_verifications for all
  to service_role
  using (true)
  with check (true);

create policy "oneci_verifications_select_own"
  on oneci_verifications for select
  to authenticated
  using ((select auth.uid()::text) = user_id);

create policy "oneci_verifications_select_tc"
  on oneci_verifications for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );
