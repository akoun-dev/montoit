# 🏠 Mon Toit — Plateforme de Location Immobilière

**Mon Toit** est une plateforme de location immobilière développée par [ANSUT](https://ansut.ci) (Agence Nationale de la Sécurité Urbaine et Territoriale) de Côte d'Ivoire. Elle connecte propriétaires, locataires, agences et agents de tiers de confiance (TC) pour faciliter et sécuriser les locations.

---

## Stack

| Couche | Technologie |
|--------|-------------|
| **Framework** | Next.js 16 (App Router, Server Actions) |
| **Base de données** | Supabase (PostgreSQL + Auth + Storage) |
| **ORM** | Supabase JS Client (`@supabase/supabase-js`, `@supabase/ssr`) |
| **Auth** | Supabase Auth (email/OTP), sessions côté serveur |
| **UI** | Tailwind CSS v4, Radix UI primitives, shadcn/ui, Framer Motion |
| **État** | Zustand (client), TanStack Query (server state) |
| **Runtime Edge** | Supabase Edge Functions (Deno v2) |

## APIs externes intégrées

| API | Usage |
|-----|-------|
| **CRYPTONEO** | Signature électronique (certificats, OTP, signature batch, vérification) |
| **ONECI / RNPP** | Vérification d'identité (NNI, reconnaissance faciale) |
| **NeoFace (Aineo)** | KYC — capture document + match visage |
| **Intouch** | Paiement mobile (Orange Money, MTN MoMo, Moov Money, Wave) |
| **ANSUT Messaging** | Envoi SMS et email (OTP, notifications) |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js App Router                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │   Routes     │  │  Dashboard   │  │   Pages    │  │
│  │  API (112)   │  │  Components  │  │  Publiques │  │
│  │  ────────    │  │  (93)        │  │            │  │
│  │  Proxy → EF  │  │              │  │            │  │
│  └──────┬───────┘  └──────────────┘  └────────────┘  │
│         │                                             │
│  ┌──────┴───────┐  ┌──────────────────────────────┐  │
│  │  Shared Lib  │  │  Supabase Admin Client       │  │
│  │  (auth-fetch,│  │  + Service Role Key          │  │
│  │   auth-store)│  └──────────────────────────────┘  │
│  └──────────────┘                                    │
└──────────────────────────┬──────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────┐
│                Supabase Platform                     │
│  ┌──────────┐  ┌─────────┐  ┌───────────────────┐  │
│  │ Postgres │  │ Storage │  │ Edge Functions    │  │
│  │ (DB)     │  │ (Files)  │  │ (12 Deno fns)    │  │
│  └──────────┘  └─────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Patterns

- **API Routes** : 112 endpoints, toutes migrées de Prisma vers Supabase
- **Edge Functions** : 12 fonctions Deno pour signature, KYC, paiements
- **Proxy** : Les routes signature/kyc/payments sont des proxies Next.js → Edge Functions
- **Auth** : `resolveRequestUser()` + `createRouteHandlerSupabaseClient()` + `applyCookies()`
- **Client** : `authFetch()` pour appels API authentifiés avec cache stale-while-revalidate
- **DB** : `getSupabaseAdminClient()` (service_role) pour les opérations serveur

---

## Structure du projet

```
src/
├── app/
│   ├── api/                    # 112 routes API
│   │   ├── admin/              # Modération, signalements, users
│   │   ├── agence/             # Agents, commissions
│   │   ├── auth/               # Login, register, forgot-password, etc.
│   │   ├── dashboard/          # Statistiques par rôle
│   │   ├── favorites/          # Favoris
│   │   ├── kyc/                # KYC (face-auth, oneci)
│   │   ├── leases/             # Baux (CRUD, sign, terminate)
│   │   ├── maintenance/        # Maintenance
│   │   ├── mandats/            # Mandats de gestion
│   │   ├── messages/           # Messagerie
│   │   ├── notifications/      # Notifications
│   │   ├── owner/              # Owner analytics/finances
│   │   ├── payments/           # Paiements (initiate, callback)
│   │   ├── properties/         # Biens immobiliers
│   │   ├── rental-files/       # Dossiers locataires
│   │   ├── reviews/            # Avis
│   │   ├── settings/           # Paramètres
│   │   ├── signature/          # Signature électronique
│   │   └── tc/                 # Tiers de confiance
│   └── page.tsx                # Page d'accueil
├── components/
│   ├── dashboard/              # 93 composants dashboard
│   │   ├── admin/              # Dashboard admin
│   │   ├── agence/             # Dashboard agence
│   │   ├── locataire/          # Dashboard locataire
│   │   ├── proprietaire/       # Dashboard propriétaire
│   │   └── tc/                 # Dashboard tiers de confiance
│   └── ui/                     # Composants UI (shadcn)
├── lib/
│   ├── supabase/               # Clients Supabase (admin, server, browser)
│   ├── auth/                   # Auth helpers (request-user, routes)
│   ├── auth-fetch.ts           # Client HTTP avec cache
│   ├── auth-store.ts           # Store Zustand auth
│   ├── cryptoneo.ts            # Client Cryptoneo
│   ├── oneci.ts                # Client ONECI
│   ├── intouch.ts              # Client Intouch
│   └── ansut-messaging.ts      # Client ANSUT SMS/Email
└── hooks/
    └── use-notifications.ts    # WebSocket + REST notifications

supabase/
├── functions/
│   ├── _shared/                # Utilitaires partagés
│   │   ├── cors.ts
│   │   ├── supabase-admin.ts
│   │   ├── cryptoneo.ts
│   │   ├── oneci.ts
│   │   └── intouch.ts
│   ├── signature-auth/         # Auth Cryptoneo
│   ├── generate-certificate/   # Génération certificat
│   ├── sign-send-otp/          # Envoi OTP signature
│   ├── sign/                   # Signature batch
│   ├── sign-verify/            # Vérification signature
│   ├── signed-file/            # Téléchargement fichier signé
│   ├── kyc-face-auth/          # KYC NeoFace
│   ├── oneci-match/            # Vérification ONECI
│   ├── oneci-face-auth/        # Reconnaissance faciale ONECI
│   ├── oneci-subscription/     # Quota ONECI
│   ├── payment-initiate/       # Initiation paiement
│   └── payment-callback/       # Callback Intouch
├── config.toml                 # Configuration Supabase
├── migrations/                 # Migrations PostgreSQL
└── seed.sql                    # Seed data
```

---

## Prérequis

- Node.js 20+ ou Bun 1.2+
- Docker (pour Supabase local)
- Supabase CLI (`supabase`)

---

## Installation

```bash
# 1. Installer les dépendances
bun install

# 2. Copier et configurer les variables d'environnement
cp .env.local.example .env.local
# Éditer .env.local avec vos clés

# 3. Démarrer Supabase local
supabase start

# 4. Lancer le serveur de développement
bun run dev
```

### Variables d'environnement

```env
# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# CRYPTONEO / Signature électronique
CRYPTONEO_API_URL=https://signature.ansut.ci
CRYPTONEO_APP_KEY=
CRYPTONEO_APP_SECRET=

# ONECI / Vérification d'identité
ONECI_API_BASE=https://api-rnpp.verif.ci
ONECI_API_KEY=
ONECI_SECRET_KEY=

# NEOFACE / KYC facial
NEOFACE_API_BASE=https://neoface.aineo.ai
NEOFACE_BEARER_TOKEN=

# INTOUCH / Paiement mobile
INTOUCH_BASE_URL=https://apidist.gutouch.net/apidist/sec/
INTOUCH_USERNAME=
INTOUCH_PASSWORD=
INTOUCH_PARTNER_ID=CI300373
INTOUCH_LOGIN_API=07084598370
INTOUCH_CASHIN_OM_PASSWORD=
INTOUCH_CASHIN_MTN_PASSWORD=
INTOUCH_CASHIN_MOOV_PASSWORD=
INTOUCH_CASHIN_WAVE_PASSWORD=
INTOUCH_CALLBACK_URL=https://montoit.ci/api/payments/callback

# ANSUT / SMS & Email
ANSUT_API_BASE_URL=https://api.ansut.ci
ANSUT_API_USERNAME=
ANSUT_API_PASSWORD=
ANSUT_SMS_SENDER=ANSUT
```

---

## Commandes

| Commande | Description |
|----------|-------------|
| `bun run dev` | Serveur de développement (port 3000) |
| `bun run build` | Build production |
| `bun run lint` | ESLint |
| `supabase functions serve` | Edge Functions locales |
| `supabase functions deploy <name>` | Déploiement Edge Function |
| `supabase secrets set KEY=VAL` | Config secrets Edge Functions |
| `supabase start/stop` | Démarrer/arrêter Supabase local |

---

## Migration Prisma → Supabase

Le projet a migré de Prisma ORM vers le client Supabase JS. Consulter `AGENTS.md` pour le plan de migration complet.

### Sprint 1-4 ✅ — Routes API
Toutes les 112 routes API ont été migrées : `@/lib/db` (Prisma) → `getSupabaseAdminClient()` (Supabase)

### Sprint 5 ✅ — Edge Functions
12 Supabase Edge Functions créées pour signature, KYC et paiements, avec proxy Next.js.

### Sprint 6 🔜 — Nettoyage
Suppression de Prisma, `@prisma/client`, dossier `prisma/`, script `seed.ts`.

---

## Tests

```bash
# Vérifier imports Prisma résiduels
rg "from '@/lib/db'" src/

# Vérifier erreurs TypeScript
npx tsc --noEmit 2>&1 | grep "^src/app/api/"

# ESLint
npx eslint src/app/api/ --max-warnings 200
```

## Licence

Propriété d'ANSUT — Côte d'Ivoire
