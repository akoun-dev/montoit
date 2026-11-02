# Mon Toit CI

**Plateforme de gestion locative tout-en-un pour la Côte d'Ivoire.** Locataires, propriétaires, agences, tiers de confiance et administrateurs — plus le visiteur public — connectés sur un écosystème unique : recherche de bien, qualification locative, signature électronique, encaissement mobile money, KYC et résolution de litiges.

> Branche `4.0.0` · Stack Next.js 16 + Supabase · Dernière mise à jour de ce README : Sprint 2 (tâche DOC-001).

## Architecture (résumé)

```
Web/Mobile (Next.js 16, SPA mono-route + Capacitor)
        │
        ▼
API Routes Next.js (162 route.ts)  ──►  Edge Functions Supabase (25)
        │                                        │
        ▼                                        ▼
   Supabase (PostgreSQL + Auth + Realtime + Storage)   APIs externes (Intouch, CRYPTONEO, RNPP/ONECI, NeoFace, ANSUT, Azure OpenAI)
```

- **Authentification** : Supabase Auth (email/mot de passe) + sessions SMS via OTP (cookie httpOnly, table `sessions`) — pattern serveur unique `resolveRequestUser()` / `applyCookies()`.
- **Base de données** : PostgreSQL Supabase, schéma défini par 85 migrations SQL (49 tables), accès serveur via clé service-role.
- **Temps réel** : Supabase Realtime via 25 hooks `use-realtime-*.ts`.
- Détail complet des choix structurants et de la dette connue : [`.ai/ARCHITECTURE.md`](.ai/ARCHITECTURE.md) · matrice des permissions par acteur : [`.ai/ACTORS.md`](.ai/ACTORS.md).

## Stack technique

| Domaine | Technologie |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Framer Motion, Leaflet (cartes), Zustand |
| Backend | API Routes Next.js (162 fichiers `route.ts`) + Edge Functions Supabase (Deno) |
| Données | Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) — migrations SQL dans `supabase/migrations/` |
| Paiements | Intouch API — Orange Money, MTN MoMo, Moov Money, Wave (cashin, paiement immédiat/anticipé, transferts) |
| Signature | CRYPTONEO / ANSUT (certificat électronique, alias, OTP) + signature OTP interne |
| KYC | ONECI (match NNI, face, empreinte RNPP Connect) + NeoFace (reconnaissance faciale) |
| Messagerie | ANSUT Hub (SMS + email transactionnels, OTP) |
| Assistant | Chatbot SUTA (Azure OpenAI, côté serveur uniquement) |
| Mobile | Capacitor 8 (iOS/Android) |
| Tests | Vitest (10 specs, `src/test/`) · Playwright (2 specs, `e2e/`) |
| Gestionnaire de paquets | bun |

## Prérequis

- **bun** (ou npm ≥ 10)
- **Node.js** ≥ 20 (requis par Next.js 16)
- **CLI Supabase** (déploiement des migrations et Edge Functions)
- **CLI Capacitor + Android Studio / Xcode** (uniquement pour le mobile)

## Installation

```bash
bun install
cp .env.local.example .env.local
# Renseigner les variables (voir la section Variables d'environnement)
bun run dev          # démarre sur http://localhost:3000
```

> ⚠️ Ne jamais commiter `.env.local`. La liste de référence est [`.env.local.example`](.env.local.example), détaillée dans [`docs/ENVIRONNEMENT.md`](docs/ENVIRONNEMENT.md).

## Scripts

