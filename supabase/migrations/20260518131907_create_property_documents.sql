-- 007_property_documents.sql
-- Property-related documents such as diagnostics (DPE, asbestos, etc.),
-- insurance certificates, and building permits.

create table if not exists property_documents (
  id           text             primary key,
  name         text             not null,
  type         property_doc_type not null,
  url          text             not null,
  description  text,
  expiry_date  timestamptz,
  created_at   timestamptz      not null default now(),
  updated_at   timestamptz      not null default now(),
  property_id  text             not null references properties(id) on delete cascade
);

create index if not exists idx_property_documents_property_id on property_documents (property_id);
create index if not exists idx_property_documents_type on property_documents (type);
create index if not exists idx_property_documents_expiry on property_documents (expiry_date);

alter table property_documents enable row level security;

create trigger trg_property_documents_updated_at
  before update on property_documents
  for each row
  execute function update_updated_at_column();

-- rls policies for property documents
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "property_documents_select_anon"
  on property_documents for select
  to anon
  using (true);

create policy "property_documents_select_auth"
  on property_documents for select
  to authenticated
  using (true);

create policy "property_documents_insert_own"
  on property_documents for insert
  to authenticated
  with check (
    exists (
      select 1 from properties
      where id = property_id and owner_id = (select auth.uid()::text)
    )
  );

create policy "property_documents_update_own"
  on property_documents for update
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

create policy "property_documents_delete_own"
  on property_documents for delete
  to authenticated
  using (
    exists (
      select 1 from properties
      where id = property_id and owner_id = (select auth.uid()::text)
    )
  );
