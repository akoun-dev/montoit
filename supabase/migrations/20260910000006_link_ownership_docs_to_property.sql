-- Property ownership proof was never rattached to the property it proves
-- ownership of:
--   - `ownership_documents` (TITRE_FONCIER/ACTE_NOTARIE/...) only carries
--     owner_id, and has no owner-facing write endpoint at all in the app.
--   - The endpoint owners actually use, POST /api/owner-file/documents with
--     type='PROPERTY_TITLE', writes to `owner_file_documents`, which is
--     scoped to the owner's whole dossier — an owner with several
--     properties could only ever have ONE validated property title on file,
--     with no way to say which property it covers.
-- Add property_id to both tables so a title document can be tied to the
-- specific property it proves ownership of.

alter table ownership_documents
  add column if not exists property_id text references properties(id) on delete cascade;
create index if not exists idx_ownership_documents_property_id on ownership_documents (property_id);

alter table owner_file_documents
  add column if not exists property_id text references properties(id) on delete cascade;
create index if not exists idx_owner_file_docs_property_id on owner_file_documents (property_id);

-- Re-scope the insert policy so a document can only be tied to a property
-- the same owner actually owns.
drop policy if exists "owner_file_documents_insert_own" on owner_file_documents;
create policy "owner_file_documents_insert_own"
  on owner_file_documents for insert
  to authenticated
  with check (
    exists (
      select 1 from owner_files
      where id = owner_file_id and owner_id = (select auth.uid()::text)
    )
    and (
      property_id is null
      or exists (
        select 1 from properties
        where id = property_id and owner_id = (select auth.uid()::text)
      )
    )
  );

drop policy if exists "ownership_documents_insert_own" on ownership_documents;
create policy "ownership_documents_insert_own"
  on ownership_documents for insert
  to authenticated
  with check (
    (select auth.uid()::text) = owner_id
    and (
      property_id is null
      or exists (
        select 1 from properties
        where id = property_id and owner_id = (select auth.uid()::text)
      )
    )
  );
