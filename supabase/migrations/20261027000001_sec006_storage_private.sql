-- ============================================================================
-- SEC-006 — Buckets Storage sensibles en privé + policies d'accès par dossier
-- Task ID: 4-b · Agent: DEV FULLSTACK DATA · Sprint 0 (sécurité) · Branche 4.0.0
-- ============================================================================
-- Corrige la vulnérabilité V7 de l'analyse 1-c et le risque #3 de l'analyse 1-e :
-- les pièces KYC (CNI, fiches de paie, titres de propriété), les baux signés
-- CRYPTONEO et les mandats étaient servis depuis des buckets publics —
-- quiconque connaissait l'URL (énumérable) lisait le document.
--
-- Buckets sensibles passés en PRIVÉ (lecture uniquement via URLs signées 1 h) :
--   - owner-documents   : justificatifs propriétaires (CNI, titres fonciers…)
--   - rental-documents  : justificatifs locataires (KYC dossier locatif)
--   - property-documents: diagnostics / titres rattachés à un bien
--   - lease-documents   : baux signés (PDF CRYPTONEO, justificatifs de caution)
--   - mandat-documents  : mandats signés
--   - maintenance-images: photos de sinistres
-- Les buckets catalogue (avatars, property-images, property-videos) restent
-- publics : ils contiennent des médias destinés à l'affichage anonyme.
--
-- Policies :
--   1. Suppression de toutes les policies « bucket-wide » (authenticated sans
--      filtre utilisateur) héritées des migrations 20260518131942 (042),
--      20260518131920, 20260519132002, 20260521100000 et 20260522000006.
--   2. Policies « par dossier » : le 1er segment du chemin est l'id utilisateur
--      (modèle avatars) pour owner-documents, rental-documents et
--      property-documents (chemins `<userId>/...`).
--   3. Rôles métier via public.users : ADMIN / TIERS_CONFIANCE / AGENCE peuvent
--      lire les six buckets (validation des dossiers, gestion locative).
--   4. lease-documents / mandat-documents : les parties du contrat (propriétaire
--      et locataire du bail, propriétaire du mandat) peuvent lire via une
--      correspondance sur le dossier racine `<leaseId>` / `<mandatId>`.
--
-- L'application téléverse via le service_role (bypass RLS) ou des signed
-- upload URLs (l'autorisation est portée par le token, pas par la policy) :
-- aucune policy INSERT supplémentaire n'est nécessaire côté utilisateurs.
-- Idempotence : UPDATE buckets no-op si absent, DROP POLICY IF EXISTS partout.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Passage des buckets sensibles en privé
--    (no-op si le bucket n'existe pas encore — création runtime privée)
-- ---------------------------------------------------------------------------
update storage.buckets
set public = false
where id in (
  'owner-documents',
  'rental-documents',
  'property-documents',
  'lease-documents',
  'mandat-documents',
  'maintenance-images'
);

-- ---------------------------------------------------------------------------
-- 2) Suppression des policies publiques / bucket-wide héritées
-- ---------------------------------------------------------------------------

-- Migration 042 (20260518131942) — policies « _own » sans filtre utilisateur
drop policy if exists "property_documents_select_own"  on storage.objects;
drop policy if exists "property_documents_insert_own"  on storage.objects;
drop policy if exists "property_documents_delete_own"  on storage.objects;
drop policy if exists "owner_documents_select_own"     on storage.objects;
drop policy if exists "owner_documents_insert_own"     on storage.objects;
drop policy if exists "owner_documents_delete_own"     on storage.objects;
drop policy if exists "rental_documents_select_own"    on storage.objects;
drop policy if exists "rental_documents_insert_own"    on storage.objects;
drop policy if exists "rental_documents_delete_own"    on storage.objects;
drop policy if exists "maintenance_images_select_own"  on storage.objects;
drop policy if exists "maintenance_images_insert_own"  on storage.objects;
drop policy if exists "maintenance_images_delete_own"  on storage.objects;

-- Migration 20260521100000 — second jeu de policies « authenticated » sans filtre
drop policy if exists "property_documents_select"      on storage.objects;
drop policy if exists "property_documents_insert"      on storage.objects;
drop policy if exists "property_documents_update"      on storage.objects;
drop policy if exists "property_documents_delete"      on storage.objects;
drop policy if exists "owner_documents_select"         on storage.objects;
drop policy if exists "owner_documents_insert"         on storage.objects;
drop policy if exists "owner_documents_update"         on storage.objects;
drop policy if exists "owner_documents_delete"         on storage.objects;
drop policy if exists "rental_documents_select"        on storage.objects;
drop policy if exists "rental_documents_insert"        on storage.objects;
drop policy if exists "rental_documents_update"        on storage.objects;
drop policy if exists "rental_documents_delete"        on storage.objects;
drop policy if exists "maintenance_images_select"      on storage.objects;
drop policy if exists "maintenance_images_insert"      on storage.objects;
drop policy if exists "maintenance_images_update"      on storage.objects;
drop policy if exists "maintenance_images_delete"      on storage.objects;

-- Migration 20260518131920 (create_leases) + 20260519132002 (buckets videos/leases)
drop policy if exists "lease_documents_select_authenticated" on storage.objects;
drop policy if exists "lease_documents_insert_authenticated" on storage.objects;
drop policy if exists "lease_documents_select_own"           on storage.objects;
drop policy if exists "lease_documents_insert_own"           on storage.objects;
drop policy if exists "lease_documents_update_own"           on storage.objects;
drop policy if exists "lease_documents_delete_own"           on storage.objects;

-- Migration 20260522000006 (mandat-documents) — lecture publique explicite
drop policy if exists "mandat-documents_public_read"   on storage.objects;
drop policy if exists "mandat-documents_auth_upload"   on storage.objects;
drop policy if exists "mandat-documents_auth_update"   on storage.objects;

-- ---------------------------------------------------------------------------
-- 3) Policies « par dossier » — le propriétaire du dossier accède à ses fichiers
--    Chemins applicatifs : `<userId>/<dossierId>/<type>_<ts>.<ext>`
-- ---------------------------------------------------------------------------

