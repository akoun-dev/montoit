# MonToit Platform

<div align="center">

![MonToit Logo](https://img.shields.io/badge/MonToit-Immobilier-orange?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?style=for-the-badge&logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase)

**Une plateforme immobilière moderne pour la location de biens en Côte d'Ivoire**

[Documentation](#-documentation) • [Démos](#-démonstration) • [Contribuer](#-contribuer)

</div>

---

## Table des matières

- [À propos](#-propos)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Développement](#-développement)
- [Tests](#-tests)
- [Déploiement](#-déploiement)
- [Structure du projet](#-structure-du-projet)
- [Technologies](#-technologies)
- [Contribuer](#-contribuer)
- [Licence](#-licence)

---

## À propos

MonToit est une plateforme immobilière complète qui connecte les locataires, les propriétaires et les agences immobilières en Côte d'Ivoire. La plateforme offre une expérience utilisateur moderne, accessible et sécurisée pour la recherche, la location et la gestion de biens immobiliers.

### Utilisateurs cibles

- **Locataires** : Recherche de propriétés, candidatures, paiement de loyer
- **Propriétaires** : Gestion de biens, contrats de location, suivi des paiements
- **Agences** : Gestion de portefeuille, équipes, mandats et commissions
- **Administrateurs** : Modération, vérifications, analytics

---

## Fonctionnalités

### Locataires
- Recherche avancée de propriétés avec filtres (prix, localisation, type)
- Système de candidature avec pièces jointes
- Gestion des favoris et alertes de recherche
- Paiement de loyer en ligne (Mobile Money)
- Messagerie intégrée avec propriétaires/agences
- Suivi des demandes en temps réel

### Propriétaires
- Publication et gestion de propriétés
- Gestion des candidatures et sélection de locataires
- Génération de contrats de bail PDF
- Suivi des paiements et indexation de loyer
- État des lieux et rapports de départ
- Attribution de mandats aux agences

### Agences Immobilières
- Gestion de portefeuille de biens
- Gestion d'équipe d'agents
- Suivi des mandats et signatures électroniques
- Tableau de bord analytics et commissions
- Demandes d'inscription et validation
- Export de données et rapports

### Administration
- Panel d'administration complet
- Gestion des rôles et permissions
- Modération de contenu et avis
- Monitoring des services et API
- Logs d'audit et sécurité
- Gestion des fonctionnalités (feature flags)

### Fonctionnalités Transverses
- Authentification multi-facteurs
- Vérification d'identité (CNI, ONECI, CNAM)
- Chatbot IA pour assistance
- Notifications push et email
- Interface responsive (mobile, tablette, desktop)
- Application mobile native (iOS/Android via Capacitor)

---

## Architecture

MonToit est construite suivant une architecture **modulaire orientée domaine** (Domain-Driven Design) avec une séparation claire des préoccupations.

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
├─────────────────────────────────────────────────────────────┤
│  React 18 + TypeScript + Tailwind CSS + Radix UI            │
│  TanStack Query (Server State) + Zustand (Global State)     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Services Layer                          │
├─────────────────────────────────────────────────────────────┤
│  Auth │ Property │ Contract │ Payment │ Verification │ AI   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend Layer (Supabase)                  │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL + RLS │ Auth │ Storage │ Realtime │ Edge Fn    │
└─────────────────────────────────────────────────────────────┘
```

### Principes architecturaux

- **Feature Modules** : Chaque domaine (auth, property, contract...) est un module autonome
- **Lazy Loading** : Routes et composants chargés à la demande
- **Type Safety** : TypeScript strict avec types auto-générés depuis la base
- **State Management** : Séparation entre state global (Zustand) et state serveur (TanStack Query)
- **Security First** : RLS sur toutes les tables, auth JWT, validation des inputs

---

## Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** >= 20.x
- **npm** >= 10.x ou **pnpm** >= 8.x
- **Git** >= 2.x

Optionnel pour le mobile :
- **Xcode** (pour iOS)
- **Android Studio** (pour Android)

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/votre-organisation/montoit.git
cd montoit
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet :

```bash
cp .env.example .env
```

Éditez le fichier `.env` avec vos configurations (voir section [Configuration](#configuration)).

### 4. Initialiser la base de données

```bash
# Avec le CLI Supabase
npx supabase link
npx supabase db push
```

### 5. Lancer le serveur de développement

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:8080](http://localhost:8080).

---

## Configuration

### Variables d'environnement requises

```env
# Supabase (Obligatoire)
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anonyme
```

### Variables d'environnement optionnelles

```env
# Services Azure (IA)
VITE_AZURE_OPENAI_ENDPOINT=https://...
VITE_AZURE_OPENAI_API_KEY=...
VITE_AZURE_SPEECH_KEY=...

# Cartographie
VITE_MAPBOX_TOKEN=...
VITE_GOOGLE_MAPS_API_KEY=...

# Paiements
VITE_INTOUCH_API_KEY=...
VITE_CRYPTONEO_API_KEY=...

# Vérification d'identité
VITE_ONECI_API_URL=https://api-rnpp.verif.ci/api/v1
VITE_ONECI_API_KEY=...
VITE_ONECI_SECRET_KEY=...

# Vérification faciale
NEOFACE_BEARER_TOKEN=...
SMILELESS_TOKEN=...

# Notifications
VITE_BREVO_API_KEY=...
VITE_RESEND_API_KEY=...

# Analytics
VITE_GA4_MEASUREMENT_ID=...
VITE_SENTRY_DSN=...
```

> **Note** : La plateforme fonctionne avec uniquement les variables Supabase. Les services optionnels sont automatiquement désactivés si leurs clés ne sont pas configurées.

### Validation de la configuration

Au démarrage, l'application valide automatiquement la configuration et affiche :

- Services configurés
- Avertissements pour les services manquants optionnels
- Erreurs bloquantes pour les services obligatoires manquants

---

## Développement

### Commandes disponibles

```bash
# Serveur de développement
npm run dev                 # Port 8080 par défaut

# Build
npm run build               # Build de production optimisé
npm run build:dev           # Build de développement
npm run build:analyze       # Build + analyse du bundle

# Code quality
npm run lint                # Vérification ESLint
npm run lint:fix            # Auto-correction ESLint
npm run typecheck           # Vérification TypeScript
npm run format              # Formatage Prettier
npm run format:check        # Vérification format

# Tests
npm run test                # Tests unitaires
npm run test:ui             # Tests avec UI
npm run test:coverage       # Couverture de code

# Sécurité
npm run test:security       # Tests de sécurité
npm run test:security:all   # Tests sécurité complets

# Mobile (Capacitor)
npx cap sync                # Synchroniser assets natifs
npx cap open ios            # Ouvrir projet iOS
npx cap open android        # Ouvrir projet Android
```

### Aliases d'importation

Le projet utilise des alias TypeScript pour des imports plus propres :

```tsx
// Au lieu de :
import { Button } from '../../../components/ui/Button';

// Utilisez :
import { Button } from '@components';

// Autres alias disponibles
import { supabase } from '@integrations/supabase/client';
import { useAuth } from '@contexts';
import { ROUTES } from '@config';
```

Liste complète des alias :

| Alias | Cible |
|-------|-------|
| `@` | `src/` |
| `@config` | `src/config/` |
| `@components` | `src/components/` |
| `@pages` | `src/pages/` |
| `@services` | `src/services/` |
| `@hooks` | `src/hooks/` |
| `@lib` | `src/lib/` |
| `@types` | `src/types/` |
| `@contexts` | `src/contexts/` |
| `@stores` | `src/stores/` |

### Créer une nouvelle fonctionnalité

```bash
# Structure recommandée
src/features/
└── ma-fonctionnalite/
    ├── components/        # Composants spécifiques
    ├── pages/            # Pages liées
    ├── hooks/            # Hooks personnalisés
    ├── services/         # Services API
    ├── types/            # Types TypeScript
    └── index.ts          # Export public
```

### Convention de code

- **Components** : PascalCase (`UserProfile.tsx`)
- **Utils/Services** : camelCase (`formatDate.ts`)
- **Types** : PascalCase (`UserProfile.ts`)
- **Constants** : UPPER_SNAKE_CASE (`API_URL`)
- **Tests** : `.test.ts` ou `.spec.ts` à côté du fichier testé

### Git Hooks

Le projet utilise Husky pour les hooks Git :

- **pre-commit** : lint-staged (ESLint + Prettier sur les fichiers modifiés)
- **commit-msg** : validation du format des messages de commit

Format des commits : [Conventional Commits](https://www.conventionalcommits.org/)

```
feat: ajouter la recherche de propriétés
fix: corriger le bug de connexion
docs: mettre à jour le README
refactor: restructurer le module d'auth
test: ajouter des tests pour le service de paiement
```

---

## Tests

### Types de tests

Le projet inclut plusieurs types de tests :

1. **Tests unitaires** (Vitest + React Testing Library)
   - Tests de composants isolés
   - Tests de services et utilitaires
   - Mocking des dépendances externes

2. **Tests de sécurité** (Vitest config dédiée)
   - Tests d'injection XSS
   - Validation des inputs
   - Tests d'authentification
   - Tests de permissions RLS

3. **Tests d'intégration**
   - Tests de flux utilisateur complets
   - Tests API avec vraie base de données

4. **Tests de pénétration**
   - Scénarios d'attaques simulées
   - Validation des contre-mesures de sécurité

### Commandes

```bash
# Lancer tous les tests
npm run test

# Mode interactif
npm run test:ui

# Couverture de code
npm run test:coverage

# Tests de sécurité uniquement
npm run test:security

# Tests de sécurité complets (unit + integration + penetration)
npm run test:security:all

# Tests de fuites mémoire
npm run memory-audit
```

### Objectifs de couverture

- **Global** : > 80%
- **Components critiques** : > 90%
- **Services de paiement/auth** : > 95%

---

## Déploiement

### Build de production

```bash
npm run build
```

Les fichiers générés sont dans le dossier `dist/`.

### Déploiement web

Le projet peut être déployé sur :

- **Vercel** (recommandé)
  ```bash
  vercel --prod
  ```

- **Netlify**
  ```bash
  netlify deploy --prod
  ```

- **Serveur personnalisé**
  ```bash
  # Servir avec un serveur statique
  npx serve dist
  ```

### Déploiement mobile

#### iOS

```bash
npx cap sync ios
npx cap open ios
# Dans Xcode : Build & Archive → Distribute App
```

#### Android

```bash
npx cap sync android
npx cap open android
# Dans Android Studio : Build → Generate Signed Bundle/APK
```

### Variables d'environnement en production

N'oubliez pas de configurer les variables d'environnement dans votre plateforme de déploiement :

- Vercel : Settings → Environment Variables
- Netlify : Site settings → Build & deploy → Environment

---

## Structure du projet

```
montoit/
├── .github/                  # Config GitHub (actions, templates)
├── public/                   # Assets statiques
├── src/
│   ├── app/                  # Application entry point
│   │   ├── routes/           # Configuration des routes
│   │   ├── layout/           # Layouts principaux
│   │   ├── providers/        # Context providers
│   │   ├── App.tsx           # Root component
│   │   └── routes.tsx        # Route configuration
│   │
│   ├── features/             # Modules fonctionnels
│   │   ├── auth/             # Authentification
│   │   ├── property/         # Gestion des propriétés
│   │   ├── tenant/           # Fonctionnalités locataires
│   │   ├── owner/            # Fonctionnalités propriétaires
│   │   ├── agency/           # Fonctionnalités agences
│   │   ├── admin/            # Panel d'administration
│   │   ├── messaging/        # Messagerie
│   │   ├── verification/     # Vérification d'identité
│   │   └── contract/         # Contrats de location
│   │
│   ├── components/           # Composants partagés
│   │   ├── ui/               # Composants UI de base
│   │   └── ...               # Autres composants
│   │
│   ├── services/             # Services et API
│   │   ├── supabase/         # Client Supabase
│   │   ├── contracts/        # Génération PDF
│   │   ├── payments/         # Paiements
│   │   ├── azure/            # Services IA
│   │   └── ...               # Autres services
│   │
│   ├── hooks/                # Hooks personnalisés
│   ├── lib/                  # Utilitaires et helpers
│   │   ├── constants/        # Constantes de l'app
│   │   └── helpers/          # Fonctions utilitaires
│   ├── contexts/             # React contexts
│   ├── types/                # Types TypeScript
│   └── shared/               # Module partagé
│
├── tests/                    # Tests globaux
├── .env.example              # Exemple de variables d'environnement
├── .gitignore                # Fichiers ignorés par Git
├── .eslintrc.cjs             # Configuration ESLint
├── .prettierrc               # Configuration Prettier
├── tsconfig.json             # Configuration TypeScript
├── vite.config.ts            # Configuration Vite
├── capacitor.config.ts       # Configuration Capacitor
├── package.json              # Dépendances npm
├── CLAUDE.md                 # Documentation pour Claude Code
└── README.md                 # Ce fichier
```

---

## Technologies

### Frontend

| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.5.3 | Typage statique |
| Vite | 7.3.1 | Build tool & dev server |
| Tailwind CSS | 3.4.1 | Framework CSS |
| Radix UI | - | Composants accessibles |
| TanStack Query | 5.90.5 | Gestion état serveur |
| Zustand | 4.5.7 | Gestion état global |
| React Router | 7.12.0 | Routage |
| Lucide React | 0.344.0 | Icônes |

### Backend & BaaS

| Technologie | Usage |
|-------------|-------|
| Supabase | Base de données, auth, storage, realtime |
| PostgreSQL | Base de données relationnelle |
| Row Level Security | Sécurité au niveau base |

### Services externes

| Service | Usage |
|---------|-------|
| Azure OpenAI | Chatbot IA |
| Azure AI Services | Vision, reconnaissance vocale |
| Mapbox GL | Cartes interactives |
| Google Maps | Géolocalisation |
| Brevo/Intouch | SMS et notifications |
| CryptoNeo | Signature électronique |
| Sentry | Monitoring erreurs |
| Google Analytics | Analytics |

### Mobile

| Technologie | Version | Usage |
|-------------|---------|-------|
| Capacitor | 7.4.4 | Bridge natif iOS/Android |
| Workbox | - | Service Worker pour PWA |

### Développement

| Technologie | Usage |
|-------------|-------|
| Vitest | Tests unitaires |
| React Testing Library | Tests composants |
| ESLint | Linting |
| Prettier | Formatage |
| Husky | Git hooks |
| lint-staged | Pre-commit lint |

---

## Contribuer

Les contributions sont les bienvenues ! Voici comment contribuer au projet :

### Signaler un bug

1. Vérifiez que le bug n'existe pas déjà
2. Créez une issue avec le template "Bug Report"
3. Incluez les reproductions, captures d'écran, et environnement

### Proposer une fonctionnalité

1. Vérifiez que la fonctionnalité n'existe pas déjà
2. Créez une issue avec le template "Feature Request"
3. Décrivez le cas d'usage et les bénéfices

### Soumettre une Pull Request

1. Fork le projet
2. Créez une branche (`git checkout -b feature/ma-feature`)
3. Commit vos changements (`git commit -m 'feat: ajouter ma feature'`)
4. Push vers la branche (`git push origin feature/ma-feature`)
5. Ouvrez une Pull Request

### Guidelines de contribution

- Suivez le style de code existant
- Ajoutez des tests pour nouvelles fonctionnalités
- Mettez à jour la documentation si nécessaire
- Assurez-vous que tous les tests passent
- Une PR = une fonctionnalité ou un bug fix

---

## Licence

Ce projet est la propriété de **ANSUT**. Tous droits réservés.

---

## Support

Pour toute question ou problème :

- Email : support@montoit.ci
- Site web : [www.montoit.ci](https://www.montoit.ci)
- Documentation : [docs.montoit.ci](https://docs.montoit.ci)

---

<div align="center">

**Développé avec ❤ par [ANSUT](https://www.ansut.ci)**

[Revenir en haut](#montoit-platform)

</div>
