-- Backups table for the admin "Sauvegardes" screen.
-- The admin UI and API already referenced a `backups` table that was never
-- created by a migration, so every request against it failed at runtime.

create table if not exists backups (
  id           text        primary key,
  file_name    text        not null,
  status       text        not null default 'running' check (status in ('running', 'completed', 'failed')),
  size         text,
  storage_path text,
  type         text        not null default 'manual' check (type in ('manual', 'scheduled')),
  error_message text,
  created_by   text        references users(id) on delete set null,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_backups_created_at on backups (created_at desc);
create index if not exists idx_backups_status on backups (status);

alter table backups enable row level security;

create policy "backups_admin_all"
  on backups for all
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role = 'ADMIN')
  )
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role = 'ADMIN')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backups', 'backups', false, 52428800, array['application/json']::text[])
on conflict (id) do nothing;

drop policy if exists "backups_bucket_admin_select" on storage.objects;
create policy "backups_bucket_admin_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'backups'
    and exists (select 1 from users where id = (select auth.uid()::text) and role = 'ADMIN')
  );

drop policy if exists "backups_bucket_admin_insert" on storage.objects;
create policy "backups_bucket_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'backups'
    and exists (select 1 from users where id = (select auth.uid()::text) and role = 'ADMIN')
  );

drop policy if exists "backups_bucket_admin_delete" on storage.objects;
create policy "backups_bucket_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'backups'
    and exists (select 1 from users where id = (select auth.uid()::text) and role = 'ADMIN')
  );
