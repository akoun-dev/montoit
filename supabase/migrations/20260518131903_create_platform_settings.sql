-- 003_platform_settings.sql
-- Key-value store for platform-wide configuration settings.

create table if not exists platform_settings (
  id           text        primary key,
  key          text        not null unique,
  value        text        not null,
  description  text,
  updated_at   timestamptz not null default now()
);

create index if not exists idx_platform_settings_key on platform_settings (key);

alter table platform_settings enable row level security;

create trigger trg_platform_settings_updated_at
  before update on platform_settings
  for each row
  execute function update_updated_at_column();

-- rls policies for platform settings
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "platform_settings_select_all"
  on platform_settings for select
  to authenticated
  using (true);

create policy "platform_settings_insert_admin"
  on platform_settings for insert
  to authenticated
  with check (exists (select 1 from users where id = (select auth.uid()::text) and role = 'ADMIN'));

create policy "platform_settings_update_admin"
  on platform_settings for update
  to authenticated
  using (exists (select 1 from users where id = (select auth.uid()::text) and role = 'ADMIN'))
  with check (exists (select 1 from users where id = (select auth.uid()::text) and role = 'ADMIN'));
