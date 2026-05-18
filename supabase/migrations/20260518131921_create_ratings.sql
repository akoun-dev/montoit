-- 021_ratings.sql
-- User reviews/ratings given after a lease experience (tenant <-> owner).
-- Score is 1-5, with optional comment and reply.

create table if not exists ratings (
  id          text        primary key,
  score       integer     not null,
  comment     text,
  reply       text,
  replied_at  timestamptz,
  property_id text        references properties(id) on delete set null,
  created_at  timestamptz not null default now(),
  lease_id    text        not null references leases(id) on delete cascade,
  from_user_id text       not null references users(id) on delete cascade,
  to_user_id   text       not null references users(id) on delete cascade
);

create index if not exists idx_ratings_lease_id on ratings (lease_id);
create index if not exists idx_ratings_to_user_id on ratings (to_user_id);
create index if not exists idx_ratings_from_user_id on ratings (from_user_id);
create index if not exists idx_ratings_property_id on ratings (property_id);

alter table ratings enable row level security;

-- rls policies for ratings
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "ratings_select_anon"
  on ratings for select
  to anon
  using (true);

create policy "ratings_select_auth"
  on ratings for select
  to authenticated
  using (true);

create policy "ratings_insert_participant"
  on ratings for insert
  to authenticated
  with check (
    exists (
      select 1 from leases
      where id = lease_id
        and (select auth.uid()::text) in (tenant_id, owner_id)
    )
  );

create policy "ratings_update_own"
  on ratings for update
  to authenticated
  using ((select auth.uid()::text) = from_user_id)
  with check ((select auth.uid()::text) = from_user_id);
