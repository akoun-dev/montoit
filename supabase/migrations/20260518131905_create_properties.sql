-- 005_properties.sql
-- Property listings (annonces) published by owners.
-- Supports draft workflow, geo-coordinates, amenity flags, and verification status.

create table if not exists properties (
  id                text            primary key,
  title             text            not null default '',
  description       text            not null default '',
  type              property_type   not null default 'STUDIO',
  status            property_status not null default 'DRAFT',
  rental_status     rental_status   not null default 'disponible',
  price             real            not null default 0,
  currency          text            not null default 'FCFA',
  area              real            not null default 0,
  bedrooms          integer,
  bathrooms         integer,
  address           text            not null default '',
  city              text            not null default '',
  commune           text,
  latitude          real,
  longitude         real,
  is_furnished      boolean         not null default false,
  is_verified       boolean         not null default false,
  has_parking       boolean         not null default false,
  has_garden        boolean         not null default false,
  has_pool          boolean         not null default false,
  has_guardian      boolean         not null default false,
  has_climate       boolean         not null default false,
  amenities         text            not null default '[]',
  rental_terms      text            not null default '{}',
  hide_owner_name   boolean         not null default false,
  virtual_tour_url  text,
  featured          boolean         not null default false,
  views_count       integer         not null default 0,
  created_at        timestamptz     not null default now(),
  updated_at        timestamptz     not null default now(),
  owner_id          text            not null references users(id) on delete cascade
);

create index if not exists idx_properties_status on properties (status);
create index if not exists idx_properties_city on properties (city);
create index if not exists idx_properties_type on properties (type);
create index if not exists idx_properties_price on properties (price);
create index if not exists idx_properties_owner_id on properties (owner_id);
create index if not exists idx_properties_featured on properties (featured) where featured = true;

alter table properties enable row level security;

create trigger trg_properties_updated_at
  before update on properties
  for each row
  execute function update_updated_at_column();

-- rls policies for properties
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

-- anyone can view active/available properties
create policy "properties_select_anon"
  on properties for select
  to anon
  using (status in ('ACTIVE', 'RENTED'));

-- authenticated users can view all properties (including drafts for owners)
create policy "properties_select_auth"
  on properties for select
  to authenticated
  using (true);

create policy "properties_insert_own"
  on properties for insert
  to authenticated
  with check ((select auth.uid()::text) = owner_id);

create policy "properties_update_own"
  on properties for update
  to authenticated
  using ((select auth.uid()::text) = owner_id)
  with check ((select auth.uid()::text) = owner_id);

create policy "properties_delete_own"
  on properties for delete
  to authenticated
  using ((select auth.uid()::text) = owner_id);
