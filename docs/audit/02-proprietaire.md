# Proprietaire (Property Owner / Landlord)

## Rôle

Un **propriétaire** possède un ou plusieurs biens immobiliers qu'il met en location. Il gère ses annonces, examine les candidatures des locataires, suit les paiements, et coordonne les visites/maintenance.

## Fonctionnalités

### Biens & Annonces
- Ajouter/modifier/supprimer des biens immobiliers
- Publier/dépublier des annonces
- Gérer les photos et documents des biens
- Suivre le statut de vérification de ses biens

### Candidatures & Location
- Recevoir et examiner les dossiers locatifs des candidats
- Accepter/refuser les candidatures
- Signer des mandats de gestion avec une agence
- Gérer les baux (création, signature, résiliation)

### Visites
- Recevoir et gérer les demandes de visite
- Planifier/accepter/refuser les visites

### Paiements & Finances
- Suivre les loyers perçus
- Voir les impayés et relances
- Tableau de bord financier (chiffre d'affaires, charges)
- Analytiques (occupation, rendement)

### Dossier Propriétaire
- Créer et soumettre son **dossier propriétaire** (documents d'identité, titre de propriété, RIB)
- Ce dossier est vérifié par un Tiers de Confiance

### Messagerie & Litiges
- Communiquer avec les locataires et agences
- Gérer les litiges

### Maintenance
- Recevoir les signalements de maintenance
- Suivre et résoudre les problèmes signalés

## Sections du tableau de bord

| Section | Composant | Description |
|---|---|---|
| `overview` | `ProprietaireOverview` | Vue d'ensemble (biens, revenus, alertes) |
| `my-properties` | `MyProperties` | Gestion du parc immobilier |
| `my-tenants` | `TenantsList` | Liste des locataires |
| `tenant-detail` | `TenantDetail` | Détail d'un locataire (bail, paiements) |
| `visit-requests` | `VisitRequests` | Demandes de visite |
| `candidatures` | `EnhancedRentalFiles` | Dossiers locatifs des candidats |
| `disputes` | `MyDisputes` | Gestion des litiges |
| `my-leases` | `EnhancedLeases` | Contrats de location (avec onglets Actifs/En attente/Archivés) |
| `mandats` | `ProprietaireMandats` | Mandats de gestion avec agences |
| `owner-file` | `OwnerFileForm` | Dossier propriétaire (vérification TC) |
| `finances` | `OwnerFinances` | Tableau de bord financier |
| `analytics` | `OwnerAnalytics` | Analytiques détaillées |
| `inventory-report-form` | `InventoryReportForm` | État des lieux |
| `messages` | `ProprietaireMessages` | Messagerie |
| `notifications` | `Notifications` | Notifications |
| `trust-score` | `TrustScore` | Score de confiance |
| `reviews` | `OwnerReviews` | Avis reçus |
| `maintenance` | `OwnerMaintenance` | Demandes de maintenance |
| `history` | `ActivityHistory` | Historique d'activité |
| `settings` | `OwnerSettings` | Paramètres |

## API Endpoints

### Propriétaire spécifique
| Endpoint | Méthode | Description |
|---|---|---|
| `/api/owner/analytics` | GET | Analytiques propriétaire |
| `/api/owner/finances` | GET | Finances propriétaire |
| `/api/owner/rental-files` | GET/PATCH | Dossiers locatifs reçus |
| `/api/owner/reviews` | GET/POST | Avis sur le propriétaire |
| `/api/owner-file` | GET/POST | Dossier propriétaire |
| `/api/owner-file/documents` | POST/DELETE | Documents dossier propriétaire |

### Général (utilisé par le propriétaire)
| Endpoint | Méthode | Description |
|---|---|---|
| `/api/properties` | GET/POST | Gestion des biens |
| `/api/properties/[id]` | GET/PATCH/DELETE | Détail d'un bien |
| `/api/rental-files/[id]/action` | POST | Accepter/refuser un dossier locatif |
| `/api/visits` | GET/PATCH | Gestion des visites |
| `/api/leases` | GET/POST/PATCH | Gestion des baux |
| `/api/mandats` | GET/POST | Mandats de gestion |
| `/api/mandats/[id]` | GET/PATCH | Détail mandat |
| `/api/mandats/[id]/sign` | POST | Signature mandat |
| `/api/payments` | GET | Paiements reçus |
| `/api/maintenance` | GET/PATCH | Maintenance |
| `/api/messages` | GET/POST | Messagerie |
| `/api/disputes` | GET/POST/PATCH | Litiges |
| `/api/tenants` | GET | Liste locataires |
| `/api/tenants/[id]` | GET | Détail locataire |
| `/api/tc/inventory-reports` | GET/POST/PATCH | États des lieux (via TC) |
| `/api/user/profile` | PATCH | Modification profil |

## Composants clés

| Fichier | Description |
|---|---|
| `proprietaire/overview.tsx` | Dashboard avec KPIs (biens, locataires, revenus, alertes) |
| `proprietaire/my-properties.tsx` | Liste des biens avec recherche et filtres |
| `proprietaire/enhanced-rental-files.tsx` | Candidatures reçues avec filtres statut (En attente/Validés/Refusés/Tous) |
| `proprietaire/owner-file.tsx` | Dossier propriétaire avec upload documents et suivi validation TC |
| `proprietaire/enhanced-leases.tsx` | Baux avec onglets Actifs/En attente/Archivés |
| `proprietaire/mandats.tsx` | Mandats de gestion agence |
| `proprietaire/finances.tsx` | Finances (loyers, charges, impayés) |
| `proprietaire/analytics.tsx` | Analytiques (occupation, rendement) |
| `proprietaire/owner-maintenance.tsx` | Demandes de maintenance reçues |

## Contraintes & Permissions

- Accès API restreint par le rôle `PROPRIETAIRE`
- Le dossier propriétaire est vérifié par un **Tiers de Confiance** avant validation
- Un propriétaire peut avoir plusieurs rôles et basculer via `switch-role`
- Le statut `VALIDATED` du dossier propriétaire rend les documents en lecture seule
- Les mandats de gestion lient le propriétaire à une agence
