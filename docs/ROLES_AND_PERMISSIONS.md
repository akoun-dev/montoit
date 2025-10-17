# Système de Rôles et Permissions - Mon Toit

Ce document détaille le système complet de rôles et permissions de l'application Mon Toit.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Types d'utilisateurs (user_type)](#types-dutilisateurs-user_type)
3. [Rôles système (app_role)](#rôles-système-app_role)
4. [Matrice de permissions](#matrice-de-permissions)
5. [Utilisation dans le code](#utilisation-dans-le-code)
6. [Exemples pratiques](#exemples-pratiques)

## Vue d'ensemble

Le système de sécurité de Mon Toit utilise **deux niveaux** de contrôle d'accès :

1. **user_type** : Type de compte utilisateur (stocké dans `profiles.user_type`)
2. **app_role** : Rôles système pour permissions avancées (stocké dans `user_roles.role`)

### Pourquoi deux systèmes ?

- **user_type** : Définit le type de compte et les fonctionnalités métier (locataire, propriétaire, agence)
- **app_role** : Définit les permissions administratives et spéciales (admin, tiers de confiance)

Un utilisateur peut avoir :
- Un seul `user_type` (ex: `proprietaire`)
- Plusieurs `app_role` (ex: `user` + `admin`)

## Types d'utilisateurs (user_type)

Stockés dans `profiles.user_type` - Un seul type par utilisateur.

### locataire

**Description** : Utilisateur cherchant à louer un logement

**Permissions :**
- ✅ Rechercher des propriétés
- ✅ Sauvegarder des favoris
- ✅ Postuler à des annonces
- ✅ Consulter les recommandations personnalisées
- ✅ Voir son historique de recherche
- ✅ Recevoir des rappels automatiques
- ✅ Communiquer avec les propriétaires
- ✅ Laisser des avis sur les propriétaires
- ❌ Publier des annonces
- ❌ Gérer des propriétés
- ❌ Consulter les candidatures

**Routes accessibles :**
- `/` - Page d'accueil
- `/recherche` - Recherche de propriétés
- `/favoris` - Favoris
- `/dashboard` - Tableau de bord locataire
- `/candidatures` - Mes candidatures
- `/messages` - Messagerie
- `/profil` - Profil utilisateur

### proprietaire

**Description** : Propriétaire de biens immobiliers cherchant à louer

**Permissions :**
- ✅ Publier des annonces immobilières
- ✅ Gérer ses propriétés
- ✅ Consulter les candidatures
- ✅ Communiquer avec les locataires
- ✅ Créer des baux
- ✅ Laisser des avis sur les locataires
- ✅ Voir les statistiques de ses annonces
- ❌ Postuler à des annonces
- ❌ Sauvegarder des favoris (en tant que locataire)

**Routes accessibles :**
- Toutes les routes locataire +
- `/ajouter-bien` - Publier une annonce
- `/mes-proprietes` - Gérer mes biens
- `/owner-dashboard` - Tableau de bord propriétaire
- `/candidatures/:propertyId` - Candidatures pour un bien
- `/baux` - Gestion des baux

### agence

**Description** : Agence immobilière gérant plusieurs propriétés

**Permissions :**
- Identiques à `proprietaire`
- ✅ Peut gérer plusieurs propriétés pour différents propriétaires

**Routes accessibles :**
- Identiques à `proprietaire`

### admin_ansut

**Description** : Compte administrateur ANSUT (legacy, à migrer vers rôles)

⚠️ **Déprécié** : Ce type sera progressivement remplacé par le système de rôles.

**Migration** : Les comptes `admin_ansut` doivent avoir le rôle `admin` ou `super_admin`.

## Rôles système (app_role)

Stockés dans `user_roles.role` - Un utilisateur peut avoir plusieurs rôles.

### user

**Description** : Rôle de base attribué automatiquement à tous les utilisateurs

**Attribution** : Automatique lors de la création du compte

**Permissions :**
- ✅ Accès aux fonctionnalités de base selon le `user_type`

### admin

**Description** : Administrateur de la plateforme

**Attribution** : Manuelle par un `super_admin`

**Permissions :**
- ✅ Accès au tableau de bord admin (`/admin`)
- ✅ Modération des annonces
- ✅ Certification des baux ANSUT
- ✅ Gestion des litiges
- ✅ Vérification manuelle des identités (ONECI, CNAM)
- ✅ Consultation des statistiques plateforme
- ✅ Consultation de ses propres logs d'audit
- ❌ Promotion d'utilisateurs en super_admin
- ❌ Gestion des autres admins
- ❌ Consultation de tous les logs d'audit

**Routes accessibles :**
- Toutes les routes utilisateur +
- `/admin` - Dashboard admin
  - Statistiques
  - Gestion des utilisateurs
  - Gestion des propriétés
  - Modération des avis
  - Certifications de baux
  - Gestion des litiges
  - Vérifications manuelles

### super_admin

**Description** : Super administrateur avec tous les privilèges

**Attribution** : Manuelle par un autre `super_admin` (ou auto-promotion du premier admin)

**Permissions :**
- ✅ Toutes les permissions `admin` +
- ✅ Promotion d'utilisateurs en `super_admin`
- ✅ Révocation de rôles admin
- ✅ Gestion complète des rôles
- ✅ Consultation de tous les logs d'audit
- ✅ Accès aux fonctions avancées de sécurité
- ✅ Configuration système

**Routes accessibles :**
- Toutes les routes admin +
- Composant `PromoteToSuperAdmin` visible

### tiers_de_confiance

**Description** : Tiers de confiance pour validation de dossiers

**Attribution** : Manuelle par un `admin` ou `super_admin`

**Conditions** :
- Doit avoir une entrée dans `trusted_third_parties`
- Le compte doit être actif (`is_active = true`)

**Permissions :**
- ✅ Accès au tableau de bord tiers de confiance
- ✅ Validation de dossiers de candidature
- ✅ Vérification des documents
- ✅ Scoring des candidats
- ❌ Accès aux fonctions admin

**Routes accessibles :**
- Routes utilisateur de base +
- `/tiers-dashboard` - Dashboard tiers de confiance
  - File de validation de dossiers
  - Historique de validations

## Matrice de permissions

| Permission | locataire | proprietaire | agence | user | admin | super_admin | tiers_confiance |
|-----------|-----------|--------------|--------|------|-------|-------------|-----------------|
| **Recherche et Favoris** |
| Rechercher propriétés | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sauvegarder favoris | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Recommandations | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Candidatures** |
| Postuler à annonce | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Voir candidatures reçues | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Accepter/Refuser candidature | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Propriétés** |
| Publier annonce | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Modifier ses annonces | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Supprimer ses annonces | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Modérer toutes annonces | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Baux** |
| Créer bail | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Signer bail | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Certifier bail ANSUT | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Communication** |
| Envoyer messages | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Laisser avis | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Modérer avis | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Admin** |
| Accès dashboard admin | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Gérer utilisateurs | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Voir ses logs audit | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Voir tous logs audit | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Promouvoir super_admin | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Tiers de confiance** |
| Valider dossiers | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Scorer candidats | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## Utilisation dans le code

### Vérifier le user_type

```typescript
import { useAuth } from '@/hooks/useAuth';

const { profile } = useAuth();

if (profile?.user_type === 'proprietaire') {
  // Code pour propriétaires
}
```

### Vérifier un rôle

```typescript
import { useAuth } from '@/hooks/useAuth';

const { hasRole } = useAuth();

if (hasRole('admin')) {
  // Code pour admins
}
```

### Utiliser le hook de permissions

```typescript
import { usePermissions } from '@/hooks/usePermissions';

const {
  canAccessAdminDashboard,
  canManageProperties,
  canEditProperty
} = usePermissions();

if (canAccessAdminDashboard) {
  // Afficher lien vers dashboard admin
}

if (canEditProperty(propertyOwnerId)) {
  // Afficher bouton édition
}
```

### Protéger une route par user_type

```tsx
<ProtectedRoute allowedUserTypes={['proprietaire', 'agence']}>
  <MyProperties />
</ProtectedRoute>
```

### Protéger une route par rôle

```tsx
<ProtectedRoute requiredRoles={['admin', 'super_admin']}>
  <AdminDashboard />
</ProtectedRoute>
```

### Protection avancée

```tsx
<RoleProtectedRoute 
  requiredRoles={['admin', 'tiers_de_confiance']} 
  requireAll={true}
  fallbackPath="/dashboard"
>
  <SpecialPage />
</RoleProtectedRoute>
```

### Hook de redirection automatique

```typescript
import { useRequireRole } from '@/hooks/useRequireRole';

function AdminPage() {
  // Redirige automatiquement si pas admin
  useRequireRole('admin', '/');
  
  return <div>Contenu admin</div>;
}
```

## Exemples pratiques

### Exemple 1 : Bouton "Publier une annonce"

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

function NavBar() {
  const { canCreateProperty } = usePermissions();
  
  return (
    <nav>
      {canCreateProperty && (
        <Button asChild>
          <Link to="/ajouter-bien">Publier une annonce</Link>
        </Button>
      )}
    </nav>
  );
}
```

### Exemple 2 : Actions sur une propriété

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function PropertyCard({ property }) {
  const { canEditProperty, user } = usePermissions();
  const isOwner = canEditProperty(property.owner_id);
  
  return (
    <div>
      <h2>{property.title}</h2>
      {isOwner && (
        <div>
          <Button onClick={() => editProperty(property.id)}>
            Modifier
          </Button>
          <Button onClick={() => deleteProperty(property.id)}>
            Supprimer
          </Button>
        </div>
      )}
    </div>
  );
}
```

### Exemple 3 : Dashboard adaptatif

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function Dashboard() {
  const {
    canAccessAdminDashboard,
    canAccessTiersDashboard,
    canManageProperties,
    profile
  } = usePermissions();
  
  if (canAccessAdminDashboard) {
    return <Navigate to="/admin" />;
  }
  
  if (canAccessTiersDashboard) {
    return <Navigate to="/tiers-dashboard" />;
  }
  
  if (canManageProperties) {
    return <OwnerDashboard />;
  }
  
  return <TenantDashboard />;
}
```

### Exemple 4 : Vérification serveur sécurisée

```typescript
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

async function deleteUser(userId: string) {
  // Vérification côté client (UX)
  const { hasRole } = useAuth();
  if (!hasRole('super_admin')) {
    toast.error('Accès refusé');
    return;
  }
  
  // Vérification côté serveur (SÉCURITÉ)
  const { data: isSuperAdmin } = await supabase.rpc('verify_user_role', {
    _role: 'super_admin'
  });
  
  if (!isSuperAdmin) {
    toast.error('Vérification échouée');
    return;
  }
  
  // Action sécurisée
  const { error } = await supabase.rpc('admin_delete_user', { 
    user_id: userId 
  });
  
  if (!error) {
    toast.success('Utilisateur supprimé');
  }
}
```

## Ajout d'un nouveau rôle

Pour ajouter un nouveau rôle au système :

1. **Modifier l'enum** (migration SQL)
```sql
ALTER TYPE public.app_role ADD VALUE 'new_role';
```

2. **Créer les RLS policies**
```sql
CREATE POLICY "New role can access feature"
ON public.feature_table
FOR SELECT
USING (has_role(auth.uid(), 'new_role'));
```

3. **Mettre à jour usePermissions.tsx**
```typescript
export const usePermissions = () => {
  // ...
  const permissions = {
    // ...
    canAccessNewFeature: hasRole('new_role'),
  };
  // ...
};
```

4. **Documenter**
- Ajouter dans ce fichier
- Mettre à jour la matrice de permissions
- Créer des exemples d'utilisation

## Questions fréquentes

### Quelle est la différence entre user_type et app_role ?

- **user_type** : Type de compte métier (locataire, propriétaire, agence)
- **app_role** : Permissions système (admin, tiers de confiance)

Un propriétaire peut aussi être admin : `user_type='proprietaire'` + `roles=['user', 'admin']`

### Comment vérifier si quelqu'un est admin ?

```typescript
const { hasRole } = useAuth();
const isAdmin = hasRole('admin') || hasRole('super_admin');
```

### Peut-on avoir plusieurs user_type ?

Non, un utilisateur n'a qu'un seul `user_type`.

### Peut-on avoir plusieurs app_role ?

Oui ! Un utilisateur peut avoir `user` + `admin` + `tiers_de_confiance`.

### Comment attribuer un rôle ?

Via une fonction RPC sécurisée appelée par un admin :

```typescript
await supabase.rpc('assign_role_to_user', {
  target_user_id: userId,
  new_role: 'admin'
});
```

### Les rôles sont-ils stockés dans localStorage ?

**NON** ⚠️ Les rôles sont TOUJOURS vérifiés côté serveur via RLS et functions SECURITY DEFINER.

### Comment migrer un admin_ansut vers le nouveau système ?

1. Créer le compte avec `user_type='locataire'` (ou autre)
2. Attribuer le rôle `admin` via RPC
3. L'utilisateur aura accès au dashboard admin

## Support

Pour toute question :
- Consulter `SECURITY.md` pour les aspects sécurité
- Vérifier les exemples ci-dessus
- Tester dans l'environnement de développement
