# Fiche Projet - MonToit Platform

## Identifications du Projet

| Element                | Detail                              |
| ---------------------- | ----------------------------------- |
| **Nom du projet**      | MonToit Platform                    |
| **Type**               | Plateforme immobiliere web & mobile |
| **Secteur**            | Immobilier / Location de biens      |
| **Pays cible**         | Cote d'Ivoire                       |
| **Version actuelle**   | 3.3.0                               |
| **Branche principale** | `main`                              |
| **Depot Git**          | Git repository (actif)              |

---

## Objectifs du Projet

MonToit est une plateforme complete de location immobiliere en Cote d'Ivoire qui connecte :

- **Locataires** : Recherche et candidature aux locations
- **Proprietaires** : Gestion et publication de biens
- **Agences immobilieres** : Gestion de portefeuille et mandats
- **Agents** : Representation des agences

---

## Architecture Technique

### Stack Technologique

| Couche               | Technologies                                      |
| -------------------- | ------------------------------------------------- |
| **Frontend**         | React 18.3, TypeScript, Vite 7.3, Tailwind CSS    |
| **Routing**          | React Router 7 avec lazy loading                  |
| **UI Components**    | Radix UI, Lucide React, Recharts                  |
| **Backend**          | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| **Mobile**           | Capacitor (iOS/Android)                           |
| **State Management** | TanStack Query, React Context                     |
| **Testing**          | Vitest, React Testing Library                     |

### Integrations Externes

| Service                      | Utilisation                     |
| ---------------------------- | ------------------------------- |
| **Azure OpenAI**             | Chatbot IA                      |
| **Azure Cognitive Services** | Reconnaissance vocale           |
| **Mapbox / Google Maps**     | Services de cartographie        |
| **NeoFace / Smileless**      | Reconnaissance faciale          |
| **CryptoNeo**                | Signatures electroniques        |
| **Resend**                   | Services email                  |
| **IN TOUCH**                 | Paiements mobile money          |
| **CNAM**                     | Verification identite nationale |

---

## Structure du Projet

```
montoit/
├── src/
│   ├── app/                    # Point d'entree applicatif
│   │   ├── routes/            # Definitions des routes par domaine
│   │   ├── layout/            # Composants de layout (Header, Footer)
│   │   ├── providers/         # Context providers (AuthProvider)
│   │   ├── App.tsx            # Composant racine
│   │   └── routes.tsx         # Configuration principale des routes
│   │
│   ├── features/              # Modules orientes domaine
│   │   ├── auth/             # Authentification (login, signup, profil)
│   │   ├── property/         # Gestion et recherche de biens
│   │   ├── tenant/           # Fonctionnalites locataires
│   │   ├── owner/            # Fonctionnalites proprietaires
│   │   ├── agency/           # Fonctionnalites agences
│   │   ├── admin/            # Panneau d'administration
│   │   ├── messaging/        # Messagerie temps reel
│   │   ├── verification/     # Verification d'identite
│   │   ├── contract/         # Contrats de location
│   │   ├── dispute/          # Gestion des litiges
│   │   ├── trust-agent/      # Gestion des agents de confiance
│   │   └── agent/           # Fonctionnalites agents
│   │
│   ├── components/           # Composants UI partages
│   ├── services/              # Services API et logique metier
│   ├── hooks/                 # Hooks React personnalises
│   ├── lib/                   # Utilitaires et helpers
│   ├── types/                 # Definitions de types TypeScript
│   ├── contexts/              # Contexts React
│   ├── shared/                # Utilitaires et UI partages
│   ├── pages/                 # Composants de pages par domaine
│   └── integrations/          # Integrations tierces (Supabase, etc.)
│
├── supabase/
│   ├── config/               # Configuration Supabase
│   ├── migrations/           # Migrations de base de donnees
│   └── functions/            # Edge Functions Supabase
│       ├── send-sms-azure/   # Envoi SMS via Azure
│       ├── verify-otp-azure/  # Verification OTP
│       └── ...
│
├── public/                   # Assets statiques
├── capacitor.config.ts       # Configuration Capacitor
├── vite.config.ts           # Configuration Vite
└── package.json             # Dependances Node.js
```

---

## Roles Utilisateurs

### Types d'utilisateurs metier (`profiles.user_type`)

