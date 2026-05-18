-- 006_property_images.sql
-- Images associated with a property listing, ordered by position.

create table if not exists property_images (
  id          text        primary key,
  url         text        not null,
  "order"     integer     not null default 0,
  created_at  timestamptz not null default now(),
  property_id text        not null references properties(id) on delete cascade
);

create index if not exists idx_property_images_property_id on property_images (property_id);

alter table property_images enable row level security;

-- rls policies for property images
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "property_images_select_anon"
  on property_images for select
  to anon
  using (true);

create policy "property_images_select_auth"
  on property_images for select
  to authenticated
  using (true);

create policy "property_images_insert_own"
  on property_images for insert
  to authenticated
  with check (
    exists (
      select 1 from properties
      where id = property_id and owner_id = (select auth.uid()::text)
    )
  );

create policy "property_images_update_own"
  on property_images for update
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

create policy "property_images_delete_own"
  on property_images for delete
  to authenticated
  using (
    exists (
      select 1 from properties
      where id = property_id and owner_id = (select auth.uid()::text)
    )
  );
