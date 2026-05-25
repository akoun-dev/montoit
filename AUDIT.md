# Audit du Projet Mon Toit

> Date : 25 mai 2026
> Version : 4.0.0
> Stack : Next.js 16, Supabase, Tailwind v4, shadcn/ui, Capacitor 8

---

## 1. FONCTIONNALITÉS MANQUANTES

### 1.1 Tests (Critique)

- **Aucun test** n'existe dans le projet (0 fichier `*.test.*`, 0 dossier `__tests__`)
- Aucune infrastructure de test (Vitest, Jest, Playwright, Cypress)
- Pas de tests unitaires, d'intégration, ni E2E
- **Risque** : chaque déploiement est un pari, aucune garantie de non-régression

### 1.2 Pages d'erreur Next.js (Manquantes)

| Fichier | Statut |
|---------|--------|
| `src/app/error.tsx` | ❌ Absent |
| `src/app/loading.tsx` | ❌ Absent |
| `src/app/not-found.tsx` | ❌ Absent |
| `src/app/global-error.tsx` | ❌ Absent |

- En cas d'erreur runtime, l'utilisateur verra un écran blanc ou une erreur générique
- Aucune page 404 personnalisée

### 1.3 Page hors-ligne Capacitor

- `capacitor.config.ts` référence `offline.html` comme `errorPath`
- Le fichier `public/offline.html` n'existe pas → l'APK Capacitor n'a pas de page de secours hors-ligne

### 1.4 Internationalisation (i18n)

- `next-intl` est dans `package.json` mais **n'est pas configuré**
- Aucun dossier `messages/` avec les traductions
- Aucun fichier de configuration `i18n/request.ts` ou `next-intl.config.ts`
- Zone grise : l'app est 100% en français (client ivoirien), mais l'absence de structure i18n verrouille toute expansion à d'autres marchés

### 1.5 Vues Dashboard Sans Lien Sidebar

