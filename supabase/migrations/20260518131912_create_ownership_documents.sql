-- 012_ownership_documents.sql
-- Property ownership proof documents (titre foncier, acte notarié, etc.).
-- Validated by Tiers de Confiance to confirm the owner's right to the property.

create table if not exists ownership_documents (
  id             text              primary key,
  type           ownership_doc_type not null,
  url            text              not null,
  name           text              not null,
  status         document_status   not null default 'PENDING',
  tc_comment     text,
  created_at     timestamptz       not null default now(),
  owner_id       text              not null references users(id) on delete cascade,
  reviewed_by_id text              references users(id) on delete set null
);

create index if not exists idx_ownership_documents_owner_id on ownership_documents (owner_id);
create index if not exists idx_ownership_documents_status on ownership_documents (status);

alter table ownership_documents enable row level security;

-- rls policies for ownership documents
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "ownership_documents_select_own"
  on ownership_documents for select
  to authenticated
  using ((select auth.uid()::text) = owner_id);

create policy "ownership_documents_select_tc"
  on ownership_documents for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "ownership_documents_insert_own"
  on ownership_documents for insert
  to authenticated
  with check ((select auth.uid()::text) = owner_id);

create policy "ownership_documents_update_tc"
  on ownership_documents for update
  to authenticated
  using (exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN')))
  with check (exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN')));

create policy "ownership_documents_delete_own"
  on ownership_documents for delete
  to authenticated
  using ((select auth.uid()::text) = owner_id);
