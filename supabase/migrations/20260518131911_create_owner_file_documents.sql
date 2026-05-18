-- 011_owner_file_documents.sql
-- Documents submitted as part of an owner verification dossier.

create table if not exists owner_file_documents (
  id           text            primary key,
  type         document_type   not null,
  url          text            not null,
  name         text            not null,
  status       document_status not null default 'PENDING',
  tc_comment   text,
  created_at   timestamptz     not null default now(),
  owner_file_id text           not null references owner_files(id) on delete cascade
);

create index if not exists idx_owner_file_docs_owner_file_id on owner_file_documents (owner_file_id);
create index if not exists idx_owner_file_docs_status on owner_file_documents (status);

alter table owner_file_documents enable row level security;

-- rls policies for owner file documents
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "owner_file_documents_select_own"
  on owner_file_documents for select
  to authenticated
  using (
    exists (
      select 1 from owner_files
      where id = owner_file_id and owner_id = (select auth.uid()::text)
    )
  );

create policy "owner_file_documents_select_tc"
  on owner_file_documents for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "owner_file_documents_insert_own"
  on owner_file_documents for insert
  to authenticated
  with check (
    exists (
      select 1 from owner_files
      where id = owner_file_id and owner_id = (select auth.uid()::text)
    )
  );

create policy "owner_file_documents_update_tc"
  on owner_file_documents for update
  to authenticated
  using (exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN')))
  with check (exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN')));

create policy "owner_file_documents_delete_own"
  on owner_file_documents for delete
  to authenticated
  using (
    exists (
      select 1 from owner_files
      where id = owner_file_id and owner_id = (select auth.uid()::text)
    )
  );