- **`tenant` / `locataire`** - Chercheurs de logement
- **`owner` / `proprietaire`** - Proprietaires de biens
- **`agent` / `agence`** - Agences immobilieres

### Roles systeme (`user_roles` table)

- **`admin`** - Administrateurs plateforme
- **`moderator`** - Modateurs de contenu
- **`trust_agent`** - Specialistes de verification
- **`user`** - Role par defaut

---

## Architecture de Securite

| Mecanisme            | Description                                         |
| -------------------- | --------------------------------------------------- |
| **Authentication**   | Supabase Auth avec auto-rafraichissement de session |
| **Autorisation**     | Row Level Security (RLS) sur toutes les tables      |
| **Controle d'acces** | `ProtectedRoute` avec verification par role         |
| **JWT**              | Tokens JWT avec rafraichissement automatique        |
| **Audit**            | Logging des actions administrateurs                 |
| **Rate limiting**    | Protection contre les abus API                      |
| **Cles API**         | Gestion securisee des cles externes                 |

---

## Schema de Base de Donnees

### Tables principales

- `profiles` - Profils utilisateurs avec role
- `properties` - Annonces de biens
- `leases` - Baux et contrats
- `agencies` - Profils d'agences
- `agency_mandates` - Mandats de gestion
- `rental_applications` - Candidatures locataires
- `property_visits` - Visites programmees
- `messages` - Messagerie temps reel
- `notifications` - Notifications utilisateurs
- `payments` - Transactions de paiement
- `identity_verifications` - Verifications KYC
- `digital_certificates` - Certificats numeriques
- `reviews` - Avis et notes

---

## Architecture des Routes

### Routes publiques (`/`)

- Page d'accueil
- Recherche de biens
- Details d'un bien

### Routes par role

- `/dashboard` - Redirection intelligente selon le role
- `/locataire/*` - Routes locataires
- `/proprietaire/*` - Routes proprietaires
- `/agences/*` - Routes agences
- `/agent/*` - Routes agents
- `/admin/*` - Panel admin (layout imbrique)
- `/moderator/*` - Routes moderateurs
- `/auth/*` - Routes d'authentification

---

## Systeme de Design

### Design Tokens

