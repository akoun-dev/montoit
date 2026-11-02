-- property_documents.is_published existed as a column, but the anon/
-- authenticated SELECT policies were both `using (true)` — no RLS
-- enforcement at all, relying entirely on the app query to filter it (and
-- that query had its own bug, fixed separately: it could show unpublished
-- documents to strangers). Enforce visibility at the policy level too so a
-- future query without the filter doesn't silently leak drafts.

drop policy if exists "property_documents_select_anon" on property_documents;
create policy "property_documents_select_anon"
  on property_documents for select
  to anon
  using (is_published);

drop policy if exists "property_documents_select_auth" on property_documents;
create policy "property_documents_select_auth"
  on property_documents for select
  to authenticated
  using (
    is_published
    or exists (
      select 1 from properties
      where id = property_id and owner_id = (select auth.uid()::text)
    )
    or exists (
      select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN')
    )
  );
