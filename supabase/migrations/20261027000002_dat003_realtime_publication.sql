-- ============================================================================
-- DAT-003 — Compléter la publication supabase_realtime
-- Task ID: 4-b · Agent: DEV FULLSTACK DATA · Sprint 0/1 · Branche 4.0.0
-- ============================================================================
-- Constat (analyse 1-e §5) : côté Next.js, les hooks `src/hooks/use-realtime-*.ts`
-- (25 hooks + canaux notification-store/notification-toast-provider) écoutent
-- 26 tables en `postgres_changes`, mais la publication `supabase_realtime` ne
-- contenait que 13-16 tables. Les 15 tables ci-dessous étaient écoutées par
-- l'application sans jamais recevoir d'événement en production hébergée
-- (temps réel silencieusement mort) :
--
--   fraud_alerts, signalements, ratings, disputes, certifications,
--   validation_slas, verification_agents, missions, facial_verifications,
--   property_documents, ownership_documents, owner_file_documents,
--   backups, users, properties
--
-- Tables déjà présentes dans la publication (migrations antérieures) :
--   payments, leases, maintenance_requests, applications, rental_files,
--   agency_agents, agency_agent_properties, mandats, notifications, messages,
--   visit_requests, inventory_reports, owner_files, owner_file_documents,
--   message_attachments, search_alerts
--
-- Idempotence : le DO block vérifie l'existence de la publication ET de chaque
-- table (to_regclass) ET l'absence dans pg_publication_tables avant l'ALTER.
-- ============================================================================

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'DAT-003 : publication supabase_realtime absente, rien a faire';
    return;
  end if;

  foreach t in array array[
    'fraud_alerts',
    'signalements',
    'ratings',
    'disputes',
    'certifications',
    'validation_slas',
    'verification_agents',
    'missions',
    'facial_verifications',
    'property_documents',
    'ownership_documents',
    'owner_file_documents',
    'backups',
    'users',
    'properties'
  ]
  loop
    if to_regclass(format('public.%I', t)) is not null
       and not exists (
         select 1
         from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = t
       )
    then
      execute format('alter publication supabase_realtime add table public.%I', t);
      raise notice 'DAT-003 : table % ajoutee a supabase_realtime', t;
    end if;
  end loop;
end
$$;
