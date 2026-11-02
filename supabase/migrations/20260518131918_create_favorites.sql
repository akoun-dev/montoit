-- 018_favorites.sql
-- Saved/favorited properties by users (wishlist).

create table if not exists favorites (
  id          text        primary key,
  created_at  timestamptz not null default now(),
  user_id     text        not null references users(id) on delete cascade,
  property_id text        not null references properties(id) on delete cascade
);

-- each user can favorite a property only once
create unique index if not exists idx_favorites_user_property on favorites (user_id, property_id);
create index if not exists idx_favorites_user_id on favorites (user_id);
create index if not exists idx_favorites_property_id on favorites (property_id);

alter table favorites enable row level security;

-- rls policies for favorites
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "favorites_select_own"
  on favorites for select
  to authenticated
  using ((select auth.uid()::text) = user_id);

create policy "favorites_insert_own"
  on favorites for insert
  to authenticated
  with check ((select auth.uid()::text) = user_id);

create policy "favorites_delete_own"
  on favorites for delete
  to authenticated
  using ((select auth.uid()::text) = user_id);
