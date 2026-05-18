-- 014_notification_preferences.sql
-- Per-user notification toggles. All default to true except promotions.

create table if not exists notification_preferences (
  id              text        primary key,
  user_id         text        not null unique references users(id) on delete cascade,
  messages        boolean     not null default true,
  dossier_updates boolean     not null default true,
  visit_reminders boolean     not null default true,
  payment_alerts  boolean     not null default true,
  promotions      boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_notification_preferences_user_id on notification_preferences (user_id);

alter table notification_preferences enable row level security;

create trigger trg_notification_preferences_updated_at
  before update on notification_preferences
  for each row
  execute function update_updated_at_column();

-- rls policies for notification preferences
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "notification_preferences_select_own"
  on notification_preferences for select
  to authenticated
  using ((select auth.uid()::text) = user_id);

create policy "notification_preferences_insert_own"
  on notification_preferences for insert
  to authenticated
  with check ((select auth.uid()::text) = user_id);

create policy "notification_preferences_update_own"
  on notification_preferences for update
  to authenticated
  using ((select auth.uid()::text) = user_id)
  with check ((select auth.uid()::text) = user_id);
