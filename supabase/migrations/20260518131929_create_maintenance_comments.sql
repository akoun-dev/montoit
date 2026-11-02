-- 029_maintenance_comments.sql
-- Comments/updates on maintenance requests between tenant, owner, and TC.

create table if not exists maintenance_comments (
  id                     text        primary key,
  content                text        not null,
  created_at             timestamptz not null default now(),
  maintenance_request_id text        not null references maintenance_requests(id) on delete cascade,
  author_id              text        not null references users(id) on delete cascade
);

create index if not exists idx_maintenance_comments_request_id on maintenance_comments (maintenance_request_id);
create index if not exists idx_maintenance_comments_author_id on maintenance_comments (author_id);
create index if not exists idx_maintenance_comments_created_at on maintenance_comments (created_at);

alter table maintenance_comments enable row level security;

-- rls policies for maintenance comments
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "maintenance_comments_select_participant"
  on maintenance_comments for select
  to authenticated
  using (
    exists (
      select 1 from maintenance_requests mr
      join leases l on l.id = mr.lease_id
      where mr.id = maintenance_request_id
        and (select auth.uid()::text) in (mr.tenant_id, l.owner_id)
    )
  );

create policy "maintenance_comments_insert_participant"
  on maintenance_comments for insert
  to authenticated
  with check (
    exists (
      select 1 from maintenance_requests mr
      join leases l on l.id = mr.lease_id
      where mr.id = maintenance_request_id
        and (select auth.uid()::text) in (mr.tenant_id, l.owner_id)
    )
  );
