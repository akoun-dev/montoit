-- 027_inventory_report_items.sql
-- Individual room condition items within an inventory report.
-- Each item tracks conditions for kitchen, bathrooms, and other rooms.

create table if not exists inventory_report_items (
  id                 text         primary key,
  designation        text         not null,
  designation_order  integer      not null,
  kitchen            room_condition,
  main_bathroom      room_condition,
  other_bathroom     room_condition,
  other_room1        room_condition,
  other_room2        room_condition,
  observations       text,
  report_id          text         not null references inventory_reports(id) on delete cascade
);

create index if not exists idx_inventory_report_items_report_id on inventory_report_items (report_id);

alter table inventory_report_items enable row level security;

-- rls policies for inventory report items
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "inventory_report_items_select_participant"
  on inventory_report_items for select
  to authenticated
  using (
    exists (
      select 1 from inventory_reports ir
      join leases l on l.id = ir.lease_id
      where ir.id = report_id
        and (select auth.uid()::text) in (l.tenant_id, l.owner_id)
    )
  );

create policy "inventory_report_items_select_tc"
  on inventory_report_items for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "inventory_report_items_insert_tc"
  on inventory_report_items for insert
  to authenticated
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "inventory_report_items_update_tc"
  on inventory_report_items for update
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  )
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );
