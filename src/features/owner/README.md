# Interface Propriétaire - MonToit

## Vue d'ensemble

L'interface propriétaire de MonToit offre une solution complète pour gérer vos biens immobiliers, des candidatures locataires aux contrats de bail, en passant par les mandats d'agence et le suivi des paiements.

## Fonctionnalités principales

### 1. Tableau de Bord (`/proprietaire/dashboard`)

Le hub central de gestion avec :
- **Statistiques en temps réel** : Biens, baux actifs, candidatures, revenus mensuels
- **Taux d'occupation** : Pourcentage de biens loués
- **Aperçu des propriétés** : Grid des 4 premiers biens avec statut
- **Activité récente** : Candidatures, paiements, maintenance, visites
- **Actions rapides** : Ajouter un bien, voir candidatures, contrats
- **Alertes** : Candidatures en attente, maintenance, messages
- **Conseils personnalisés** : Recommandations selon le taux d'occupation

### 2. Gestion des Biens (`/proprietaire/mes-biens`)

Liste complète des propriétés du propriétaire avec :
- **Filtres par statut** : Disponible, loué, en maintenance
- **Cartes détaillées** : Image, titre, ville, prix, vues
- **Compteur de candidatures** : Nombre de candidats par bien
- **Actions rapides** : Modifier, voir détails, gérer candidatures
- **Invitation d'agence** : Déléguer la gestion à une agence

### 3. Ajout de Bien (`/proprietaire/ajouter-propriete`)

Formulaire multi-étapes pour publier un bien :
1. Informations générales (titre, type, caractéristiques)
2. Localisation (ville, quartier, adresse)
3. Photos (upload avec drag & drop)
4. Tarification et contact
5. Validation et publication

### 4. Candidatures (`/proprietaire/candidatures`)

Gestion des demandes locataires avec :
- **Scoring de fond** : Note 0-100 avec labels (Faible, Moyen, Bon, Excellent)
- **Informations du candidat** : Nom, photo, revenus, situation
- **Détails de la candidature** : Bien visé, message, pièces justificatives
- **Actions disponibles** :
  - Accepter la candidature
  - Refuser avec motif
  - Planifier une visite
  - Voir le profil complet

### 5. Contrats de Bail (`/proprietaire/contrats`)

Gestion complète des baux locatifs :

#### Liste des contrats
- **Onglets par statut** : Brouillon, en attente, actif, expiré, résilié
- **Actions par contrat** : Télécharger, envoyer rappel, annuler, résilier

#### Création de contrat (`/proprietaire/creer-contrat`)
- Sélection du bien
- Informations du locataire
- Durée et dates du bail
- Montant du loyer et charges
- Conditions particulières
- Génération automatique du PDF

#### Détail et édition (`/proprietaire/contrats/:id`)
- Vue complète du contrat
- Modification des clauses
- Historique des modifications
- Téléchargement PDF

#### Signature (`/proprietaire/signer-contrat/:id`)
- Signature électronique via Cryptoneo
- Sécurité et traçabilité
- Notification automatique aux parties

### 6. Locataires (`/proprietaire/mes-locataires`)

Suivi des locataires en cours :
- Liste des locataires actifs
- Biens occupés
- Statut des paiements
- Actions : contacter, voir contrat

### 7. Paiements (`/proprietaire/paiements`)

Suivi financier :
- Historique des paiements reçus
- Revenus mensuels
- Paiements en attente
- Export des relevés

### 8. Visites (`/proprietaire/visites`)

Planification des visites :
- Calendrier des visites
- Candidats à rencontrer
- Notes et feedbacks
- Statut de chaque visite

### 9. Documents (`/proprietaire/documents`)

Gestion documentaire :
- Contrats archivés
- Justificatifs locataires
- Factures et quittes
- Stockage cloud sécurisé

### 10. Rappels (`/proprietaire/rappels`)

Système de notifications :
- Échéances de bail
- Paiements en retard
- Renouvellements
- Entretiens à planifier

### 11. Mandats d'Agence (`/proprietaire/mes-mandats`)

