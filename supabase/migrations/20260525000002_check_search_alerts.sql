-- 20260525000002_check_search_alerts.sql
-- Cron job: match new properties against active search alerts and notify tenants

-- ─── Function: check_search_alerts ──────────────────────────────────────────
-- Called periodically by cron. Finds new ACTIVE properties matching active
-- search alerts and inserts notifications for the alert owners.
-- Returns the number of matches found.

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
  -- Create a temp table to track matched alert-property pairs
  create temp table if not exists tmp_alert_matches (
    alert_id    text,
    user_id     text,
    property_id text,
    property_title text,
    alert_name  text
  ) on commit drop;

  -- Clean any leftover rows (table may persist if on commit drop didn't fire)
  delete from tmp_alert_matches;

  -- Iterate over active alerts
  for v_alert in
    select *
    from search_alerts
    where is_active = true
  loop
    -- Find matching properties created since last notification (or last 24h if never notified)
    for v_property in
      select *
      from properties p
      where p.status = 'ACTIVE'
        and p.created_at >= coalesce(v_alert.last_notified_at, v_now - interval '24 hours')
        and (
          v_alert.city is null
          or p.city ilike '%' || v_alert.city || '%'
        )
        and (
          v_alert.property_type is null
          or p.type::text = v_alert.property_type
        )
        and (
          v_alert.min_price is null
          or p.price >= v_alert.min_price
        )
        and (
          v_alert.max_price is null
          or p.price <= v_alert.max_price
        )
        and (
          v_alert.search_query is null
          or p.title ilike '%' || v_alert.search_query || '%'
          or p.description ilike '%' || v_alert.search_query || '%'
        )
        -- Avoid duplicate notifications for the same alert-property pair
        and not exists (
          select 1
          from notifications n
          where n.user_id = v_alert.user_id
            and n.type = 'SEARCH_ALERT'
            and n.entity_id = p.id
            and n.created_at >= v_alert.last_notified_at
        )
      loop
        -- Insert notification
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

        -- Track the match
        insert into tmp_alert_matches (alert_id, user_id, property_id, property_title, alert_name)
        values (v_alert.id, v_alert.user_id, v_property.id, v_property.title, v_alert.name);

        v_matches := v_matches + 1;
      end loop;

      -- Update last_notified_at for this alert
      update search_alerts
      set last_notified_at = v_now,
          updated_at = v_now
      where id = v_alert.id;
  end loop;

  -- Return the results
  return query
    select * from tmp_alert_matches;

exception when others then
  -- Cleanup temp table on error
  begin
    drop table if exists tmp_alert_matches;
  exception when others then
    null;
  end;
  raise;
end;
$$;


-- ─── Scheduling (optional, requires pg_cron extension) ─────────────────────
-- If pg_cron is enabled on your Supabase project, uncomment to run every 30min:
--
--   create extension if not exists pg_cron;
--   select cron.schedule(
--     'check-search-alerts',
--     '*/30 * * * *',
--     'select check_search_alerts()'
--   );
--
-- Alternatively, call the API endpoint /api/cron/check-search-alerts from any
-- external cron provider (Vercel Cron, cron-job.org, etc.) with an optional
-- Bearer token set in CRON_SECRET_KEY env var.
