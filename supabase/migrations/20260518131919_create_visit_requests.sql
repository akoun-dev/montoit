-- 019_visit_requests.sql
-- Property visit requests by tenants to owners.
-- Supports counter-proposal workflow (date/time negotiation).

create table if not exists visit_requests (
  id                text                primary key,
  visit_type        visit_type          not null default 'PHYSICAL',
  requested_date    timestamptz         not null,
  time_slot         text                not null,
  status            visit_request_status not null default 'PENDING',
  counter_date      timestamptz,
  counter_time_slot text,
  owner_comment     text,
  tenant_message    text,
  assigned_agent_id text,
  created_at        timestamptz         not null default now(),
  updated_at        timestamptz         not null default now(),
  property_id       text                not null references properties(id) on delete cascade,
  tenant_id         text                not null references users(id) on delete cascade
);

create index if not exists idx_visit_requests_property_id on visit_requests (property_id);
create index if not exists idx_visit_requests_tenant_id on visit_requests (tenant_id);
create index if not exists idx_visit_requests_status on visit_requests (status);
create index if not exists idx_visit_requests_assigned_agent on visit_requests (assigned_agent_id);

-- Foreign key constraint for assigned_agent_id
alter table visit_requests add constraint fk_visit_requests_assigned_agent
  foreign key (assigned_agent_id) references users(id) on delete set null;

alter table visit_requests enable row level security;

create trigger trg_visit_requests_updated_at
  before update on visit_requests
  for each row
  execute function update_updated_at_column();

-- rls policies for visit requests
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "visit_requests_select_tenant"
  on visit_requests for select
  to authenticated
  using ((select auth.uid()::text) = tenant_id);

create policy "visit_requests_select_owner"
  on visit_requests for select
  to authenticated
  using (
    exists (
      select 1 from properties
      where id = property_id and owner_id = (select auth.uid()::text)
    )
  );

create policy "visit_requests_select_assigned_agent"
  on visit_requests for select
  to authenticated
  using ((select auth.uid()::text) = assigned_agent_id);

create policy "visit_requests_insert_own"
  on visit_requests for insert
  to authenticated
  with check ((select auth.uid()::text) = tenant_id);

create policy "visit_requests_update_owner"
  on visit_requests for update
  to authenticated
  using (
    exists (
      select 1 from properties
      where id = property_id and owner_id = (select auth.uid()::text)
    )
  )
  with check (
    exists (
      select 1 from properties
      where id = property_id and owner_id = (select auth.uid()::text)
    )
  );

create policy "visit_requests_update_own"
  on visit_requests for update
  to authenticated
  using ((select auth.uid()::text) = tenant_id)
  with check ((select auth.uid()::text) = tenant_id);

create policy "visit_requests_update_assigned_agent"
  on visit_requests for update
  to authenticated
  using ((select auth.uid()::text) = assigned_agent_id)
  with check ((select auth.uid()::text) = assigned_agent_id);
