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
