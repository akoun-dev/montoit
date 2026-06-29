-- 20260525000000_create_search_alerts.sql
-- Search alerts: tenants can create alerts for new matching properties
-- Includes cron function and data cleanup

create table if not exists search_alerts (
  id                text        primary key,
  user_id           text        not null references users(id) on delete cascade,
  name              text        not null,
  is_active         boolean     not null default true,
  city              text,
  property_type     text,
  min_price         real,
  max_price         real,
  search_query      text,
  last_notified_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_search_alerts_user_id on search_alerts (user_id);
create index if not exists idx_search_alerts_is_active on search_alerts (is_active) where is_active = true;

alter table search_alerts enable row level security;

drop trigger if exists trg_search_alerts_updated_at on search_alerts;
create trigger trg_search_alerts_updated_at
  before update on search_alerts
  for each row
  execute function update_updated_at_column();

-- RLS policies
drop policy if exists "search_alerts_select_own" on search_alerts;
create policy "search_alerts_select_own"
  on search_alerts for select
  to authenticated
  using ((select auth.uid()::text) = user_id);

drop policy if exists "search_alerts_insert_own" on search_alerts;
create policy "search_alerts_insert_own"
  on search_alerts for insert
  to authenticated
  with check ((select auth.uid()::text) = user_id);

drop policy if exists "search_alerts_update_own" on search_alerts;
create policy "search_alerts_update_own"
  on search_alerts for update
  to authenticated
  using ((select auth.uid()::text) = user_id)
  with check ((select auth.uid()::text) = user_id);

drop policy if exists "search_alerts_delete_own" on search_alerts;
create policy "search_alerts_delete_own"
  on search_alerts for delete
  to authenticated
  using ((select auth.uid()::text) = user_id);

-- Cleanup invalid property_type values
update search_alerts set property_type = 'APPARTEMENT', updated_at = now() where property_type = 'APPARTMENT';
update search_alerts set property_type = 'MAISON', updated_at = now() where property_type = 'HOUSE';
delete from search_alerts where property_type = 'COMMERCIAL';

-- Function: check_search_alerts
-- Called periodically by cron. Finds new ACTIVE properties matching active
-- search alerts and inserts notifications for the alert owners.
create or replace function check_search_alerts()
returns table (
  alert_id      text,
  user_id       text,
  property_id   text,
  property_title text,
  alert_name    text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now        timestamptz := now();
  v_alert      record;
  v_property   record;
  v_matches    int := 0;
begin
  create temp table if not exists tmp_alert_matches (
    alert_id    text,
    user_id     text,
    property_id text,
    property_title text,
    alert_name  text
  ) on commit drop;

  delete from tmp_alert_matches;

  for v_alert in
    select *
    from search_alerts
    where is_active = true
  loop
    for v_property in
      select *
      from properties p
      where p.status = 'ACTIVE'
        and p.created_at >= coalesce(v_alert.last_notified_at, v_now - interval '24 hours')
        and (v_alert.city is null or p.city ilike '%' || v_alert.city || '%')
        and (v_alert.property_type is null or p.type::text = v_alert.property_type)
        and (v_alert.min_price is null or p.price >= v_alert.min_price)
        and (v_alert.max_price is null or p.price <= v_alert.max_price)
        and (v_alert.search_query is null or p.title ilike '%' || v_alert.search_query || '%' or p.description ilike '%' || v_alert.search_query || '%')
        and not exists (
          select 1 from notifications n
          where n.user_id = v_alert.user_id
            and n.type = 'SEARCH_ALERT'
            and n.entity_id = p.id
            and n.created_at >= v_alert.last_notified_at
        )
    loop
      insert into notifications (id, user_id, type, title, message, action_url, entity_id, created_at)
      values (
        gen_random_uuid()::text,
        v_alert.user_id,
        'SEARCH_ALERT',
        'Nouveau bien trouvé : ' || v_property.title,
        'Un bien correspondant à votre alerte "' || v_alert.name || '" a été publié à ' || v_property.city || '.',
        'search-properties',
        v_property.id,
        v_now
      );

      insert into tmp_alert_matches (alert_id, user_id, property_id, property_title, alert_name)
      values (v_alert.id, v_alert.user_id, v_property.id, v_property.title, v_alert.name);

      v_matches := v_matches + 1;
    end loop;

    update search_alerts
    set last_notified_at = v_now,
        updated_at = v_now
    where id = v_alert.id;
  end loop;

  return query select * from tmp_alert_matches;

exception when others then
  begin
    drop table if exists tmp_alert_matches;
  exception when others then
    null;
  end;
  raise;
end;
$$;

alter publication supabase_realtime add table search_alerts;