| Rôle | Vue/Composant | Lien Sidebar |
|------|--------------|--------------|
| Locataire | `trust-score` | ❌ Pas de lien |
| Locataire | `reviews` | ❌ Pas de lien |
| Locataire | `history` | ❌ Pas de lien |
| Propriétaire | `property-documents` | ❌ Pas de lien |
| Propriétaire | `history` | ❌ Pas de lien |
| Propriétaire | `security` | ❌ Pas de lien |
| Agence | `notifications` | ❌ Pas de lien |
| Agence | `security` | ❌ Pas de lien |
| TC | `notifications` | ❌ Pas de lien (dans sidebar mais pas d'item dédié) |
| TC | `rental-files-queue` | ❌ Pas de lien direct |
| TC | `rental-file-detail` | ❌ Pas de lien direct |
| TC | `owner-validations` | ❌ Pas de lien direct |
| TC | `agency-validations` | ❌ Pas de lien direct |
| Admin | `settings` | ❌ Pas de lien |

### 1.6 Recherche Globale

- Aucune barre de recherche globale dans le dashboard (pour chercher des propriétés, utilisateurs, baux)
- La recherche est limitée à des composants spécifiques (ex: `search-properties` pour locataire)

### 1.7 Signature des Mandats

- La signature des baux est implémentée (CRYPTONEO + OTP)
- La signature des mandats est **partielle** : routes API existent (`/api/mandats/[id]/sign`, `request-sign-otp`) mais l'UI n'est pas intégrée dans le flow propriétaire/agence
- La gestion des mandats du côté agence est basique (liste, création)
- Le PDF de mandat est généré (`generate-and-upload-mandat-pdf.ts`) mais le flux de signature complet n'est pas bouclé

### 1.8 Paiements

- L'initiation de paiement via Intouch est fonctionnelle (Edge Function `payment-initiate`)
- Le callback Intouch est géré (`payment-callback`)
- **Pas de page de confirmation/historique détaillé pour les paiements** dans l'interface propriétaire
- Le paiement automatique (prélèvement automatique) n'est pas implémenté
- Pas de système de factures/reçus PDF

### 1.9 Contrats / Baux

- La génération de bail PDF fonctionne (`generate-bail.tsx`)
- **Pas de modèle DOCX personnalisable** — le bail est généré en HTML → PDF avec `html-to-docx`
- Pas de gestion des avenants (modification de bail en cours)
- Pas de résiliation complète via l'interface (route `terminate` existe, mais UI limitée)

## 2. BUGS & PROBLÈMES IDENTIFIÉS

### 2.1 TypeScript : `ignoreBuildErrors: true` ⚠️

```ts
// next.config.ts
typescript: { ignoreBuildErrors: true }
```

- Les erreurs TypeScript sont **complètement ignorées** en build
- Impossible de savoir combien d'erreurs TS existent sans lancer `npx tsc --noEmit`
- Masque des bugs potentiels qui auraient été détectés à la compilation
- **Recommandation** : supprimer ce flag et corriger les erreurs

### 2.2 `isPhoneVerified` manquant dans AuthUser

```ts
// src/lib/auth-store.ts
export interface AuthUser {
    // ... champs existants
    // isPhoneVerified: boolean  ← MANQUANT
}
```

- Le champ `isPhoneVerified` est utilisé dans les composants (`settings.tsx`) et retourné par l'API (`/api/user/profile`), mais n'est pas déclaré dans le type `AuthUser`
- Le store utilise `isPhoneVerified: true` en dur ce qui est un hack dangereux

### 2.3 `.limit(1)` sans `.order()` dans plusieurs routes API

**Problème** : De nombreuses routes API utilisent `.limit(1)` sans spécifier d'ordre de tri (`order()`), ce qui peut retourner un enregistrement aléatoire en base de données.

Exemples :
- `src/app/api/auth/verify-phone-otp/route.ts` ligne 23
- `src/app/api/auth/verify-sms-otp/route.ts` ligne 25
- `src/app/api/auth/reset-password/route.ts` ligne 91
- `src/app/api/leases/[id]/contract/route.ts` ligne 137
- `src/app/api/leases/[id]/terminate/route.ts` ligne 101
- `src/app/api/leases/create/route.ts` ligne 205
- `src/app/api/mandats/route.ts` ligne 140
- `src/app/api/payments/advance/route.ts` ligne 53
- `src/app/api/scoring/route.ts` lignes 56, 63, 81, 88

**Risque** : Comportement non-déterministe — peut causer des bugs subtils.

### 2.4 React.StrictMode désactivé

```ts
// next.config.ts
reactStrictMode: false,
```

- Les doubles rendus en développement (pour détecter les effets de bord) sont désactivés
- Des bugs liés aux `useEffect` et aux mutations d'état peuvent passer inaperçus

### 2.5 Credentials API exposés dans `.env`

- Les fichiers `.env`, `.env.local` et `supabase/functions/.env` contiennent des clés API en clair :
  - CRYPTONEO_APP_KEY + CRYPTONEO_APP_SECRET
  - ONECI_API_KEY + ONECI_SECRET_KEY
  - NEOFACE_BEARER_TOKEN
  - INTOUCH_USERNAME + INTOUCH_PASSWORD
- Même si `.env` est dans `.gitignore`, ces fichiers ne devraient contenir que des exemples, pas des secrets réels
- `supabase/functions/.env` n'est probablement pas gitignoré

### 2.6 Fichiers de composants surdimensionnés

Plusieurs fichiers dépassent 1000 lignes, rendant la maintenance difficile :

- `src/components/dashboard/proprietaire/enhanced-leases.tsx` — ~2200 lignes
- `src/components/dashboard/locataire/settings.tsx` — ~2800 lignes
- `src/components/dashboard/locataire/search-properties.tsx` — ~1000 lignes
- `src/components/dashboard/proprietaire/owner-settings.tsx` — ~1000 lignes
- `src/components/home/property-detail-view.tsx` — ~1700 lignes
- `src/components/dashboard/tc/property-verify-detail.tsx` — ~1000 lignes

### 2.7 Manipulation DOM directe

- Plusieurs composants utilisent `document.createElement('a')` pour le téléchargement de fichiers plutôt qu'une approche React/Next.js idiomatique
- Cela fonctionne mais contourne le cycle de vie React

### 2.8 Hooks non utilisés / orphelins

- De nombreux hooks Realtime existent dans `src/hooks/` (use-realtime-*) qui pourraient ne plus être utilisés après la migration Prisma → Supabase
- Certains hooks Realtime sont importés mais jamais appelés

## 3. DETTE TECHNIQUE

### 3.1 Architecture Monolithique

- Le projet est un monolithe Next.js avec des Edge Functions Supabase pour les services externes
- Le dashboard est géré via un système de vues Zustand plutôt que du routing Next.js standard
- Le routing hybride (Zustand pour le dashboard + Next.js Router pour le public) crée une complexité inutile

### 3.2 Pas d'API Layer cohérente

- Mélange de patterns :
  - Routes API Next.js (page router style)
  - Edge Functions Supabase (Deno)
  - Appels directs Supabase depuis le client (via `getSupabaseBrowserClient`)
- Pas de client API centralisé ni de typage partagé entre client et serveur

### 3.3 State Management Fragile

- Zustand + localStorage pour la persistance
- `lastAuthenticatedAt` avec un TTL de 30 jours — pas de rafraîchissement de session en arrière-plan
- Le merge de state lors de la rehydration est complexe et source de bugs

### 3.4 Worklog.md obselète

- Le fichier `worklog.md` contient l'historique complet des tâches
- Très long, difficile à naviguer
- Devrait être remplacé par des commits Git conventionnels (conventional commits) et des tags de release

### 3.5 Pas d'Orchestration de Conteneurs

- `ecosystem.config.js` (PM2) est configuré pour la production
- **Pas de Dockerfile** ni `docker-compose.yml` pour l'environnement de développement
- La reproductibilité des builds n'est pas garantie

### 3.6 Absence de CI/CD

- Pas de fichier de workflow GitHub Actions / GitLab CI
- Pas de linting automatique, tests, ou déploiement automatisé

### 3.7 Versionnement des Migrations

- Les migrations Supabase sont numérotées par `YYYYMMDDHHMMSS` (ex: `20260518131900`)
- Plusieurs migrations manquent de `DOWN` (rollback)
- Certaines migrations semblent modifiées après coup (numéros 20260522000001-20260522000006 non consécutifs)

## 4. PROBLÈMES DE SÉCURITÉ

### 4.1 Clés API en clair dans le dépôt

- Voir section 2.5
- **Risque** : Si `.env` est commité par erreur ou si `supabase/functions/.env` n'est pas gitignoré, toutes les clés sont compromises

### 4.2 Absence de Rate Limiting

- Aucune route API n'implémente de rate limiting
- Les endpoints d'OTP (`/api/auth/send-sms-otp`, `/api/auth/send-email-otp`) sont particulièrement vulnérables au SMS bombing / email bombing
- Les endpoints de signature et paiement pourraient être abusés

### 4.3 Pas de Protection CSRF

- Les routes API utilisent des cookies d'authentification mais n'ont pas de token CSRF
- Certaines routes en GET modifient l'état (via Supabase Realtime) — pas de vérification d'origine

### 4.4 Validation des Entrées

- Zod est utilisé (`package.json` : `zod: "^4.0.2"`) mais n'est pas systématiquement employé sur toutes les routes API
- Plusieurs routes font confiance aux données entrantes sans validation de schéma

### 4.5 Sessions Sans Rotation

- Les sessions SMS OTP (`sessions` table) n'ont pas de mécanisme de rotation après usage
- Le token de session est stocké en cookie httpOnly mais pas régénéré après des actions sensibles

## 5. PROBLÈMES DE PERFORMANCE

### 5.1 Pas de Pagination Cohérente

- Plusieurs endpoints retournent des listes sans pagination (ex: `/api/admin/users`)
- D'autres utilisent `.limit(N)` mais sans offset/gestion de curseur
- Aucun endpoint ne supporte la pagination côté client (nombre total de pages, etc.)

### 5.2 Images Non Optimisées

- Les images de propriétés sont stockées dans Supabase Storage
- **Pas de génération de thumbnails** ni de redimensionnement automatique
- Les images sont servies en full résolution, même pour les cards/thumbnails

### 5.3 Rendu Côté Client Uniquement

- L'ensemble de l'application est en `'use client'` — pas de Server Components
- Pas de streaming SSR
- Le chargement initial est lent car tout le JS doit être téléchargé et exécuté

### 5.4 Bundle JavaScript Important

- Avec toutes les dépendances (shadcn/ui, recharts, framer-motion, leaflet, react-markdown, etc.), le bundle JS est probablement > 500KB
- Aucune stratégie de code splitting visible

## 6. MANQUES UX/FONCTIONNELS

### 6.1 Notifications Push

- Capacitor PushNotifications est configuré, mais l'infrastructure serveur pour envoyer des notifications push (Firebase Cloud Messaging) n'est pas implémentée
- Les notifications existent seulement dans l'interface (table `notifications`) et via WebSocket

### 6.2 Mapping / Géolocalisation

- Leaflet est implémenté sur la page d'accueil (`PropertyMap`)
- **Pas de carte interactive** dans le dashboard pour visualiser les biens sur une carte
- La recherche par localisation est textuelle (commune) sans carte interactive

### 6.3 Signature Manuscrite

- Le composant `SignaturePad` existe
- Utilisé seulement pour les baux (locataire + propriétaire)
- **Pas utilisé pour les mandats** ni pour les états des lieux

### 6.4 Chat/Messagerie

- La messagerie est implémentée (conversations, messages)
- **Pas de notifications en temps réel** pour les nouveaux messages (pas de WebSocket dédié)
- Pas de pièces jointes dans les messages (table `message_attachments` existe mais UI limitée)

### 6.5 Rôles et Permissions

- Les rôles sont gérés via `activeRole` dans la table `users`
- Pas de système de permissions granulaires (RBAC)
- La vérification des droits est faite "à la main" dans chaque route API

### 6.6 Audit Logs

- La table `audit_logs` existe et est utilisée
- **Pas d'interface d'audit** pour les admins (route API existe mais UI très basique)
- Pas d'export des logs d'audit

## 7. NOTES DÉPLOIEMENT & INFRASTRUCTURE

### 7.1 Environnement de Production

- PM2 configuré pour Next.js standalone
- Caddyfile présent — probablement pour le reverse proxy
- **Pas de configuration Docker** pour les Edge Functions ou le mini-service WebSocket

### 7.2 Variables d'Environnement Manquantes

Variables présentes dans `.env.local.example` mais absentes de `.env` ou inversement :

| Variable | `.env` | `.env.local.example` | Notes |
|----------|--------|----------------------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | ❌ | Critique pour l'admin Supabase |
| `ANSUT_SMS_API_KEY` | ❌ | ❌ | Mentionné dans ansut-messaging.ts |
| `ANSUT_EMAIL_API_KEY` | ❌ | ❌ | Mentionné dans ansut-messaging.ts |
| `CRYPTONEO_API_URL` | ✅ demo | ✅ prod (différent) | Incohérence entre les URLs |

### 7.3 Secrets Supabase Edge Functions Non Déployés

- Les Edge Functions utilisent `Deno.env.get('CRYPTONEO_APP_KEY')` etc.
- Ces secrets doivent être déployés manuellement via `npx supabase secrets set`
- **Aucun script de déploiement** automatisé pour les secrets

## 8. RECOMMANDATIONS PRIORITAIRES

### 🔴 Critique (Faire avant tout déploiement)

1. Supprimer `ignoreBuildErrors: true` et corriger toutes les erreurs TypeScript
2. Ajouter des pages `error.tsx`, `loading.tsx`, `not-found.tsx`
3. Créer la page `public/offline.html` pour Capacitor
4. Nettoyer les clés API des fichiers `.env` — utiliser exclusivement des secrets
5. Ajouter du rate limiting sur les endpoints OTP
6. Ajouter `isPhoneVerified` au type `AuthUser`

### 🟡 Important (Prochaine itération)

7. Mettre en place une infrastructure de tests (Vitest + Testing Library)
8. Ajouter des ordres de tri (`.order()`) à tous les `.limit(1)`
9. Refactorer les composants de plus de 1000 lignes
10. Ajouter la pagination sur tous les endpoints de liste
11. Configurer CI/CD (GitHub Actions)

### 🟢 Souhaitable (Backlog)

12. Implémenter l'i18n (next-intl)
13. Dockeriser l'application
14. Ajouter des thumbnails pour les images de propriétés
15. Migrer le dashboard vers le routing Next.js natif (App Router)
16. Ajouter la signature de mandat dans l'UI
17. Implémenter les notifications push Firebase
18. Ajouter une carte interactive dans le dashboard
19. Centraliser la validation des entrées avec Zod
20. Créer une documentation technique complète

---

## Annexe A : Statistiques du Projet

| Métrique | Valeur |
|----------|--------|
| Composants Dashboard | ~65 fichiers |
| Routes API | ~95 fichiers |
| Edge Functions | 12 fonctions |
| Migrations Supabase | 46 fichiers |
| Hooks Realtime | ~15 hooks |
| Tests | 0 |
| Pages d'erreur | 0 |
| Fichiers >500 lignes | ~8 fichiers |
| Dépendances package.json | ~70 dépendances |

## Annexe B : Arbre des Rôles et Fonctionnalités

```
PUBLIC
├── Hero / Landing
├── Nos Biens (search)
├── Comment ça marche
├── Rôles (Locataire, Proprio, Agence)
├── Confiance & Sécurité
├── À Propos
├── FAQ
├── Nous Contacter
└── Détail Propriété

AUTH
├── Login (email + SMS OTP)
├── Register
├── Forgot / Reset Password
└── Vérification email

DASHBOARD
├── LOCATAIRE
│   ├── Overview ✅
│   ├── Search Properties ✅
│   ├── Favorites ✅
│   ├── Applications ✅
│   ├── Visits ✅
│   ├── Leases ✅ (signature CRYPTONEO)
│   ├── Payments ✅
│   ├── Messages ✅
│   ├── Disputes ✅
│   ├── Notifications ✅
│   ├── Maintenance ✅
│   ├── Settings ✅
│   ├── Trust Score ❌ (no sidebar link)
│   ├── Reviews ❌ (no sidebar link)
│   └── History ❌ (no sidebar link)
│
├── PROPRIÉTAIRE
│   ├── Overview ✅
│   ├── My Properties ✅
│   ├── Tenants ✅
│   ├── Visit Requests ✅
│   ├── Candidatures ✅
│   ├── Leases ✅ (signature CRYPTONEO)
│   ├── Mandats ⚠️ (signature partielle)
│   ├── Maintenance ✅
│   ├── Payments ✅
│   ├── Finances ✅
│   ├── Analytics ✅
│   ├── Messages ✅
│   ├── Disputes ✅
│   ├── Settings ✅
│   ├── Property Documents ❌ (no sidebar link)
│   ├── Security ❌ (no sidebar link)
│   └── Reviews ✅
│
├── AGENCE
│   ├── Overview ✅
│   ├── Portfolio ✅
│   ├── Mandats ⚠️ (signature manquante)
│   ├── Candidatures ✅
│   ├── Visits ✅
│   ├── Contracts ✅
│   ├── Team ✅
│   ├── Finances ✅
│   ├── Analytics ✅
│   ├── Communication ✅
│   ├── Marketing ✅
│   ├── Client Files ✅
│   ├── Settings ✅
│   ├── Disputes ✅
│   ├── Notifications ❌ (no sidebar link)
│   └── Security ❌ (no sidebar link)
│
├── TIERS DE CONFIANCE
│   ├── Overview ✅
│   ├── All Properties ✅
│   ├── Property Verifications ✅
│   ├── Dossier Validations ✅
│   ├── ONECI ✅
│   ├── Users ✅
│   ├── Certifications ✅
│   ├── Inventory Reports ✅
│   ├── Agents ✅
│   ├── Missions ✅
│   ├── Documentation ✅
│   ├── Fraud Alerts ✅
│   ├── Messaging ✅
│   ├── SLA Monitoring ✅
│   ├── Litiges ✅
│   ├── Settings ✅
│   └── Notifications ❌ (pas de lien dédié)
│
└── ADMIN
    ├── Overview ✅
    ├── Users ✅
    ├── Content Moderation ✅
    ├── Properties Moderation ✅
    ├── TC Management ✅
    ├── Trust Agents ✅
    ├── Signalements ✅
    ├── Disputes ✅
    ├── Notifications ✅
    ├── System ✅
    ├── Security ✅
    ├── Reports ✅
    ├── Config ✅
    ├── Backups ✅
    └── Settings ❌ (pas de lien sidebar)
```
