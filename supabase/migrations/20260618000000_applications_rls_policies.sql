-- RLS policies for applications table
-- Previously, RLS was enabled but no policies were defined,
-- meaning all direct queries (using anon key or user JWT) would be denied.
-- Since the API uses service_role (bypasses RLS), this was invisible,
-- but it means no security boundary exists at the DB level.

-- Allow a tenant to select their own applications
create policy applications_select_own
  on applications for select
  using (tenant_id = (select auth.uid()::text));

-- Allow TC/ADMIN to select all applications
create policy applications_select_tc_admin
  on applications for select
  using (
    exists (
      select 1 from users
      where users.id = (select auth.uid()::text)
      and (users.role = 'TIERS_CONFIANCE' or users.role = 'ADMIN')
    )
  );

-- Allow a tenant to insert their own applications
create policy applications_insert_own
  on applications for insert
  with check (tenant_id = (select auth.uid()::text));

-- Allow a tenant to update their own applications
create policy applications_update_own
  on applications for update
  using (tenant_id = (select auth.uid()::text));

-- Allow TC/ADMIN to update any application
create policy applications_update_tc_admin
  on applications for update
  using (
    exists (
      select 1 from users
      where users.id = (select auth.uid()::text)
      and (users.role = 'TIERS_CONFIANCE' or users.role = 'ADMIN')
    )
  );