-- Documents propriétaires : dossier racine = id du propriétaire
drop policy if exists "owner_documents_folder_select" on storage.objects;
create policy "owner_documents_folder_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'owner-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "owner_documents_folder_insert" on storage.objects;
create policy "owner_documents_folder_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'owner-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "owner_documents_folder_delete" on storage.objects;
create policy "owner_documents_folder_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'owner-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Documents locataires (KYC dossier locatif) : dossier racine = id du locataire
drop policy if exists "rental_documents_folder_select" on storage.objects;
create policy "rental_documents_folder_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'rental-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "rental_documents_folder_insert" on storage.objects;
create policy "rental_documents_folder_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'rental-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "rental_documents_folder_delete" on storage.objects;
create policy "rental_documents_folder_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'rental-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Documents de bien (diagnostics, titres) : dossier racine = id du propriétaire
drop policy if exists "property_documents_folder_select" on storage.objects;
create policy "property_documents_folder_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'property-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "property_documents_folder_insert" on storage.objects;
create policy "property_documents_folder_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'property-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "property_documents_folder_delete" on storage.objects;
create policy "property_documents_folder_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'property-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- ---------------------------------------------------------------------------
-- 4) Rôles métier (via public.users) : lecture des documents par les équipes
--    de validation (ADMIN, TIERS_CONFIANCE) et de gestion (AGENCE)
-- ---------------------------------------------------------------------------

drop policy if exists "owner_documents_staff_select" on storage.objects;
create policy "owner_documents_staff_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'owner-documents'
    and exists (
      select 1 from public.users u
      where u.id = (select auth.uid()::text)
        and u.role in ('ADMIN', 'TIERS_CONFIANCE', 'AGENCE')
    )
  );

drop policy if exists "rental_documents_staff_select" on storage.objects;
create policy "rental_documents_staff_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'rental-documents'
    and exists (
      select 1 from public.users u
      where u.id = (select auth.uid()::text)
        and u.role in ('ADMIN', 'TIERS_CONFIANCE', 'AGENCE')
    )
  );

drop policy if exists "property_documents_staff_select" on storage.objects;
create policy "property_documents_staff_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'property-documents'
    and exists (
      select 1 from public.users u
      where u.id = (select auth.uid()::text)
        and u.role in ('ADMIN', 'TIERS_CONFIANCE', 'AGENCE')
    )
  );

drop policy if exists "maintenance_images_staff_select" on storage.objects;
create policy "maintenance_images_staff_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'maintenance-images'
    and exists (
      select 1 from public.users u
      where u.id = (select auth.uid()::text)
        and u.role in ('ADMIN', 'TIERS_CONFIANCE', 'AGENCE')
    )
  );

drop policy if exists "lease_documents_staff_select" on storage.objects;
create policy "lease_documents_staff_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'lease-documents'
    and exists (
      select 1 from public.users u
      where u.id = (select auth.uid()::text)
        and u.role in ('ADMIN', 'TIERS_CONFIANCE', 'AGENCE')
    )
  );

drop policy if exists "mandat_documents_staff_select" on storage.objects;
create policy "mandat_documents_staff_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'mandat-documents'
    and exists (
      select 1 from public.users u
      where u.id = (select auth.uid()::text)
        and u.role in ('ADMIN', 'TIERS_CONFIANCE', 'AGENCE')
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Parties du contrat : le propriétaire / locataire du bail et le
--    propriétaire du mandat peuvent lire leur document (dossier racine
--    = id de l'entité, cf. chemins `<leaseId>/...` et `<mandatId>/...`)
-- ---------------------------------------------------------------------------

drop policy if exists "lease_documents_parties_select" on storage.objects;
create policy "lease_documents_parties_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'lease-documents'
    and exists (
      select 1 from public.leases l
      where l.id = (storage.foldername(name))[1]
        and (select auth.uid()::text) in (l.owner_id, l.tenant_id)
    )
  );

drop policy if exists "mandat_documents_owner_select" on storage.objects;
create policy "mandat_documents_owner_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'mandat-documents'
    and exists (
      select 1 from public.mandats m
      where m.id = (storage.foldername(name))[1]
        and m.owner_id = (select auth.uid()::text)
    )
  );

-- Commentaires de documentation
comment on policy owner_documents_folder_select on storage.objects is
  'SEC-006 : lecture des justificatifs proprietaires limitee au dossier `<userId>/...` du proprietaire.';
comment on policy rental_documents_folder_select on storage.objects is
  'SEC-006 : lecture des justificatifs locataires (KYC) limitee au dossier `<userId>/...` du locataire.';
comment on policy lease_documents_parties_select on storage.objects is
  'SEC-006 : lecture des baux signes limitee aux parties du bail (dossier `<leaseId>/...`).';