- **Couleurs**: Primary (orange #ff6c2f), neutres (neutral-900, neutral-700)
- **Typographie**: Polices claires et lisibles
- **Spacing**: Grille 4pt
- **Touch targets**: Minimum 44px pour mobile
- **Accessibility**: Conformite WCAG AA

### Composants UI (`src/shared/ui/`)

- Formulaire: Button, Input, Card, Select, Checkbox, Switch
- Layout: Grid, Flexbox, Containers
- Affichage: Tables, Charts, Badges, Progress
- Feedback: Toasts, Modals, Error boundaries
- Navigation: Headers, Footers, Breadcrumbs
- Specialises: Maps, Signature pads, File uploaders, Galleries

---

## Fonctionnalites Principales

### 1. Authentification & Gestion Utilisateur

- Inscription email/mot de passe, OAuth (Google, Facebook)
- Gestion de profils multi-roles
- Verification d'identite (reconnaissance faciale, CNAM)
- Authentification OTP (Email/SMS) via Azure
- Controle d'acces base sur les roles

### 2. Gestion des Biens

- Creation/edition/recherche de biens
- Filtres avances (localisation, prix, equipements, type)
- Types: appartements, maisons, studios, villas, duplex
- Verification ANSUT
- Documents, certificats, images
- Visites virtuelles (video)

### 3. Agences & Agents

- Profils d'agences complets avec verification
- Gestion des agents d'agence
- Systeme de mandats
- Suivi des commissions
- Collaboration en equipe

### 4. Baux & Contrats

- Contrats numeriques PDF (jspdf)
- Signatures electroniques (CryptoNeo)
- Gestion des baux et rappels de renouvellement
- Gestion des cautions
- Templates de contrats

### 5. Fonctionnalites Locataire

- Systeme de candidature
- Gestion des paiements de loyer
- Communication avec proprietaires/agents
- Avis et notations
- Notifications (rappels, visites)

### 6. Fonctionnalites Proprietaire

- Dashboard proprietaire
- Gestion des locataires
- Suivi des revenus/depenses
- Demandes de maintenance
- Stockage de documents

### 7. Messagerie & Communication

- Chat temps reel (WebSocket)
- Conversations de groupe
- Partage de fichiers
- Systeme de notifications (in-app + push)
- Integration WhatsApp

### 8. Verification & Securite

- Verification identite (CNAM, reconnaissance faciale)
- Verification documents (CNI, passeport, factures)
- Systeme Trust Agent (tierce partie certifiee)
- Stockage securise chiffre
- Audit logging

### 9. Panel Admin

- Gestion utilisateurs
- Supervision des biens
- Dashboard analytique
- Configuration des services
- Feature flags

---

## Commandes de Developpement

```bash
# Developpement
npm run dev              # Serveur dev (port 8080)
npm run build           # Build production
npm run build:analyze   # Analyse du bundle

# Qualite
npm run lint            # ESLint
npm run lint:fix        # Auto-fix
npm run typecheck       # TypeScript

# Tests
npm run test            # Tests unitaires
npm run test:ui         # UI de tests
npm run test:coverage   # Couverture
npm run test:security   # Tests securite
npm run memory-audit    # Detection memory leaks

# Mobile (Capacitor)
npx cap sync            # Sync assets web vers natif
npx cap open ios        # Ouvrir projet iOS
npx cap open android    # Ouvrir projet Android
```

---

## Configuration

### Variables d'environnement requises

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
```

### Services optionnels

- Azure OpenAI (Chatbot)
- Mapbox / Google Maps
- Azure SMS
- Resend (Email)
- IN TOUCH (Mobile Money)

### Fichiers de configuration

- `src/config/api-keys.config.ts` - Cles API externes
- `src/config/app.config.ts` - Settings applicatifs
- `src/config/env.config.ts` - Validation env vars
- `src/config/routes.config.ts` - Constantes routes

---

## Configuration Mobile

### Capacitor

- **App ID**: `ci.montoit.app`
- **Hybrid app** avec web view
- **Plugins**: Camera, Geolocation, Push notifications, Filesystem
- **Splash screen** personnalise

### Fonctionnalites natives

- **Camera**: Photos biens, profil
- **Geolocation**: Cartographie, proximite
- **Push Notifications**: Alertes temps reel
- **File System**: Stockage local
- **Share**: Partage natif

---

## Tests & QA

### Framework de tests

- **Vitest** pour les tests unitaires
- **React Testing Library** pour les composants
- **Tests securite** avec config dediee
- **Tests memory leaks** pour performance
- **Tests d'integration** E2E

### Qualite de code

- **ESLint** avec regles React
- **Prettier** pour le formatage
- **TypeScript** pour la surete de type
- **Husky** pour git hooks
- **Lint-staged** pour pre-commit checks

---

## Patterns & Decisions Architecturales

### Design Domain-Driven (DDD)

- Features organises par domaine metier
- Separation claire des preoccupations
- Structure modulaire orientee fonctionnalite

### Amelioration Progressive

- Fonctionnalites core sans JavaScript
- Chargement progressif des features non-critiques
- Support offline ou possible

### Security First

- JWT avec rafraichissement automatique
- RLS sur toute la base
- Gestion securisee des cles API
- Audits de securite reguliers

### Performance

- Lazy loading des routes
- Optimisation des images
- Code splitting
- Strategies de caching
- Analyse de bundle

### Internationalisation

- Support francais
- Architecture multi-langues
- Contenu localisable

---

## Workflow de Developpement

### Git

- Branches features depuis `main`
- Commits conventionnels
- Pre-commit hooks pour qualite
- CI/CD pour deploiement automatises

### Convention de commits

```
feat: nouvelle fonctionnalite
fix: correction de bug
refactor: refactoring
docs: documentation
test: tests
chore: taches diverses
```

---

## Statistiques du Projet

| Metrique                  | Valeur     |
| ------------------------- | ---------- |
| **Langage principal**     | TypeScript |
| **Framework**             | React 18.3 |
| **Nombre de routes**      | 50+        |
| **Composants UI**         | 80+        |
| **Services backend**      | 15+        |
| **Edge Functions**        | 10+        |
| **Integrations externes** | 8+         |
| **Roles utilisateurs**    | 6          |

---

## Informations de Support

### Signalement d'issues

- GitHub: https://github.com/anthropics/claude-code/issues

### Documentation

- Documentation developpeur: `CLAUDE.md`
- Fichiers de configuration: `src/config/`

---

**Version du document**: 1.0
**Date de generation**: 19 fevrier 2026
