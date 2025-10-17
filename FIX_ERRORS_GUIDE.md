# Guide de Correction des Erreurs Supabase - Mon Toit

## Résumé des problèmes identifiés

1. **Erreur JavaScript**: `Cannot read properties of undefined (reading 'toLocaleString')` dans PropertyDetail.tsx:642
2. **Erreurs 404**: Tables Supabase non accessibles via API
3. **Erreur 400**: Problème avec la mise à jour du view_count

## Corrections appliquées

### 1. Correction de l'erreur JavaScript ✅

**Fichier**: `src/pages/PropertyDetail.tsx`

**Problème**: `property.monthly_rent.toLocaleString()` échouait quand `monthly_rent` était `undefined`

**Solution**: Ajout de vérifications null et spécification de la locale 'fr-FR'

```tsx
// Avant (ligne 642)
{property.monthly_rent.toLocaleString()} FCFA

// Après
{property.monthly_rent ? property.monthly_rent.toLocaleString('fr-FR') : 'N/A'} FCFA
```

**Autre correction similaire**:
```tsx
// Pour le deposit_amount
{property.deposit_amount ? property.deposit_amount.toLocaleString('fr-FR') : 'N/A'} FCFA
```

### 2. Correction des erreurs 404 Supabase ✅

**Fichier**: `supabase/migrations/20251017142500_fix_missing_tables_and_policies.sql`

**Problèmes identifiés**:
- Tables existantes mais politiques RLS manquantes ou incorrectes
- Fonctions RPC inexistantes ou permissions incorrectes
- Colonnes manquantes dans la table properties

**Solutions implémentées**:

#### a) Colonnes manquantes ajoutées à `properties`:
- `work_status`
- `work_description` 
- `work_images`
- `work_estimated_cost`
- `work_estimated_duration`
- `work_start_date`
- `title_deed_url`
- `en_negociation`

#### b) Table `user_verifications` créée:
Pour les scores de locataires et statuts de vérification

#### c) Politiques RLS corrigées pour toutes les tables:
- `properties` : Accès public aux biens approuvés + accès propriétaire
- `profiles` : Accès public aux informations de base
- `user_favorites` : Gestion par les utilisateurs
- `agency_mandates` : Accès public aux mandats actifs
- `rental_applications` : Accès candidats + propriétaires
- `user_verifications` : Accès utilisateur propriétaire

#### d) Fonctions RPC recréées:
- `get_public_properties()` avec permissions `anon, authenticated`
- `get_public_property()` avec permissions `anon, authenticated`

#### e) Triggers et fonctions utilitaires:
- `update_updated_at_column()` pour toutes les tables
- Triggers automatiques pour `updated_at`

## Comment appliquer les corrections

### Option 1: Via CLI Supabase (recommandé)

```bash
# Dans le répertoire du projet
cd /home/akoun-dev/Documents/PROJETS/montoit

# Appliquer la migration
npx supabase db push

# Vérifier le statut
npx supabase status
```

### Option 2: Via Dashboard Supabase (manuel)

1. Aller sur [app.supabase.com](https://app.supabase.com)
2. Sélectionner le projet `btxhuqtirylvkgvoutoc`
3. Aller dans **SQL Editor**
4. Copier-coller le contenu de `supabase/migrations/20251017142500_fix_missing_tables_and_policies.sql`
5. Exécuter le script

### Option 3: Via psql (si accès direct)

```bash
psql -h db.btxhuqtirylvkgvoutoc.supabase.co -p 5432 -U postgres -d postgres < supabase/migrations/20251017142500_fix_missing_tables_and_policies.sql
```

## Vérification des corrections

### 1. Tester l'application

```bash
# Démarrer le développement
npm run dev

# Naviguer vers une page de propriété
# Ex: http://localhost:5173/property/0503cde4-2bda-4276-b0ba-78712875f55b
```

### 2. Vérifier les API calls

Ouvrir les outils de développement Chrome (F12) et vérifier:
- Plus d'erreurs 404 dans l'onglet Network
- Plus d'erreurs 404 pour les tables: `rental_applications`, `agency_mandates`, `user_favorites`, `profiles`, `properties`
- Plus d'erreurs 400 pour la mise à jour du `view_count`

### 3. Vérifier la base de données

Via le Dashboard Supabase:
- Vérifier que la table `user_verifications` existe
- Vérifier que les colonnes ont été ajoutées à `properties`
- Vérifier que les politiques RLS sont actives

## Prochaines étapes

1. **Tester l'application complètement**
2. **Vérifier que toutes les fonctionnalités marchent**
3. **Surveiller les logs d'erreurs**
4. **Ajouter des données de test si nécessaire**

## Scripts utiles

### Script de test des API

```javascript
// Dans la console du navigateur
const testSupabaseAPI = async () => {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .limit(1);
  
  console.log('Properties API test:', { data, error });
};

testSupabaseAPI();
```

### Script de vérification des politiques RLS

```sql
-- Via SQL Editor Supabase
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public';
```

## Contact et support

Si les problèmes persistent:
1. Vérifier les logs Supabase dans le Dashboard
2. Vérifier les variables d'environnement `.env.local`
3. Contacter le support technique avec les logs d'erreurs

---

**Statut des corrections**: 
- ✅ Erreur JavaScript corrigée
- ✅ Migration de base de données créée
- ⏳ En attente d'application de la migration
- ⏳ Tests à effectuer
