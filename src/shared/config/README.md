# Configuration - Mon Toit

Ce dossier contient toutes les configurations centralisées de l'application.

## Structure

```
config/
├── api-keys.config.ts    # Clés API et configurations des services externes
├── app.config.ts          # Configuration générale de l'application
├── env.config.ts          # Validation des variables d'environnement
├── routes.config.ts       # Routes de l'application
└── index.ts              # Export centralisé
```

## Utilisation

### Clés API

```typescript
import { apiKeysConfig } from '@config';

// Accéder aux clés Supabase
const supabaseUrl = apiKeysConfig.supabase.url;
const supabaseKey = apiKeysConfig.supabase.anonKey;

// Vérifier si un service est configuré
if (apiKeysConfig.azure.openai.isConfigured) {
  // Utiliser Azure OpenAI
}

// Valider la configuration
const validation = apiKeysConfig.validateConfiguration();
if (!validation.isValid) {
  console.error('Configuration invalide:', validation.missing);
}

// Afficher le statut des services
apiKeysConfig.logConfiguration();
```

### Routes

```typescript
import { ROUTES, getPropertyDetailRoute } from '@config';

// Utiliser les routes statiques
<Link to={ROUTES.TENANT.DASHBOARD}>Dashboard</Link>

// Générer des routes dynamiques
const propertyUrl = getPropertyDetailRoute(propertyId);
navigate(propertyUrl);
```

### Configuration de l'application

```typescript
import { APP_CONFIG } from '@config';

// Accéder aux paramètres
const appName = APP_CONFIG.name;
const pageSize = APP_CONFIG.pagination.defaultPageSize;
```

## Services Externes Configurés

### Obligatoires

- **Supabase** : Base de données et authentification

### Optionnels

- **Azure OpenAI** : Chatbot IA
- **Azure AI Services** : Vision, Speech, etc.
- **Mapbox** : Cartes interactives
- **Google Maps** : Alternative pour les cartes
- **IN TOUCH** : Paiements Mobile Money
- **NeoFace/Smileless** : Vérification faciale
- **CryptoNeo** : Signature électronique
- **Resend** : Service d'emails
- **Brevo** : Service SMS
- **Gemini/DeepSeek** : LLM alternatifs

## Variables d'Environnement

Toutes les variables d'environnement doivent être définies dans le fichier `.env` à la racine du projet.

### Essentielles

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### Optionnelles

Voir le fichier `.env` pour la liste complète des variables disponibles.

## Validation

Au démarrage de l'application, la configuration est automatiquement validée :

- ✅ Les services configurés sont listés
- ⚠️ Les services manquants génèrent des avertissements
- 🚨 Les configurations critiques manquantes bloquent le démarrage

## Bonnes Pratiques

1. **Ne jamais** commiter les clés API dans le code
2. Utiliser `apiKeysConfig.isConfigured` avant d'utiliser un service
3. Gérer gracieusement l'absence de services optionnels
4. Utiliser les helpers de routes pour les URLs dynamiques
5. Importer depuis `@config` plutôt que des chemins relatifs
