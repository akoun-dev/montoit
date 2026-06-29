create table applications (
  id                text        primary key,
  rental_file_id    text        not null references rental_files(id) on delete cascade,
  property_id       text        not null references properties(id) on delete cascade,
  tenant_id         text        not null references users(id) on delete cascade,
  status            rental_file_status not null default 'DRAFT',
  motivation        text,
  employment_type   text,
  monthly_income    real,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_applications_tenant_id on applications(tenant_id);
create index idx_applications_property_id on applications(property_id);
create index idx_applications_rental_file_id on applications(rental_file_id);

alter table applications enable row level security;

-- RLS policies for applications
create policy applications_select_own
  on applications for select
  using (tenant_id = auth.uid());

create policy applications_select_tc_admin
  on applications for select
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and (users.role = 'TIERS_CONFIANCE' or users.role = 'ADMIN')
    )
  );

create policy applications_insert_own
  on applications for insert
  with check (tenant_id = auth.uid());

create policy applications_update_own
  on applications for update
  using (tenant_id = auth.uid());

create policy applications_update_tc_admin
  on applications for update
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and (users.role = 'TIERS_CONFIANCE' or users.role = 'ADMIN')
    )
  );

-- Empêche les candidatures en double sur le même bien
create unique index if not exists idx_applications_active_per_property
  on applications (tenant_id, property_id) where status in ('DRAFT', 'SUBMITTED');

alter publication supabase_realtime add table applications;
