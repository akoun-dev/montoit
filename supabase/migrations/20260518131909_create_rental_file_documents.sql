-- 009_rental_file_documents.sql
-- Documents submitted as part of a tenant rental application.
-- Each document has a validation status tracked by the TC reviewer.

create table if not exists rental_file_documents (
  id            text            primary key,
  type          document_type   not null,
  url           text            not null,
  name          text            not null,
  status        document_status not null default 'PENDING',
  tc_comment    text,
  created_at    timestamptz     not null default now(),
  rental_file_id text           not null references rental_files(id) on delete cascade
);

create index if not exists idx_rental_file_docs_rental_file_id on rental_file_documents (rental_file_id);
create index if not exists idx_rental_file_docs_status on rental_file_documents (status);

alter table rental_file_documents enable row level security;

-- rls policies for rental file documents
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "rental_file_documents_select_own"
  on rental_file_documents for select
  to authenticated
  using (
    exists (
      select 1 from rental_files
      where id = rental_file_id and tenant_id = (select auth.uid()::text)
    )
  );

create policy "rental_file_documents_select_tc"
  on rental_file_documents for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "rental_file_documents_insert_own"
  on rental_file_documents for insert
  to authenticated
  with check (
    exists (
      select 1 from rental_files
      where id = rental_file_id and tenant_id = (select auth.uid()::text)
    )
  );

create policy "rental_file_documents_update_tc"
  on rental_file_documents for update
  to authenticated
  using (exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN')))
  with check (exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN')));

create policy "rental_file_documents_delete_own"
  on rental_file_documents for delete
  to authenticated
  using (
    exists (
      select 1 from rental_files
      where id = rental_file_id and tenant_id = (select auth.uid()::text)
    )
  );
