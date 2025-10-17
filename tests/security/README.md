# Tests de Sécurité - Mon Toit Platform

## 📋 Vue d'ensemble

Cette suite de tests valide les aspects critiques de la sécurité de l'application :
- **RLS Policies** : Isolation des données sensibles (baux, profils, logs)
- **Audit Logging** : Traçabilité des actions administratives
- **Permissions** : Contrôle d'accès basé sur les rôles

## 🚀 Exécution des tests

### Installer les dépendances
```bash
npm install --save-dev vitest @vitest/ui @supabase/supabase-js
```

### Lancer tous les tests
```bash
npm run test
```

### Lancer les tests de sécurité uniquement
```bash
npm run test tests/security/
```

### Lancer avec couverture de code
```bash
npm run test -- --coverage
```

### Mode watch (développement)
```bash
npm run test -- --watch
```

## 📊 Tests couverts

### 1. **RLS - Isolation des Baux** (`leases`)
- ✅ Propriétaire peut voir ses baux
- ✅ Locataire peut voir les baux où il est partie
- ✅ Utilisateur non autorisé **NE PEUT PAS** voir les baux d'autrui

### 2. **RLS - Profils Publics** (`profiles_public`)
- ✅ Utilisateur authentifié peut accéder aux profils via RPC
- ✅ Visiteur non authentifié **NE PEUT PAS** accéder aux profils
- ✅ Accès direct à `profiles_public` sans authentification retourne **0 résultats**

### 3. **RLS - Logs d'Accès Sensibles** (`sensitive_data_access_log`)
- ✅ Utilisateur normal **NE PEUT PAS** lire les logs d'accès
- ✅ Admin peut lire les logs d'accès

### 4. **Audit Logging - Fonction `admin_get_guest_messages()`**
- ✅ Appel à la fonction crée un log dans `admin_audit_logs`
- ✅ Le log contient l'action `guest_messages_bulk_accessed`

### 5. **Permissions - Gestion des Rôles**
- ✅ Utilisateur normal **NE PEUT PAS** s'auto-promouvoir admin
- ✅ Utilisateur normal **NE PEUT PAS** promouvoir autrui à super_admin
- ✅ Seuls les super_admins peuvent utiliser `promote_to_super_admin()`

## 🔐 Sécurité des Données de Test

**IMPORTANT** : Les tests créent des utilisateurs temporaires avec des emails aléatoires.
- Format : `test-{context}-{timestamp}@example.com`
- Mot de passe : `SecurePassword123!`
- **Nettoyage automatique** : Les clients sont déconnectés après chaque test

## 🛠️ CI/CD Integration

Ajouter au workflow GitHub Actions :

```yaml
name: Security Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test tests/security/
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## 📈 Métriques de Succès

Pour qu'un déploiement soit validé, **tous les tests doivent passer** :
- ✅ 0 fuite de données entre utilisateurs
- ✅ 100% des actions admin loguées
- ✅ 0 escalade de privilèges possible
- ✅ Protection contre accès non authentifiés

## 🚨 Alertes de Régression

Si un test échoue :
1. **NE PAS DÉPLOYER EN PRODUCTION**
2. Vérifier les migrations RLS récentes
3. Auditer les fonctions SQL modifiées
4. Valider manuellement avec `supabase db lint`

## 📚 Références

- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Access Control](https://owasp.org/www-project-top-ten/2017/A5_2017-Broken_Access_Control)
- [ANSUT Security Guidelines](../docs/SECURITY.md)
