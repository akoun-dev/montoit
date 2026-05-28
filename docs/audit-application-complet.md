# Audit Complet de l'Application Mon Toit

> **Date :** 26 mai 2026
> **Projet :** Mon Toit — Plateforme de location immobilière (Côte d'Ivoire)
> **Stack :** Next.js 16 + React 19 + Supabase + Capacitor (Android/iOS) + Tailwind CSS v4

---

## Table des Matières

1. [Vue d'ensemble de l'architecture](#1-vue-densemble-de-larchitecture)
2. [Structure du code](#2-structure-du-code)
3. [Base de données](#3-base-de-données)
4. [Route API](#4-route-api)
5. [Problèmes critiques](#5-problèmes-critiques)
6. [Problèmes architecturaux](#6-problèmes-architecturaux)
7. [Problèmes de performance](#7-problèmes-de-performance)
8. [Problèmes de sécurité](#8-problèmes-de-sécurité)
9. [Problèmes d'accessibilité](#9-problèmes-daccessibilité)
10. [Fonctionnalités manquantes](#10-fonctionnalités-manquantes)
11. [Dette technique](#11-dette-technique)
12. [Recommandations priorisées](#12-recommandations-priorisées)
13. [Fonctionnalités existantes impressionnantes](#13-fonctionnalités-existantes-impressionnantes)

---

## 1. Vue d'ensemble de l'architecture

### Stack Technique

| Couche | Technologie |
|--------|------------|
| Frontend | Next.js 16 (mode SPA) + React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| État global | Zustand 5 (persist + middleware) |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth + sessions custom |
| Data Fetching | `authFetch` custom (wrapper fetch) + TanStack Query (minimal) |
| Mobile | Capacitor 8 (Android + iOS) |
| Cartographie | Leaflet + react-leaflet |
| Graphiques | Recharts |
| Paiements | Intouch (Orange Money, MTN Mobile Money) |
| Signature électronique | CryptoNeo |
| Vérification d'identité | ONECI |
| Animations | Framer Motion |
| Formulaires | react-hook-form + Zod |

### Architecture Applicative

L'application fonctionne comme une **Single Page Application (SPA)** dans Next.js — la navigation se fait via une variable `currentView` dans le Zustand store, et non via le routing Next.js. Le fichier `src/app/page.tsx` contient un énorme switch-case qui rend le composant approprié selon la vue.

```
┌──────────────────────────────────────────────┐
│                  layout.tsx                   │
│  (ThemeProvider, QueryProvider, Toasters,     │
│   OfflineBanner, BackNavigation, Chatbot)     │
├──────────────────────────────────────────────┤
│                  page.tsx                     │
│  ┌──────────┬──────────┬──────────────────┐   │
│  │  Login   │  Home    │   Dashboard       │   │
│  │  Register│  (Hero,  │   (5 rôles)       │   │
│  │  OTP     │  NosBiens│   ┌──────────┐   │   │
│  │  Forgot  │  About,  │   │Locataire │   │   │
│  │  Password│  FAQ,    │   │Proprio   │   │   │
│  │          │  Contact)│   │Agence    │   │   │
│  │          │          │   │TC        │   │   │
│  │          │          │   │Admin     │   │   │
│  │          │          │   └──────────┘   │   │
│  └──────────┴──────────┴──────────────────┘   │
└──────────────────────────────────────────────┘
```

### Rôles Utilisateurs

| Rôle | Dashboard | Sections |
|------|-----------|----------|
| **LOCATAIRE** | LocataireDashboard | overview, search, favorites, applications, visits, leases, payments, messages, disputes, maintenance, settings, trust-score, history |
| **PROPRIETAIRE** | ProprietaireDashboard | overview, properties, tenants, visits, applications, leases, mandats, finances, analytics, messages, settings, security |
| **AGENCE** | AgenceDashboard | overview, portfolio, mandats, candidatures, team, finances, visits, analytics, contracts, communication, marketing, client-files, settings |
| **TIERS_CONFIANCE** | TcDashboard | overview, all-properties, property-verifications, dossier-validations, rental-files, owner-validations, agency-validations, certifications, agents, missions, litiges, fraud-alerts, messaging, SLA, settings |
| **ADMIN** | AdminDashboard | overview, users, moderation, tc-management, signalements, disputes, system, security, config, backups, reports, notifications |

---

## 2. Structure du code

### Composants (~110 fichiers .tsx)

```
src/
├── app/
│   ├── layout.tsx          # Root layout (providers, toasters, chatbot)
│   ├── page.tsx            # Page unique SPA (switch-case géant)
│   ├── loading.tsx         # Loading state
│   ├── error.tsx           # Error boundary
│   ├── global-error.tsx    # Global error boundary
│   ├── not-found.tsx       # 404 page
│   ├── globals.css         # Styles globaux
│   └── api/                # ~80+ routes API
├── components/
│   ├── ui/                 # ~40 composants shadcn/ui
│   ├── home/               # 14 composants (header, hero, properties, etc.)
│   ├── auth/               # 5 formulaires d'authentification
│   ├── dashboard/          # ~90 composants dashboard
│   │   ├── locataire/      # ~20 composants
│   │   ├── proprietaire/   # ~20 composants
│   │   ├── agence/         # ~15 composants
│   │   ├── tc/             # ~25 composants
│   │   └── admin/          # ~15 composants
│   ├── messaging/          # 2 composants (dialogues)
│   └── providers/          # QueryProvider
├── hooks/
│   ├── capacitor/          # 6 hooks (app, browser, geolocation, etc.)
│   └── use-realtime-*      # 6 hooks Supabase Realtime
├── lib/
│   ├── auth-store.ts       # Zustand store ~700 lignes
│   ├── auth-fetch.ts       # Fetch wrapper avec cache
│   ├── notification-store.ts
│   ├── payment-alert-store.ts
│   ├── supabase/           # client, server, admin, middleware, types
│   ├── cryptoneo.ts        # Intégration signature CryptoNeo
│   ├── intouch.ts          # Intégration paiement Intouch
│   ├── oneci.ts            # Intégration vérification ONECI
│   ├── ansut-messaging.ts  # SMS/Email via ANSUT
│   ├── utils.ts            # cn() et utilitaires
│   └── rate-limiter.ts     # Rate limiter in-memory
├── supabase/
│   ├── functions/          # 10 Edge Functions
│   └── migrations/         # ~45 migrations SQL
```

### Taille approximative

| Métrique | Valeur |
|----------|--------|
| Fichiers .ts/.tsx | ~250+ |
| Composants React | ~110 |
| Routes API | ~80+ |
| Edge Functions | ~10 |
| Migrations DB | ~45 |
| Packages npm | ~80 |

---

## 3. Base de données

### Tables principales

| Table | Description |
|-------|-------------|
| `users` | Utilisateurs (tous rôles) |
| `properties` | Annonces immobilières |
| `property_images` | Images des biens |
| `property_documents` | Documents des biens |
| `rental_files` | Dossiers de location (candidatures) |
| `rental_file_documents` | Documents des dossiers |
| `owner_files` | Dossiers propriétaires |
| `owner_file_documents` | Documents propriétaires |
| `ownership_documents` | Preuves de propriété |
| `applications` | Candidatures |
| `leases` | Baux/Contrats de location |
| `payments` | Paiements |
| `visit_requests` | Demandes de visite |
| `messages` | Messages |
| `conversations` | Conversations |
| `message_attachments` | Pièces jointes messages |
| `notifications` | Notifications |
| `notification_preferences` | Préférences de notification |
| `inventory_reports` | États des lieux |
| `inventory_report_items` | Éléments d'état des lieux |
| `maintenance_requests` | Demandes de maintenance |
| `maintenance_comments` | Commentaires maintenance |
| `mandats` | Mandats de gestion |
| `commissions` | Commissions |
| `certifications` | Certifications utilisateurs |
| `fraud_alerts` | Alertes fraude |
| `signalements` | Signalements |
| `signature_aliases` | Alias signature CryptoNeo |
| `sessions` | Sessions utilisateur |
| `otp_codes` | Codes OTP |
| `audit_logs` | Journal d'audit |
| `connection_logs` | Journal de connexions |
| `facial_verifications` | Vérifications faciales |
| `verification_agents` | Agents de vérification |
| `agent_feedback` | Feedback agents |
| `validation_slas` | SLA de validation |
| `default_conditions` | Conditions par défaut |
| `service_usage_logs` | Logs d'utilisation services |
| `agency_agent_properties` | Biens des agents d'agence |
| `platform_settings` | Paramètres plateforme |
| `reviews` | Avis |
| `favorites` | Favoris |
| `sessions` | Sessions |

### Buckets Storage

- `property-photos`
- `property-documents`
- `rental-file-documents`
- `owner-file-documents`
- `ownership-documents`
- `avatars`
- `videos`
- `lease-pdfs`
- `mandat-documents`

---

## 4. Routes API

### Authentification (~10 routes)
- `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`
- `/api/auth/send-sms-otp`, `/api/auth/verify-sms-otp`
- `/api/auth/send-email-otp`, `/api/auth/verify-email-otp`
- `/api/auth/forgot-password`, `/api/auth/reset-password`
- `/api/auth/me`

### Propriétés (~8 routes)
- `/api/properties` (CRUD list)
- `/api/properties/[id]` (CRUD single + vues)
- `/api/properties/signal`
- `/api/properties/reviews`
- `/api/properties/[id]/inventory-reports`
- `/api/properties/[id]/documents`

### Dashboard (~5 routes)
- `/api/dashboard/locataire`
- `/api/dashboard/proprietaire`
- `/api/dashboard/agence`
- `/api/dashboard/tc`
- `/api/dashboard/admin`

### TC (~15 routes)
- `/api/tc/properties`, `/api/tc/properties/[id]/unpublish`
- `/api/tc/verifications`
- `/api/tc/rental-files`
- `/api/tc/inventory-reports`
- `/api/tc/messages`
- `/api/tc/missions`
- `/api/tc/litiges`
- `/api/tc/agents`
- `/api/tc/certifications`
- `/api/tc/fraud-alerts`
- `/api/tc/warn-owner`, `/api/tc/signal-property`
- `/api/tc/oneci`
- `/api/tc/users`

### Admin (~10 routes)
- `/api/admin/users`, `/api/admin/settings`, `/api/admin/system`
- `/api/admin/properties-moderation`
- `/api/admin/signalements`
- `/api/admin/audit-logs`
- `/api/admin/backups`
- `/api/admin/disputes`

### Autres (~40 routes)
- Paiements, visites, messages, candidatures, mandats, location, signatures, etc.

---

## 5. Problèmes critiques

### 🔴 C1 — React Strict Mode désactivé
**Fichier :** `next.config.ts`
```typescript
reactStrictMode: false  // ← Désactivé !
```
**Impact :** Les bugs silencieux dans les doubles rendus (useEffect) ne sont pas détectés en développement. Les problèmes de nettoyage d'effets passent inaperçus.

**Fix :** Activer `reactStrictMode: true` et corriger les doubles appels.

---

### 🔴 C2 — 200+ casts `as any` dans le code
**Fichiers :** `src/app/api/**/*.ts` (omniprésent)
```typescript
const { data } = await (supabase.from('properties') as any).select('*')
```
**Impact :** Toute la sécurité de TypeScript est contournée. Une erreur de requête Supabase ne sera pas détectée à la compilation.

**Fix :** Utiliser les types générés par Supabase (`src/lib/supabase/types.ts`) correctement.

---

### 🔴 C3 — Zéro test automatisé
**Fichier :** Aucun fichier de test trouvé
```bash
# Aucun test unitaire, d'intégration ou E2E
```
**Impact :** Aucune confiance dans les refactorisations. Chaque changement est manuel et risqué.

**Fix :** Ajouter au moins des tests unitaires critiques (auth, paiements, signatures).

---

### 🔴 C4 — 178+ `console.log` en production
**Fichiers :** Partout (API routes, lib, components, Edge Functions)
```typescript
console.log('[PATCH /api/properties] uploading image', idx, '->', path)
console.log('[cryptoneo] Token obtained successfully, expires at:', ...)
console.log('[sign-send-otp] User data:', userData)  // ← Données utilisateur !
```
**Impact :** Fuite d'information, performances dégradées, logs en production exposés.

**Fix :** Remplacer par un logger conditionnel (`if (process.env.NODE_ENV !== 'production')` ou une lib comme `pino`).

---

### 🔴 C5 — Cache `authFetch` custom vs TanStack Query
**Fichiers :** `src/lib/auth-fetch.ts` + `src/lib/response-cache.ts`
**Problème :** Un système de cache custom a été implémenté (~200 lignes) alors que TanStack Query est installé et pourrait gérer tout ça.

**Impact :** Cache in-memory sans persistance, stale-while-revalidate fait maison, code dupliqué.

**Fix :** Migrer vers TanStack Query pour toutes les data fetches.

---

### 🔴 C6 — `.catch(() => {})` silencieux
**Fichiers :** Partout
```typescript
navigator.share({ title, url }).catch(() => {})
deleteFromStorage(parsed.bucket, parsed.path).catch(() => {})
```
**Impact :** Les erreurs sont avalées silencieusement. Impossible de déboguer les échecs en production.

**Fix :** Logger les erreurs même dans les catch silencieux.

---

## 6. Problèmes architecturaux

### 🟠 A1 — SPA dans Next.js (perte des bénéfices SSR/SEO)
**Fichier :** `src/app/page.tsx`
**Problème :** Next.js est utilisé comme SPA avec Zustand pour la navigation. Le routing Next.js n'est pas utilisé.

**Impact :**
- Pas de SEO (pages non indexables)
- Pas de SSR (premier chargement lent)
- Bundle initial énorme (toute l'appli chargée d'un coup)
- Pas de code splitting par route

**Solution :** Utiliser le App Router de Next.js avec des layouts et pages par route.

---

### 🟠 A2 — Auth store monolithique (~700 lignes)
**Fichier :** `src/lib/auth-store.ts`
**Problème :** Le store Zustand gère à la fois auth, routing, navigation et état UI.

**Impact :** Difficile à tester, à maintenir, et à faire évoluer.

**Fix :** Séparer en stores dédiés : `authStore`, `navigationStore`, `uiStore`.

---

### 🟠 A3 — Deux systèmes de toast
**Fichiers :** `src/app/layout.tsx`
```tsx
<SonnerToaster position="top-center" />
<Toaster />  // ← shadcn toast
```
**Problème :** Les deux libraries de toast sont rendues. Parfois l'une est utilisée, parfois l'autre.

**Impact :** Incohérence UI, taille de bundle doublée pour la même fonctionnalité.

**Fix :** Choisir Sonner (moderne) ou shadcn Toast et supprimer l'autre.

---

### 🟠 A4 — next-auth et next-intl installés mais inutilisés
**Fichier :** `package.json`
```json
"next-auth": "^4.24.11",
"next-intl": "^4.3.4",
```
**Problème :** Ces packages sont dans les dépendances mais ne sont pas utilisés.

**Impact :** Taille de bundle inutile, confusion pour les nouveaux développeurs.

**Fix :** Supprimer les packages inutilisés ou les utiliser réellement.

---

### 🟠 A5 — Gestion d'état fragmentée
**Problème :** L'état est dispersé entre Zustand (auth, notifications, paiements), React Query (2 fichiers) et state local React.

**Impact :** Incohérence des données, difficulté à synchroniser l'état entre composants.

---

### 🟠 A6 — Pas de gestion des erreurs centralisée
**Problème :** Chaque composant gère ses erreurs individuellement avec des try/catch et des toasts.

**Impact :** Duplication de code, incohérence dans le traitement des erreurs.

**Fix :** Créer un error boundary global + un hook `useApiError` centralisé.

---

## 7. Problèmes de performance

### 🟡 P1 — Pas d'analyse de bundle
**Fichier :** `package.json` — Aucun script d'analyse de bundle.

**Impact :** Impossible de savoir ce qui gonfle le bundle.

**Fix :** Ajouter `@next/bundle-analyzer`.

---

### 🟡 P2 — Images non optimisées
**Fichier :** `src/components/home/property-detail-view.tsx`
```tsx
<Image ... unoptimized />  // ← Pas d'optimisation
```

---

### 🟡 P3 — useEffect sans gestion de nettoyage
**Fichiers :** Plusieurs composants
```typescript
useEffect(() => {
  fetchData()  // ← Pas de retour de nettoyage
}, [])
```

---

### 🟡 P4 — Aucun lazy loading des composants dashboard
**Fichier :** `src/components/dashboard/index.tsx`
**Problème :** Tous les composants dashboard sont importés statiquement dans un seul fichier.

**Impact :** Le bundle initial inclut tous les dashboards (locataire, proprio, agence, TC, admin).

**Fix :** Utiliser `React.lazy()` et `Suspense`.

---

### 🟡 P5 — Utilisation inefficace de `useCallback`
**Problème :** `useCallback` est utilisé systématiquement pour les fonctions de fetch, mais souvent les dépendances changent à chaque rendu, rendant le memo useless.

---

## 8. Problèmes de sécurité

### 🔴 S1 — Données sensibles dans les logs
**Fichiers :** `src/lib/cryptoneo.ts`, `src/lib/intouch.ts`, Edge Functions
```typescript
console.log('[cryptoneo] Token obtained successfully, expires at:', ...)
console.log('[sign-send-otp] User data:', userData)
console.log('[PATCH /api/properties] uploading image', ...)
```
**Impact :** Tokens d'API, données utilisateur, chemins de fichiers exposés dans les logs.

---

### 🟠 S2 — Rate limiter sous-utilisé
**Fichier :** `src/lib/rate-limiter.ts`
**Problème :** Un rate limiter existe mais il n'est pas clair s'il est appliqué à toutes les routes sensibles (auth, OTP, etc.).

---

### 🟠 S3 — Pas de CSRF protection
**Problème :** L'application utilise des cookies pour l'auth mais Next.js ne fournit pas de protection CSRF automatique.

---

### 🟠 S4 — `as any` dans les requêtes Supabase
**Problème :** `(supabase.from('users') as any).update(updateData as any)` — les attaques par injection de champs ne sont pas détectées.

---

## 9. Problèmes d'accessibilité

### 🟡 A11Y1 — `aria-label` manquants
**Fichier :** Plusieurs composants
- Boutons d'icônes sans `aria-label`
- Images sans `alt` text
- `aria-expanded` manquant sur certains boutons

### 🟡 A11Y2 — Contraste des couleurs
**Problème :** Le thème clair utilise des couleurs qui pourraient ne pas passer les tests WCAG AA.

### 🟡 A11Y3 — Navigation clavier
**Problème :** Les tabs, modales et dropdowns peuvent avoir des problèmes de focus trap.

---

## 10. Fonctionnalités manquantes

### 🟢 Priorité Haute

| # | Fonctionnalité | Raison |
|---|---------------|--------|
| M1 | **Tests automatisés** | Aucun test n'existe |
| M2 | **Page 404 personnalisée** | Existe dans `not-found.tsx` mais n'est pas utilisée |
| M3 | **Monitoring / Error Tracking** | Pas de Sentry, LogRocket, etc. |
| M4 | **Analytics** | Pas de Google Analytics, Plausible, etc. |
| M5 | **SEO / SSR** | Next.js utilisé comme SPA |

### 🟢 Priorité Moyenne

| # | Fonctionnalité | Raison |
|---|---------------|--------|
| M6 | **Pagination unifiée** | Pagination custom dans plusieurs composants |
| M7 | **Filtres persistants dans l'URL** | Les filtres sont perdus au refresh |
| M8 | **Export PDF/CSV** | Pas d'export de données |
| M9 | **Mode hors-ligne complet** | Seulement une bannière offline |
| M10 | **Push notifications (mobile)** | Capacitor push-notifications installé mais pas intégré |
| M11 | **Internationalisation (i18n)** | next-intl installé mais pas configuré |
| M12 | **Dark mode complet** | ThemeProvider présent mais peut-être incomplet |

### 🟢 Priorité Faible

| # | Fonctionnalité |
|---|---------------|
| M13 | **Sitemap / Robots.txt** dynamiques |
| M14 | **Open Graph / Social Cards** |
| M15 | **Service Worker / PWA** |
| M16 | **Storybook / Documentation composants** |
| M17 | **CI/CD Pipeline** |
| M18 | **Tests de charge / Stress tests** |

---

## 11. Dette technique

### 🧹 DT1 — Code dupliqué

| Zone | Description |
|------|-------------|
| **Messagerie** | Messages component dupliqué pour TC (`tc/messaging.tsx`), locataire (`locataire/messages.tsx`), propriétaire (`proprietaire/messages.tsx`) |
| **Settings** | Settings component dupliqué pour chaque rôle (locataire, proprio, agence, TC) |
| **Systemes de fetch** | `authFetch` + `apiFetch` + TanStack Query — 3 systèmes différents |
| **Pagination** | Logique de pagination réimplémentée dans chaque composant |

### 🧹 DT2 — Fichiers trop longs

| Fichier | Lignes |
|---------|--------|
| `property-detail-view.tsx` | ~2300 lignes |
| `auth-store.ts` | ~700 lignes |
| `property-verify-detail.tsx` | ~900 lignes |
| `nos-biens-view.tsx` | ~1300 lignes |
| `enhanced-leases.tsx` | ~2000 lignes |
| `dashboard/index.tsx` | ~250 lignes (tous les imports + switch cases) |

### 🧹 DT3 — Code mort

| Élément | Raison |
|---------|--------|
| `next-auth` | Installé mais pas utilisé |
| `next-intl` | Installé mais pas configuré |
| `src/lib/db_check.ts` | Script de debug, pas appelé |
| `android/.idea/` fichiers XML | Générés par IDE, committés |

---

## 12. Recommandations priorisées

### Immédiat (Sprint 1-2)

1. ✅ **Activer React Strict Mode** et corriger les bugs
2. ✅ **Nettoyer les console.log** en production
3. ✅ **Corriger les `.catch(() => {})` silencieux** — au moins logger
4. ✅ **Unifier les toasts** (choisir Sonner ou shadcn)
5. ✅ **Ajouter un error boundary global**

### Court terme (Sprint 3-4)

6. ✅ **Remplacer les `as any`** par les types Supabase générés
7. ✅ **Migrer authFetch vers TanStack Query** progressivement
8. ✅ **Séparer l'auth store monolithique**
9. ✅ **Ajouter des tests unitaires** pour les fonctions critiques (auth, paiement, signature)
10. ✅ **Configurer le bundle analyzer** et optimiser

### Moyen terme (Sprint 5-8)

11. ✅ **Lazy loading des dashboards** avec `React.lazy()`
12. ✅ **Système de logger structuré** (pino, winston)
13. ✅ **Refactorer les composants longs** (property-detail-view, enhanced-leases)
14. ✅ **Ajouter Sentry ou équivalent** pour le monitoring
15. ✅ **Internationalisation** (si prévue)

### Long terme (Sprint 9+)

16. ✅ **Migration vers le App Router Next.js** pour le SEO
17. ✅ **PWA complète** (Service Worker + cache)
18. ✅ **CI/CD Pipeline** (GitHub Actions, tests automatisés)
19. ✅ **Storybook** pour les composants UI
20. ✅ **Tests E2E** (Playwright ou Cypress)

---

## 13. Fonctionnalités existantes impressionnantes

Malgré les points d'amélioration, l'application dispose déjà de fonctionnalités avancées :

### ✅ Ce qui est bien fait

| Fonctionnalité | Description |
|---------------|-------------|
| **Signature CryptoNeo** | Signature électronique avec OTP SMS/Email |
| **Paiements Intouch** | Intégration Orange Money et MTN Mobile Money |
| **Vérification ONECI** | Vérification d'identité nationale |
| **Certification utilisateur** | Système de certification avec alias CryptoNeo |
| **États des lieux numériques** | Création et signature d'états des lieux |
| **Dashboard multi-rôle** | 5 rôles avec dashboards spécialisés |
| **Tiers de Confiance** | Module complet de vérification et modération |
| **Real-time** | Notifications et mises à jour en temps réel via Supabase Realtime |
| **Capacitor mobile** | Application Android fonctionnelle |
| **Rate limiting** | Protection contre les abus sur les routes sensibles |
| **Caching intelligent** | Stale-while-revalidate custom |
| **Dark mode** | Support thème clair/sombre |
| **Gestion de session** | Heartbeat et sliding session |
| **Sécurité** | Rate limiter, sessions, audit logs, 2FA |

---

## Notes techniques additionnelles

### Edge Functions Supabase

| Function | Rôle |
|----------|------|
| `sign-send-otp` | Envoi OTP signature CryptoNeo |
| `sign-verify` | Vérification signature |
| `sign` | Signature de documents |
| `generate-certificate` | Génération certificat CryptoNeo |
| `check-certificate` | Vérification certificat |
| `retrieve-certificates` | Récupération certificats |
| `payment-initiate` | Initiation paiement Intouch |
| `payment-callback` | Callback paiement |
| `payment-transfer` | Transfert paiement |
| `kyc-face-auth` | Vérification faciale |
| `_test` | Test |

### Dépendances clés

| Package | Utilisation |
|---------|-------------|
| `framer-motion` | Animations |
| `lucide-react` | Icônes |
| `recharts` | Graphiques |
| `leaflet` | Cartes |
| `date-fns` | Dates |
| `sonner` | Toasts |
| `zod` | Validation |
| `input-otp` | Input OTP |
| `vaul` | Drawer mobile |
| `cmdk` | Command menu |
| `@dnd-kit` | Drag & drop |

---

> **Document généré par audit automatique — 26 mai 2026**
> **Prochaine révision recommandée : après les correctifs critiques**
