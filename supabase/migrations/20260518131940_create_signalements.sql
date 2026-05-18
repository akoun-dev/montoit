-- 039_signalements.sql
-- Content/user reporting system. Users can report properties, users,
-- reviews, or messages for inappropriate content, fraud, spam, etc.

create table if not exists signalements (
  id          text               primary key,
  reason      signalement_reason not null,
  description text               not null,
  status      signalement_status not null default 'PENDING',
  admin_notes text,
  resolution  text,
  entity_type text               not null,
  entity_id   text               not null,
  created_at  timestamptz        not null default now(),
  updated_at  timestamptz        not null default now(),
  reporter_id text               not null references users(id) on delete cascade,
  handled_by_id text             references users(id) on delete set null
);

create index if not exists idx_signalements_reporter_id on signalements (reporter_id);
create index if not exists idx_signalements_status on signalements (status);
create index if not exists idx_signalements_entity_type on signalements (entity_type);
create index if not exists idx_signalements_created_at on signalements (created_at);

alter table signalements enable row level security;

create trigger trg_signalements_updated_at
  before update on signalements
  for each row
  execute function update_updated_at_column();

-- rls policies for signalements
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "signalements_select_admin"
  on signalements for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role = 'ADMIN')
  );

create policy "signalements_insert_auth"
  on signalements for insert
  to authenticated
  with check ((select auth.uid()::text) = reporter_id);

create policy "signalements_update_admin"
  on signalements for update
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role = 'ADMIN')
  )
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role = 'ADMIN')
  );
