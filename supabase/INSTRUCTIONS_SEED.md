# Instructions pour exécuter le script Seed

## 📋 Vue d'ensemble

Le script `seed.sql` a été conçu pour peupler votre base de données Mon Toit avec des données de test réalistes. Cependant, il nécessite d'abord la création des utilisateurs dans le système d'authentification Supabase.

## 🔄 Ordre d'exécution

### 1. Créer les utilisateurs dans Supabase Auth

**Accédez au dashboard Supabase → Authentication → Users**

Créez les 8 utilisateurs suivants avec leurs UUIDs prédéfinis :

#### ✅ UUIDs à utiliser pour la création d'utilisateurs :

| Rôle | Email | Nom complet | UUID | Mot de passe |
|------|-------|--------------|------|-------------|
| Admin système | admin@montoit.ci | Admin Système | `11111111-1111-1111-1111-111111111111` | `Admin123!` |
| Propriétaire 1 | jean.kouadio@montoit.ci | Jean Kouadio | `22222222-2222-2222-2222-222222222222` | `Proprio123!` |
| Propriétaire 2 | marie.konan@montoit.ci | Marie Konan | `33333333-3333-3333-3333-333333333333` | `Proprio123!` |
| Propriétaire 3 | yao.bamba@montoit.ci | Yao Bamba | `44444444-4444-4444-4444-444444444444` | `Proprio123!` |
| Locataire 1 | fatima.traore@montoit.ci | Fatima Traoré | `55555555-5555-5555-5555-555555555555` | `Locataire123!` |
| Locataire 2 | mohamed.sissoko@montoit.ci | Mohamed Sissoko | `66666666-6666-6666-6666-666666666666` | `Locataire123!` |
| Agence | contact@immobilier.ci | Immobilier CI | `77777777-7777-7777-7777-777777777777` | `Agence123!` |
| Admin ANSUT | patrick.somet@ansut.ci | Patrick Somet | `88888888-8888-8888-8888-888888888888` | `Ansut123!` |

**Important :** Pour créer un utilisateur avec un UUID spécifique dans Supabase:

1. Allez dans **Authentication → Users**
2. Cliquez sur **"Add user"** ou **"Create user"**
3. Remplissez l'email et le mot de passe
4. **AVANT** de cliquer sur "Create", cliquez sur **"Advanced"** ou **"Show advanced options"**
5. Dans le champ **"User ID"** ou **"Custom user ID"**, collez l'UUID correspondant
6. Créez l'utilisateur

### 2. Exécuter le script Seed

**Accédez au dashboard Supabase → SQL Editor**

1. Copiez tout le contenu du fichier `seed.sql`
2. Collez-le dans l'éditeur SQL
3. **IMPORTANT :** Assurez-vous d'être connecté avec le **SERVICE ROLE**
   - Regardez en haut de l'éditeur SQL, vous devriez voir "Connected as: service_role"
4. Cliquez sur **"Run"** ou **"Execute"**

### 3. Vérifier les résultats

Le script affichera un rapport complet dans les résultats :

- ✅ Nombre d'utilisateurs créés par type
- ✅ Nombre de propriétés créées par type
- ✅ Loyers moyens par type de propriété
- ✅ Demandes de location en attente
- ✅ Nombre de favoris créés

## 📊 Données qui seront créées

### Utilisateurs (8)
- **1 Admin système** - Gestion de la plateforme
- **3 Propriétaires** - Avec différents niveaux de vérification
- **2 Locataires** - Pour tester les demandes de location
- **1 Agence immobilière** - Pour les mandats de location
- **1 Admin ANSUT** - Avec rôles super_admin et admin

### Propriétés (8)
- **1 Villa de luxe** - 850 000 FCFA/mois (Cocody Riviera Palmeraie)
- **1 Villa moderne** - 450 000 FCFA/mois (Cocody Riviera Golf)
- **1 Duplex** - 350 000 FCFA/mois (Yopougon)
- **2 Appartements standing** - 250 000 et 380 000 FCFA/mois
- **1 Appartement classique** - 150 000 FCFA/mois (Treichville)
- **1 Studio meublé** - 120 000 FCFA/mois (Marcory)
- **1 Maison** - 180 000 FCFA/mois (Abobo)

### Données additionnelles
- **2 Demandes de location** - Statut "pending"
- **Plusieurs favoris** - Pour tester la fonctionnalité
- **Attribution automatique des rôles** - Selon le type d'utilisateur

## 🧪 Tests à effectuer après le seed

1. **Test API publique** : Accédez à `GET /rest/v1/rpc/get_public_properties`
2. **Test propriétaires** : Connectez-vous avec `jean.kouadio@montoit.ci`
3. **Test locataires** : Connectez-vous avec `fatima.traore@montoit.ci`
4. **Test admin** : Connectez-vous avec `patrick.somet@ansut.ci`

## 🔧 Dépannage

### Erreur "user does not exist in auth.users"
- Vérifiez que tous les utilisateurs ont été créés avec les UUIDs exacts
- Ré-exécutez le script seed après avoir créé les utilisateurs manquants

### Erreur "permission denied"
- Assurez-vous d'exécuter le script avec le SERVICE ROLE
- Dans SQL Editor, vous devriez voir "Connected as: service_role"

### Aucune propriété n'apparaît
- Vérifiez que les propriétaires correspondants existent dans auth.users
- Le script skippe l'insertion des propriétés si le owner_id n'existe pas

## 🎯 Résultat attendu

Après exécution réussie, votre application Mon Toit aura :
- Des données de test réalistes pour tous les scénarios
- Des utilisateurs avec différents rôles et permissions
- Des propriétés variées couvrant tous les quartiers d'Abidjan
- Des fonctionnalités complètes testables

Vous pouvez maintenant utiliser ces identifiants pour tester toutes les fonctionnalités de votre application !