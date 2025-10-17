# Guide de Résolution des Problèmes CORS et Authentification Supabase

## Problèmes Identifiés

1. **Erreur 400 Bad Request** sur l'endpoint d'authentification Supabase
2. **Erreur CORS** bloquant l'accès depuis localhost:8080
3. **Erreur 502 Bad Gateway** sur l'API REST Supabase
4. **Erreur de connexion Chrome Extension** (non critique)

## Solutions Implémentées

### 1. Migration SQL pour Corriger la Structure

Fichier créé : `supabase/migrations/fix_cors_and_auth.sql`

Cette migration :
- Crée les tables manquantes (`login_attempts`, `profiles`, `user_roles`)
- Active le Row Level Security (RLS) sur toutes les tables
- Crée les politiques de sécurité appropriées
- Met en place des triggers pour la création automatique de profils
- Ajoute des fonctions pour le logging des tentatives de connexion

### 2. Hook d'Authentification Amélioré

Fichier créé : `src/hooks/useAuthEnhanced.tsx`

Améliorations :
- Gestion d'erreur robuste avec try-catch
- Création automatique de profil si inexistant
- Attribution de rôle par défaut
- Logging des tentatives de connexion
- Meilleure gestion des états de chargement

### 3. Configuration CORS Supabase

**Action requise manuellement :**

1. Allez dans le dashboard Supabase : https://tivilnibujikyxdrdrgd.supabase.co
2. Navigation : Settings → API
3. Dans la section "CORS", ajoutez les origines suivantes :
   ```
   http://localhost:8080
   http://localhost:8081
   http://localhost:8082
   http://localhost:5173
   ```
4. Ajoutez les headers autorisés :
   ```
   content-type
   apikey
   authorization
   ```

### 4. Validation des Variables d'Environnement

Les variables d'environnement sont correctement configurées :
- `VITE_SUPABASE_URL`: https://tivilnibujikyxdrdrgd.supabase.co ✅
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Configuré ✅

## Étapes de Déploiement

### 1. Appliquer la Migration

```bash
# Si vous avez le CLI Supabase installé
supabase db push

# Sinon, appliquez manuellement le SQL depuis le dashboard Supabase
# Table Editor → SQL → exécutez le contenu de fix_cors_and_auth.sql
```

### 2. Mettre à Jour le Code

Remplacez l'import du hook d'authentification :

```typescript
// Ancien
import { useAuth } from '@/hooks/useAuth';

// Nouveau
import { useAuth } from '@/hooks/useAuthEnhanced';
```

### 3. Configurer CORS

Suivez les étapes dans la section "Configuration CORS Supabase" ci-dessus.

### 4. Redémarrer le Serveur de Développement

```bash
npm run dev
```

## Tests à Effectuer

### 1. Test d'Inscription

1. Accédez à http://localhost:8082
2. Essayez de créer un nouveau compte
3. Vérifiez que le profil est créé automatiquement
4. Vérifiez que le rôle par défaut est attribué

### 2. Test de Connexion

1. Connectez-vous avec des identifiants valides
2. Vérifiez qu'il n'y a plus d'erreur 400
3. Vérifiez que les tentatives sont loggées dans `login_attempts`

### 3. Test CORS

1. Ouvrez les outils de développement du navigateur
2. Vérifiez qu'il n'y a plus d'erreurs CORS dans la console
3. Vérifiez que les requêtes API fonctionnent

## Dépannage

### Si l'Erreur 400 Persiste

1. Vérifiez que les identifiants sont corrects
2. Vérifiez que l'email est confirmé dans Supabase
3. Regardez les logs Supabase : Settings → Logs

### Si l'Erreur CORS Persiste

1. Vérifiez la configuration CORS dans le dashboard Supabase
2. Assurez-vous que le port localhost est correct
3. Videz le cache du navigateur

### Si les Tables N'existent Pas

1. Appliquez la migration SQL manuellement
2. Vérifiez que les tables sont créées : Table Editor
3. Vérifiez que RLS est activé sur chaque table

## Monitoring

### Logs d'Authentification

Les tentatives de connexion sont maintenant loggées dans la table `login_attempts`. Vous pouvez les consulter :

```sql
SELECT * FROM login_attempts ORDER BY created_at DESC LIMIT 10;
```

### Logs Supabase

Surveillez les logs dans le dashboard Supabase pour détecter les problèmes :
- Settings → Logs
- Filtrez par "auth" pour les problèmes d'authentification
- Filtrez par "database" pour les problèmes de base de données

## Sécurité

- ✅ RLS activé sur toutes les tables
- ✅ Politiques de sécurité restrictives
- ✅ Logging des tentatives de connexion
- ✅ Validation des variables d'environnement
- ✅ Gestion sécurisée des erreurs

## Prochaines Étapes

1. **Tester en production** une fois les corrections déployées
2. **Surveiller les logs** pendant les premiers jours
3. **Ajouter des alertes** pour les tentatives de connexion suspectes
4. **Implémenter 2FA** pour les comptes administrateurs
5. **Ajouter rate limiting** pour les tentatives de connexion
