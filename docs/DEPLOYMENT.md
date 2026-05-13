# Pipeline CI/CD et configuration multi-environnements

Ce document décrit la pipeline CI/CD et la configuration multi-environnements de la plateforme MonToit.

## CI/CD Pipeline

Le workflow GitHub Actions (`.github/workflows/ci-cd.yml`) se déclenche automatiquement sur les pushes et les pull requests.

### Pipeline Stages

1. **Validate** – Lint et vérification des types
   - ESLint pour la qualité du code
   - Vérification TypeScript
   - Exécuté sur toutes les branches

2. **Test** – Tests unitaires + couverture
   - Tests Vitest
   - Rapports de couverture (Codecov)
   - Exécuté après la validation sur toutes les branches

3. **Security** – Analyses de sécurité
   - Tests de sécurité (`vitest.security.config.ts`)
   - `npm audit` pour détecter les vulnérabilités
   - Exécuté après les tests sur toutes les branches

4. **Build** – Build production
   - Build optimisé avec Vite
   - Analyse de la taille des bundles
   - Upload des artefacts de build

5. **Deploy Staging** (branches `develop` / `staging`)
   - Déploiement dans l’environnement de staging
   - Déclenché sur push vers `develop` ou `staging`

6. **Deploy Production** (`main` + tags)
   - Déploiement dans l’environnement production
   - Création de la release GitHub
   - Déclenché par les commits tagués sur `main`

### GitHub Secrets Required

À configurer dans GitHub Settings → Secrets :

| Secret | Description | Utilisé par |
|--------|-------------|-------------|
| `CODECOV_TOKEN` | Jeton Codecov pour les rapports de couverture | Étape Test |
| `STAGING_URL` | URL de l’environnement de staging | Déploiement staging |
| `PRODUCTION_URL` | URL de l’environnement de production | Déploiement production |
| `GH_TOKEN` | Jeton GitHub pour les releases | Déploiement production |

### Running Locally

Vous pouvez exécuter la pipeline CI localement :

```bash
# Pipeline CI complète
npm run ci

# Build staging
npm run ci:staging

# Build production avec tests de sécurité
npm run ci:production
```

## Multi-Environment Configuration

Le projet supporte trois environnements : **development**, **staging** et **production**.

### Environment Files

| Fichier | Usage | Versionné |
|---------|-------|------------|
| `.env` | Environnement local (fallback) | ❌ Ignoré |
| `.env.development` | Environnement développement | ❌ Ignoré |
| `.env.staging` | Environnement staging | ❌ Ignoré |
| `.env.production` | Environnement production | ❌ Ignoré |
| `.env.example` | Modèle/documentation | ✅ Traqué |

### Setting Up Local Environment

1. Dupliquer le fichier modèle :
   ```bash
   cp .env.example .env.development
   ```

2. Compléter les clés/API et secrets dans `.env.development`

3. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```

### Environment-Specific Commands

```bash
# Développement
npm run dev                 # Utilise .env
npm run dev:staging         # Utilise .env.staging
npm run dev:production      # Utilise .env.production

# Build
npm run build:development   # Build pour dev
npm run build:staging       # Build pour staging
npm run build:production    # Build pour production

# Preview
npm run preview             # Aperçu du build production
npm run preview:staging     # Aperçu staging
```

### Environment Configuration

La fonction `getEnvConfig()` dans `src/config/env.config.ts` retourne la configuration spécifique à chaque environnement :

```typescript
import { getEnvConfig, isDevelopment, isProduction } from '@/config/env.config';

const config = getEnvConfig();
console.log(config.name);        // 'Development' | 'Staging' | 'Production'
console.log(config.enableDevTools); // true en développement
console.log(config.logLevel);     // 'debug' | 'info' | 'warn' | 'error'
```

### Environment Detection

L’environnement est détecté automatiquement via la variable `MODE` de Vite :

`MODE=development` (par défaut) → utilise `.env.development`
`MODE=staging` → utilise `.env.staging`
`MODE=production` → utilise `.env.production`

### Feature Flags by Environment

| Fonctionnalité | Développement | Staging | Production |
|---------------|--------------|---------|------------|
| DevTools | ✅ Activé | ⚠️ Optionnel | ❌ Désactivé |
| Journalisation | Debug | Info | Error |
| Analytics | ❌ Désactivé | ✅ Activé | ✅ Activé |
| Fonctionnalités expérimentales | ✅ Activées | ✅ Activées | ❌ Désactivées |
| Suivi des erreurs | ❌ Désactivé | ✅ Optionnel | ✅ Activé |

## Deployment

### Staging Deployment

Le déploiement staging se fait automatiquement sur :
  - Push sur la branche `develop`
  - Push sur la branche `staging`

### Production Deployment

Le déploiement production se fait automatiquement sur :
  - Commits tagués sur la branche `main` (ex. `v1.0.0`)

Déploiement manuel en production :

```bash
# 1. S'assurer que la branche main est à jour
git checkout main
git pull origin main

# 2. Fusionner les changements
git merge develop --no-ff

# 3. Créer et pousser le tag
git tag -a v3.3.2 -m "Release v3.3.2"
git push origin main --tags

# 4. La pipeline CI/CD déclenchera le déploiement
```

## Troubleshooting

### Build Failures

Si la build échoue dans CI :

1. Consulter les logs de build dans l’onglet Actions
2. Reproduire localement avec `npm run ci`
3. Corriger et repusher

### Environment Variable Issues

Si des variables d’environnement manquent :

1. Vérifier `.env.example` pour la liste des variables
2. Vérifier que les GitHub Secrets sont configurés
3. Pour le local, dupliquer `.env.example` en `.env.development`

### Deployment Failures

Si un déploiement échoue :

1. Consulter les logs coté serveur
2. Vérifier que les variables d’environnement sont définies
3. S’assurer que les GitHub Secrets sont corrects
4. Vérifier que les artefacts de build ont bien été générés
