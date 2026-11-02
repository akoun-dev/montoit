-- ============================================================================
-- FUN-001 — Table des quittances de loyer (public.rent_receipts)
-- Task ID: 5-b · Agent: DEV BACKEND FUN-001 · Sprint 4.0.0 (branche 4.0.0)
-- ============================================================================
-- Chaque paiement de loyer PAYÉ (ou PARTIAL entièrement soldé) donne lieu à
-- une quittance numérotée, consultable/imprimable par le locataire (own),
-- le propriétaire du bien (ses biens) et l'ADMIN (spec FUN-001 §5/§6).
--
-- Numérotation `QT-YYYY-NNNNNN` :
--   - YYYY = année d'ÉMISSION (préfixe informatif, la séquence est globale —
--     spec §4 : pas de reset annuel requis) ;
--   - NNNNNN = séquence Postgres dédiée sur 6 chiffres (lpad).
--
-- Idempotence : UNIQUE(payment_id) garantit qu'un même paiement ne produit
-- qu'UNE seule quittance — le re-téléchargement renvoie le même numéro et ne
-- consomme pas de nouveau numéro (pattern insert-or-select, spec §4 ; le
-- check-then-insert seul est interdit, cf. leçon migration 20260910000003).
-- Les contraintes UNIQUE(payment_id) et UNIQUE(receipt_number) protègent
-- également contre les courses concurrentes : deux requêtes simultanées sur
-- le même paiement n'insèrent qu'une ligne (ON CONFLICT DO NOTHING).
--
-- Trous de séquence : une transaction avortée peut consommer un numéro sans
-- l'utiliser — documenté et accepté (spec §4, aucune obligation de continuité
-- légale identifiée en v1, cf. DOC-003 revue juridique).
--
-- Idempotence de la migration : CREATE TABLE IF NOT EXISTS / CREATE SEQUENCE
-- IF NOT EXISTS / CREATE OR REPLACE FUNCTION / DROP POLICY IF EXISTS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Table
-- ---------------------------------------------------------------------------
create table if not exists public.rent_receipts (
  id                 uuid        primary key default gen_random_uuid(),
  payment_id         text        not null unique references public.payments(id) on delete cascade,
  lease_id           text        not null references public.leases(id) on delete cascade,
  receipt_number     text        not null unique,
  period_start       date,
  period_end         date,
  amount             real        not null,
  currency           text        not null default 'XOF' check (currency = 'XOF'),
  tenant_snapshot    jsonb,
  landlord_snapshot  jsonb,
  property_snapshot  jsonb,
  issued_at          timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

-- Index de navigation (les contraintes UNIQUE payment_id / receipt_number
-- créent déjà leurs index implicites).
create index if not exists idx_rent_receipts_lease_id on public.rent_receipts (lease_id);
create index if not exists idx_rent_receipts_issued_at on public.rent_receipts (issued_at desc);

-- ---------------------------------------------------------------------------
-- 2) Numérotation : séquence dédiée + fonction SECURITY DEFINER
-- ---------------------------------------------------------------------------
-- La route serveur (service_role) appelle cette fonction via RPC pour obtenir
-- le prochain numéro formaté. Le nextval est atomique côté Postgres : deux
-- appels concurrents obtiennent deux numéros distincts.
create sequence if not exists public.rent_receipt_number_seq start 1;

create or replace function public.next_rent_receipt_number()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select 'QT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.rent_receipt_number_seq')::text, 6, '0');
$$;

-- Exécutable uniquement par le backend (service_role). Les rôles clients
-- (anon / authenticated) n'ont ni execute sur la fonction, ni accès à la
-- séquence : la numérotation ne peut pas être provoquée ou déviée du client.
revoke all on function public.next_rent_receipt_number() from public;
revoke all on function public.next_rent_receipt_number() from anon;
revoke all on function public.next_rent_receipt_number() from authenticated;
grant execute on function public.next_rent_receipt_number() to service_role;

-- ---------------------------------------------------------------------------
-- 3) RLS — lecture locataire du bail / propriétaire du bien / ADMIN
-- ---------------------------------------------------------------------------
alter table public.rent_receipts enable row level security;

-- 3.a) Locataire : quittances de SES paiements (ACTORS.md : LOCATAIRE = own)
drop policy if exists rent_receipts_select_tenant on public.rent_receipts;
create policy rent_receipts_select_tenant
  on public.rent_receipts for select
  to authenticated
  using (
    exists (
      select 1 from public.payments p
      where p.id = payment_id
        and p.tenant_id = (select auth.uid()::text)
    )
  );

-- 3.b) Propriétaire : quittances des paiements de SES biens (ses baux)
drop policy if exists rent_receipts_select_owner on public.rent_receipts;
create policy rent_receipts_select_owner
  on public.rent_receipts for select
  to authenticated
  using (
    exists (
      select 1 from public.payments p
      join public.leases l on l.id = p.lease_id
      where p.id = payment_id
        and l.owner_id = (select auth.uid()::text)
    )
  );

-- 3.c) ADMIN : supervision globale (matrice ACTORS.md)
drop policy if exists rent_receipts_select_admin on public.rent_receipts;
create policy rent_receipts_select_admin
  on public.rent_receipts for select
  to authenticated
  using (
    exists (
      select 1 from public.users
      where id = (select auth.uid()::text)
        and role = 'ADMIN'
    )
  );

-- 3.d) INSERT : service_role UNIQUEMENT.
-- Aucune policy INSERT n'est créée pour anon/authenticated : le refus par
-- défaut de la RLS les bloque (une quittance ne peut être émise que par la
-- route serveur, qui passe par le client service_role — celui-ci contourne
-- la RLS par design). Les UPDATE/DELETE applicatifs sont également interdits :
-- la quittance est immuable (ré-émission = ré-lecture, jamais ré-écriture).