| Script | Rôle |
|---|---|
| `bun run dev` | Serveur de développement Next.js sur le **port 3000** |
| `bun run build` | Build de production (`next build` + copie des assets standalone) |
| `bun run start` | Sert le build standalone (`node .next/standalone/server.js`) |
| `bun run lint` | ESLint |
| `bun run test` | Vitest en mode watch (`test:run` pour un passage unique, `test:ui` pour l'interface) |
| `bun run test:e2e` | Playwright (comptes de test `*@montoit.ci` — voir `e2e/`) |
| `bun run cap:sync` / `cap:copy` | Synchronise le web bundle vers les projets natifs Capacitor |
| `bun run cap:open` | Ouvre le projet Android dans Android Studio |
| `bun run cap:build` / `cap:build:apk` | Build Capacitor (`BUILD_TARGET=capacitor`) puis APK debug |
| `bun run db:push` | **No-op volontaire** : la base est une base Supabase distante — le schéma s'applique via les migrations SQL (`supabase/migrations/`), pas via un push local |

Scripts utilitaires de seed/inspection dans `scripts/` (`seed-complete.ts`, `create-test-users.ts`, `cleanup-*.ts`, etc.) — exécutables avec `bun run scripts/<fichier>.ts`.

## Rôles et écrans

Six acteurs : **Visiteur** (catalogue public), **Locataire**, **Propriétaire**, **Agence**, **Tiers de Confiance (TC)**, **Admin** — environ 100 écrans de dashboard (navigation SPA, section par acteur).

### 👤 Locataire
Mon espace · Chercher un bien (catalogue public) · Favoris · Candidatures · Visites · Locations (baux) · États des lieux · Paiements (mobile money, immédiat/anticipé/partiel) · Messages · Litiges · Notifications · Paramètres.
Écrans complémentaires accessibles par navigation interne : dossier locatif, avis, maintenance, trust-score, détails (paiement/candidature/visite/bail).

### 🏠 Propriétaire
Mon espace · Mes biens (publication, médias, titres fonciers) · Mes locataires · Demandes de visite · Candidatures · Baux (signature OTP/CRYPTONEO, résiliation, renouvellement, caution) · Mandats · Maintenance · Paiements · Messages · Litiges · Notifications · Paramètres.
Écrans complémentaires accessibles par navigation interne : finances, analytics, dossier propriétaire, avis, trust-score.

### 🏢 Agence
Mon espace (pipeline) · Nos biens (portefeuille sous mandat) · Mandats · Candidatures · Visites · Contrats · Équipe · Finances (commissions) · Analytics · Communication · Litiges · Marketing · Dossiers clients · Paramètres.

### 🔍 Tiers de Confiance
Mon espace (files + SLA) · Tous les biens · Vérification biens · Dossiers de validation (locataires) · Dossiers propriétaires · Dossiers agences · Vérification ONECI · Utilisateurs · Certifications · Rapports d'états des lieux · Agents terrain · Missions · Centre de documentation · Alertes fraude · Messagerie · Suivi SLA · Litiges · Notifications · Paramètres.

### 🛡️ Admin
Mon espace · Utilisateurs · Modération du contenu · Modération des avis · Tiers de confiance · Signalements · Litiges · Notifications · Système · Sécurité (audit logs) · Rapports · Configuration · Sauvegardes.

## API Routes (Next.js)

162 fichiers `route.ts` répartis en 39 familles sous `src/app/api/` :

```
admin/ agence/ applications/ auth/ certificates/ dashboard/ disputes/ favorites/
history/ kyc/ leases/ locataire/ maintenance/ mandats/ messages/ migrate-videos/
notifications/ oneci/ owner/ owner-file/ payments/ profile/ properties/ renewals/
rental-file/ rental-files/ reviews/ scoring/ search-alerts/ seed/ settings/
signature/ suta/ stats/ tc/ tenants/ user/ users/ visits/   (+ route racine)
```

Convention serveur unique : `resolveRequestUser(request)` + `getSupabaseAdminClient()` + `applyCookies`, garde par rôle assurée par `middleware.ts` (`ROLE_ROUTES`, préfixes publics/protégés).

## Edge Functions (Supabase)

25 fonctions dans `supabase/functions/` (+ `_shared/` utilitaires, `_test/`) :

| Domaine | Fonctions |
|---|---|
| Paiements | `payment-initiate`, `payment-callback`, `payment-transfer`, `generate-monthly-payments`, `check-overdue-payments` |
| Signature | `signature-auth`, `sign-send-otp`, `sign`, `sign-verify`, `signed-file`, `generate-certificate`, `check-certificate`, `retrieve-certificates` |
| KYC | `kyc-face-auth`, `oneci-match`, `oneci-face-auth`, `oneci-fingerprint-auth`, `oneci-person`, `oneci-subscription` |
| Planifiées (rappels/expiration) | `remind-upcoming-visits`, `remind-upcoming-payments`, `remind-pending-lease-signatures`, `remind-lease-expiring`, `expire-stale-listings`, `expire-stale-rental-files` |

> ⚠️ Les fonctions planifiées (rappels, expirations, paiements mensuels, impayés) nécessitent un scheduler (pg_cron ou orchestrateur externe) — aucun cron n'est encore défini dans `supabase/config.toml` (dette documentée dans `.ai/ARCHITECTURE.md`).

## Variables d'environnement

Copier `.env.local.example` vers `.env.local` et renseigner les valeurs. Le fichier d'exemple couvre toutes les variables lues par le code, regroupées par service :

- **Supabase** : URL, clé anon, clé service-role (+ pepper OTP optionnel)
- **Paiements** : Intouch (base URL, identifiants, callback) + `PAYMENT_CALLBACK_SECRET` (HMAC du webhook — **obligatoire en production**) + `MAX_TRANSFER_AMOUNT_XOF` (plafond transferts, optionnel)
- **Tâches planifiées** : `CRON_SECRET` (protège les Edge Functions planifiées — **obligatoire en production**)
- **Signature** : CRYPTONEO (URL, app key, app secret)
- **KYC** : RNPP Connect (ONECI) et NeoFace
- **Messagerie** : ANSUT Hub (SMS/email, OTP)
- **Assistant** : Azure OpenAI (SUTA)

Tableau détaillé (variable → service → critique/optionnelle) : [`docs/ENVIRONNEMENT.md`](docs/ENVIRONNEMENT.md). Les variables `NEXT_PUBLIC_*` sont exposées au navigateur ; tout ce qui est secret doit rester côté serveur ou dans les secrets des Edge Functions (Dashboard Supabase).

## Sécurité

- OTP hashés (SHA-256, pepper `OTP_HASH_PEPPER`), sessions httpOnly, garde de rôles dans `middleware.ts`.
- Webhook de paiement vérifié par HMAC (`PAYMENT_CALLBACK_SECRET`).
- Runbooks d'exploitation et d'incident : voir `docs/` (fichiers `RUNBOOK-*.md` s'ils sont présents — selon l'avancement de la documentation d'exploitation).
- Historique d'audit et d'analyse : `.ai/ANALYSES/` et `.ai/LESSONS_LEARNED.md`.

## Déploiement Supabase

```bash
# 1. Appliquer le schéma (85 migrations, dans l'ordre lexicographique)
supabase db push            # ou exécuter manuellement supabase/migrations/*.sql sur le projet distant

# 2. Déployer les Edge Functions (les secrets se règlent dans le Dashboard Supabase)
supabase functions deploy payment-initiate
supabase functions deploy payment-callback
# ... une commande par fonction (voir supabase/functions/)

# 3. Configurer le scheduler des fonctions planifiées (pg_cron / orchestrateur externe)
```

Projet local (`supabase/config.toml`, `project_id = "montoit"`) : API sur 54321, DB sur 54322, Postgres 17.

## Mobile (Capacitor)

- Config : `capacitor.config.ts` (`appId: com.montoit.app`, `webDir: out`, serveur distant `mon-toit.ansut.ci`).
- Workflow : `bun run cap:sync` → `bun run cap:open` (Android) ou `cap:build:apk` pour un APK debug.
- `NEXT_PUBLIC_CAPACITOR_API_URL` permet de pointer le bundle mobile vers une API dédiée (voir `.env.local.example`).

## Tests

```bash
bun run test:run     # vitest (unitaire/intégration, src/test/)
bun run test:e2e     # playwright (e2e/auth-flow.spec.ts, e2e/roles.spec.ts)
```

Comptes de test provisionnés par `scripts/create-test-users.ts` / `scripts/seed-complete.ts` (motifs `*@montoit.ci`).

## Voir aussi

- [`.ai/ARCHITECTURE.md`](.ai/ARCHITECTURE.md) — architecture constatée, choix structurants, registre de dette.
- [`.ai/ACTORS.md`](.ai/ACTORS.md) — les 6 acteurs et leur matrice de permissions.
- [`.ai/ANALYSES/`](.ai/ANALYSES/) — rapports d'analyse Sprint 1 (fonctionnel, sécurité, données, frontend, stack).
- [`docs/ENVIRONNEMENT.md`](docs/ENVIRONNEMENT.md) — inventaire complet des variables d'environnement.
- [Documentation Supabase](https://supabase.com/docs/guides/functions) (lien externe — documentation officielle) pour les détails Edge Functions et secrets.