Collaboration avec les agences :
- Liste des mandats en cours
- Détail des mandats (biens, durée, commission)
- Téléchargement du mandat PDF
- Signature électronique
- Suivi de l'activité de l'agence

### 12. Messagerie (`/proprietaire/messages`)

Communication intégrée :
- Conversations avec locataires
- Échanges avec agences
- Notifications en temps réel
- Badge de messages non lus

### 13. Profil (`/proprietaire/profil`)

Gestion du compte :
- Informations personnelles
- Coordonnées
- Préférences de notification
- Sécurité du compte

## Architecture des composants

```
src/features/owner/
├── components/
│   ├── OwnerDashboardLayout.tsx    # Layout avec sidebar
│   ├── OwnerSidebar.tsx            # Navigation latérale
│   ├── OwnerDashboardContent.tsx   # Contenu du dashboard
│   └── ApplicationCard.tsx         # Carte de candidature
│   └── index.ts                    # Exports
├── pages/
│   ├── DashboardPage.tsx           # Tableau de bord
│   ├── MyPropertiesPage.tsx        # Mes biens
│   ├── AddPropertyPage.tsx         # Ajouter un bien
│   ├── OwnerContractsPage.tsx      # Liste des contrats
│   ├── CreateContractPage.tsx      # Créer un contrat
│   ├── OwnerApplicationsPage.tsx   # Candidatures
│   ├── MyTenantsPage.tsx           # Mes locataires
│   ├── PaymentsPage.tsx            # Paiements
│   ├── VisitsPage.tsx              # Visites
│   ├── DocumentsPage.tsx           # Documents
│   ├── RemindersPage.tsx           # Rappels
│   ├── ProfilePage.tsx             # Profil
│   └── index.ts
└── index.ts
```

## Routes

Toutes les routes propriétaires sont préfixées par `/proprietaire/` :

| Route | Composant | Protection |
|-------|-----------|------------|
| `/proprietaire/dashboard` | `DashboardPage` | Owner |
| `/proprietaire/mes-biens` | `MyPropertiesPage` | Owner |
| `/proprietaire/ajouter-propriete` | `AddPropertyPage` | Owner |
| `/proprietaire/contrats` | `OwnerContractsPage` | Owner |
| `/proprietaire/creer-contrat` | `CreateContractPage` | Owner |
| `/proprietaire/creer-contrat/:propertyId` | `CreateContractPage` | Owner |
| `/proprietaire/contrats/:id` | `ContractDetailPage` | Owner |
| `/proprietaire/contrats/:id/editer` | `EditContractPage` | Owner |
| `/proprietaire/signer-contrat/:id` | `SignLeasePage` | Owner |
| `/proprietaire/candidatures` | `OwnerApplicationsPage` | Owner |
| `/proprietaire/candidature/:id` | `ApplicationDetailPage` | Owner |
| `/proprietaire/mes-mandats` | `AgencyMandatesPage` | Owner |
| `/proprietaire/mes-mandats/:id` | `MandateDetailPage` | Owner |
| `/proprietaire/mes-mandats/signer/:id` | `SignMandatePage` | Owner |
| `/proprietaire/visites` | `VisitsPage` | Owner |
| `/proprietaire/mes-locataires` | `MyTenantsPage` | Owner |
| `/proprietaire/paiements` | `PaymentsPage` | Owner |
| `/proprietaire/documents` | `DocumentsPage` | Owner |
| `/proprietaire/rappels` | `RemindersPage` | Owner |
| `/proprietaire/messages` | `MessagesPage` | Owner |
| `/proprietaire/profil` | `ProfilePage` | Owner |

## Services utilisés

| Service | Description |
|---------|-------------|
| `contractService` | CRUD contrats, rappels, annulations |
| `applicationService` | Gestion des candidatures |
| `signatureService` | Signatures numériques Cryptoneo |
| `depositService` | Gestion des cautionnements |
| `rentPaymentService` | Traitement des paiements |
| `reviewService` | Avis locataires |
| `analyticsService` | Analytics des biens |
| `agencyMandateService` | Gestion des mandats agences |

## Contrôle d'accès

### Rôles propriétaires
```typescript
OWNER_ROLES = ['proprietaire', 'owner']
```

