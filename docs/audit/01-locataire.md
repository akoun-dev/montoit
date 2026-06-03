# Locataire (Tenant)

## Rôle

Un **locataire** est un utilisateur qui cherche un logement à louer. Il peut postuler aux annonces, gérer ses candidatures, payer son loyer, et communiquer avec son propriétaire/agence.

## Fonctionnalités

### Recherche & Candidature
- Parcourir les annonces de location (recherche par ville, prix, type, etc.)
- Ajouter des biens en favoris
- Créer et soumettre son **dossier locatif** (documents personnels, justificatifs)
- Postuler aux logements
- Suivre l'état d'avancement de ses candidatures

### Contrat & Paiements
- Visualiser ses baux (contrats de location)
- Payer son loyer en ligne
- Consulter l'historique des paiements
- Voir le solde et les impayés éventuels

### Visites
- Demander des visites de biens
- Gérer le calendrier des visites
- Donner son avis après une visite

### Messagerie & Litiges
- Échanger des messages avec le propriétaire/agence
- Ouvrir un litige en cas de désaccord

### Maintenance
- Signaler un problème (panne, urgence)
- Suivre l'état d'avancement des réparations

### Profil & Sécurité
- Compléter son profil (KYC, documents d'identité)
- Voir son **score de confiance**
- Paramètres de notification, mot de passe, sessions actives
- Authentification à deux facteurs (2FA)

## Sections du tableau de bord

| Section | Comportant | Description |
|---|---|---|
| `overview` | `LocataireOverview` | Vue d'ensemble (résumé du dossier, loyer, etc.) |
| `search-properties` | `SearchProperties` | Recherche de biens |
| `favorites` | `Favorites` | Biens favoris |
| `applications` | `Applications` | Liste des candidatures |
| `application-detail` | `ApplicationDetail` | Détail d'une candidature |
| `rental-file` | `RentalFileForm` | Formulaire dossier locatif |
| `my-visits` | `MyVisits` | Demandes de visite |
| `visit-detail` | `VisitDetail` | Détail d'une visite |
| `my-leases` | `MyLeases` | Contrats de location |
| `lease-detail` | `LeaseDetail` | Détail d'un bail |
| `payments` | `Payments` | Historique des paiements |
| `payment-detail` | `PaymentDetail` | Détail d'un paiement |
| `messages` | `Messages` | Messagerie |
| `notifications` | `Notifications` | Centre de notifications |
| `reviews` | `Reviews` | Avis et évaluations |
| `disputes` | `MyDisputes` | Gestion des litiges |
| `maintenance` | `Maintenance` | Demandes de maintenance |
| `history` | `ActivityHistory` | Historique d'activité |
| `trust-score` | `TrustScore` | Score de confiance |
| `settings` | `SettingsSection` | Paramètres du compte |

## API Endpoints

### Locataire spécifique
| Endpoint | Méthode | Description |
|---|---|---|
| `/api/locataire/my-recipients` | GET | Liste des propriétaires/agences pour messagerie |

### Général (utilisé par le locataire)
| Endpoint | Méthode | Description |
|---|---|---|
| `/api/rental-file` | GET/POST | Gestion dossier locatif |
| `/api/rental-file/documents` | POST/DELETE | Documents du dossier locatif |
| `/api/applications` | GET/POST | Candidatures |
| `/api/applications/[id]` | PATCH | Mise à jour candidature |
| `/api/visits` | GET/POST/PATCH | Visites |
| `/api/leases` | GET/POST/PATCH | Baux |
| `/api/payments` | GET | Paiements |
| `/api/payments/initiate` | POST | Initier un paiement |
| `/api/maintenance` | GET/POST | Demandes de maintenance |
| `/api/messages` | GET/POST | Messagerie |
| `/api/disputes` | GET/POST/PATCH | Litiges |
| `/api/reviews` | GET/POST | Avis |
| `/api/properties` | GET | Recherche de biens |
| `/api/user/profile` | PATCH | Modification profil |
| `/api/user/notification-preferences` | GET/PATCH | Préférences notifications |
| `/api/user/change-password` | POST | Changement mot de passe |
| `/api/user/2fa` | POST | Activation 2FA |

## Composants clés

| Fichier | Description |
|---|---|
| `locataire/overview.tsx` | Dashboard principal avec KPI (dossier, loyer, visites) |
| `locataire/search-properties.tsx` | Moteur de recherche de biens avec filtres |
| `locataire/rental-file.tsx` | Formulaire multi-étapes du dossier locatif (catégorie, employeur, garant, documents) |
| `locataire/applications.tsx` | Liste des candidatures avec timeline de statut |
| `locataire/application-detail.tsx` | Détail d'une candidature (documents, propriété, décisions) |
| `locataire/my-visits.tsx` | Gestion des visites avec filtres par statut |
| `locataire/payments.tsx` | Historique des paiements avec filtres par statut |
| `locataire/maintenance.tsx` | Demandes de maintenance avec création |
| `locataire/trust-score.tsx` | Score de confiance du locataire |

## Contraintes & Permissions

- Un locataire ne peut avoir qu'un **seul dossier locatif DRAFT** à la fois (contrainte unique partielle `idx_rental_files_one_draft_per_tenant`)
- Le statut `VALIDATED` rend le dossier en lecture seule
- Un locataire peut avoir plusieurs rôles et basculer via `switch-role` (limité à LOCATAIRE, PROPRIETAIRE, AGENCE)
- L'upload de documents nécessite un fichier en statut `DRAFT`
