# Base PostgreSQL locale — Mon Toit CI (tests)

PostgreSQL **18.6** embarqué (binaires statiques zonky, sans root), base `montoit`.

## Connexion

```
postgresql://postgres@127.0.0.1:5432/montoit
```

- Host : `127.0.0.1` · Port : `5432` · User : `postgres` (trust auth local, sans mot de passe)
- Variables dans `.env` : `POSTGRES_URL`, `PGDATA`
- Client JS : package `pg` (déjà installé)

## Commandes

| Commande | Rôle |
|---|---|
| `bun run db:start` | Démarre le cluster (idempotent) |
| `bun run db:bootstrap` | Rôles Supabase + schémas auth/storage + 102 migrations (2 passes) |
| `bun run db:seed` | Données de test (idempotent) |
| `bun run db:test` | 8 vérifications de bout en bout |

Reset complet : `DROP DATABASE montoit WITH (FORCE)` puis `db:bootstrap` + `db:seed`.

## Comptes de test (mot de passe : `Test1234!`)

| Email | Rôle | Téléphone |
|---|---|---|
| admin@montoit-test.ci | ADMIN | +225 07 00 00 01 |
| locataire@montoit-test.ci | LOCATAIRE | +225 07 00 00 02 |
| proprietaire@montoit-test.ci | PROPRIETAIRE | +225 07 00 00 03 |
| agence@montoit-test.ci | AGENCE | +225 07 00 00 04 |
| tc1@montoit-test.ci | TIERS_CONFIANCE | +225 07 00 00 05 |
| tc2@montoit-test.ci | TIERS_CONFIANCE | +225 07 00 00 06 |

Données métier : 4 propriétés (Cocody/Yopougon/Marcory/Riviera), 1 dossier de location
VALIDATED, 2 baux (1 ACTIVE, 1 PENDING_SIGNATURE), 4 paiements (2 PAID, 1 PENDING, 1 LATE).

## Émulation Supabase

Le schéma reproduit l'environnement Supabase :

- **Rôles** : `anon`, `authenticated`, `service_role` (BYPASSRLS), `authenticator`
- **Schéma `auth`** : tables users/identities/sessions + fonctions `auth.uid()`,
  `auth.role()`, `auth.jwt()`, `auth.email()` (lisent `request.jwt.claims`)
- **Schéma `storage`** : `buckets`, `objects`, `policies` + fonctions helpers
  (`foldername`, `filename`, `extension`) — 12 buckets créés par les migrations
- **Publication** `supabase_realtime` (realtime)
- **RLS** : 219 policies — tester avec
  `SELECT set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', false)`

## Tables de compatibilité legacy (dette technique)

Les migrations référencent des tables jamais créées par l'historique (migration
supprimée). Tables de compatibilité créées par `db/bootstrap.mjs` :

- `profiles` (miroir legacy de `users`, id uuid) · `agencies` · `lease_contracts`
- `user_roles` (policies trust_agent + 28 appels app) · `cev_missions` (39 appels app)

## Patches appliqués aux migrations (bugs réels)

1. `20261027000040_message_attachments_private.sql` : `check` → `"check"`
   (mot réservé SQL — échouait aussi sur Supabase prod)
2. `20260123140000_create_trust_agent_tables.sql` :
   `disputes` en `IF NOT EXISTS` (conflit nouvelle base) · `dispute_id` uuid→text
   (alignement `disputes.id` text) · cast `p.owner_id::uuid` (owner_id text)
   · statuts enum `'open'/'resolved'` → `'OPEN'/'RESOLVED'` · cast jointure vue

Rapport détaillé : `db/migrations-report.json` (102/102 migrations OK).