### Rôles gestionnaires (inclut agences)
```typescript
PROPERTY_MANAGER_ROLES = ['proprietaire', 'owner', 'agence', 'agent']
```

### Protection des routes
Toutes les routes propriétaires sont protégées par le composant `ProtectedRoute` qui vérifie :
- L'authentification de l'utilisateur
- Le rôle approprié (proprietaire/owner)
- Redirection vers `/connexion` si non connecté
- Redirection vers `/dashboard` si rôle incorrect

## Design System

### Couleurs principales
```css
--color-primary-500: #F16522;    /* Orange MonToit */
--color-primary-600: #d9571d;    /* Hover */
--color-neutral-900: #2C1810;    /* Header foncé */
--color-neutral-700: #404040;    /* Texte secondaire */
```

### Cartes statistiques
- Arrondis : 16px (`rounded-2xl`)
- Ombre : `shadow-sm` → `shadow-md` au hover
- Padding : 24px (`p-6`)
- Bordure : `border-gray-100`

### États et badges
- **Disponible** : `bg-green-100 text-green-700`
- **Loué** : `bg-blue-100 text-blue-700`
- **En attente** : `bg-amber-100 text-amber-700`
- **Expiré** : `bg-gray-100 text-gray-700`

## Accessibilité

### Conformité WCAG AA
- Contrastes minimum 4.5:1 pour le texte normal
- Touch targets minimum 44px pour mobile
- Navigation clavier complète
- Labels ARIA sur les éléments interactifs
- Focus rings visibles

### Responsive design
- **Mobile** (< 768px) : Sidebar en overlay, grilles en colonne
- **Tablet** (768px - 1024px) : Layout adapté
- **Desktop** (> 1024px) : Sidebar fixe, grilles complètes

## Intégrations

### Supabase
- **Auth** : Authentification et sessions
- **Database** : Données en temps réel avec RLS
- **Storage** : Images et documents
- **Realtime** : Notifications et mises à jour

### Cryptoneo (signatures)
- Génération de certificats
- Signature de documents
- Vérification de signature
- Traçabilité légale

### Messagerie
- Conversations temps réel
- Compteurs de messages non lus
- Notifications push

## Performance

### Optimisations
- Lazy loading des composants de route
- Mise en cache TanStack Query
- Images optimisées avec Supabase Storage
- Pagination des listes

### Métriques cibles
- LCP : < 2.5s
- FID : < 100ms
- CLS : < 0.1

## Utilisation

### Import du layout
```tsx
import { OwnerDashboardLayout } from '@/features/owner/components';

function MyOwnerPage() {
  return (
    <OwnerDashboardLayout title="Ma Page">
      {/* Contenu */}
    </OwnerDashboardLayout>
  );
}
```

### Utilisation de la sidebar
```tsx
import { OwnerSidebar } from '@/features/owner/components';

<OwnerSidebar
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
  unreadMessages={3}
/>
```

### Carte de candidature
```tsx
import { ApplicationCard } from '@/features/owner/components';

<ApplicationCard
  application={applicationData}
  property={propertyData}
  backgroundScore={85}
  onAccept={() => handleAccept(application.id)}
  onReject={() => handleReject(application.id)}
  onScheduleVisit={() => openVisitModal(application.id)}
  onViewDetails={() => navigate(`/proprietaire/candidature/${application.id}`)}
/>
```

## Évolutions prévues

### Court terme
- [ ] Amélioration du dashboard avec graphiques
- [ ] Notifications push pour les candidatures
- [ ] Export de données (CSV, Excel)
- [ ] Mode sombre

### Moyen terme
- [ ] Gestion des charges et réparations
- [ ] Suivi des indexes de loyer
- [ ] Assurance loyer impayé intégrée
- [ ] Matching intelligent propriétaire-locataire

### Long terme
- [ ] Analytics avancés et prédictions
- [ ] Intégration comptabilité
- [ ] Gestion multi-propriétaires
- [ ] Marketplace de services

---

**Version** : 1.0.0
**Statut** : Production Ready
**Dernière mise à jour** : Février 2026
