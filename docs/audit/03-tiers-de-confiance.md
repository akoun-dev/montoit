# Tiers de Confiance (Trusted Third Party)

## Rôle

Le **Tiers de Confiance (TC)** est un acteur central de la plateforme. Il est chargé de vérifier, valider et certifier les informations et documents des utilisateurs (propriétaires, locataires, biens). Il agit comme un garant de la confiance entre les parties.

## Fonctionnalités

### Vérification des Dossiers Locatifs
- Examiner les dossiers locatifs soumis par les locataires
- Valider, rejeter ou demander des compléments d'information
- Visualiser tous les documents du dossier
- Ajouter des commentaires

### Vérification des Dossiers Propriétaires
- Examiner les dossiers propriétaires (documents d'identité, titre de propriété, RIB)
- Valider ou rejeter avec motif
- Ajouter des commentaires visibles par le propriétaire

### Vérification des Biens
- Vérifier les annonces de location
- Approuver ou rejeter les mises en ligne
- Dé-publier des annonces problématiques

### Gestion des Agents de Vérification
- Créer et gérer des agents de vérification terrain
- Assigner des missions aux agents
- Recevoir les feedbacks des agents

### États des Lieux
- Créer et gérer les états des lieux (entrée/sortie)
- Documents photo, commentaires

### Certifications
- Gérer les certifications des biens et des utilisateurs
- Suivi des validations

### Fraude & Sécurité
- Alertes de fraude
- Vérification d'identité via le système ONECI
- Vérification faciale (NeoFace)

### Litiges & Signalements
- Gérer les litiges entre parties
- Traiter les signalements d'annonces

### Monitoring & SLA
- Suivi des indicateurs de performance (SLA)
- Tableau de bord de l'activité

## Sections du tableau de bord

| Section | Compasant | Description |
|---|---|---|
| `overview` | `TcOverview` | Vue d'ensemble (statistiques, alertes récentes) |
| `all-properties` | `AllProperties` | Toutes les annonces |
| `users` | `TcUsers` | Gestion des utilisateurs |
| `property-verifications` | `PropertyVerifications` | Liste des biens à vérifier |
| `property-verify-detail` | `PropertyVerifyDetail` | Détail vérification d'un bien |
| `inventory-report-form` | `InventoryReportForm` | Création état des lieux |
| `dossier-validations` | `DossierValidations` | File d'attente unifiée (location + propriétaire) |
| `rental-files-queue` | `RentalFilesQueue` | Dossiers locatifs en attente de validation |
| `rental-file-detail` | `RentalFileDetail` | Détail dossier locatif (documents, décisions) |
| `owner-validations` | `OwnerValidations` | Ancienne vue validation propriétaire |
| `owner-dossiers` | `OwnerDossierValidations` | Dossiers propriétaires à valider |
| `agency-validations` | `AgencyValidations` | Validation des agences |
| `inventory-reports` | `InventoryReportsList` | Liste des états des lieux |
| `sla-monitoring` | `SlaMonitoring` | Monitoring SLA |
| `agents` | `AgentsManagement` | Gestion des agents de vérification |
| `missions` | `MissionsManagement` | Gestion des missions terrain |
| `litiges` | `LitigesManagement` | Gestion des litiges |
| `messaging` | `TcMessaging` | Messagerie TC |
| `certifications` | `CertificationsManagement` | Gestion des certifications |
| `oneci-verification` | `OneciVerification` | Vérification ONECI |
| `fraud-alerts` | `FraudAlertsManagement` | Alertes fraude |
| `documentation` | `DocumentationCenter` | Centre de documentation |
| `notifications` | `Notifications` | Notifications |
| `history` | `ActivityHistory` | Historique d'activité |
| `settings` | `TcSettings` | Paramètres |

## API Endpoints

### TC spécifique
| Endpoint | Méthode | Description |
|---|---|---|
| `/api/tc/rental-files` | GET/PATCH | Dossiers locatifs (validation) |
| `/api/tc/owner-files` | GET/PATCH | Dossiers propriétaires (validation) |
| `/api/tc/ownership-docs` | GET | Documents de propriété |
| `/api/tc/properties` | GET | Toutes les annonces |
| `/api/tc/properties/[id]/unpublish` | POST | Dé-publier une annonce |
| `/api/tc/verifications` | GET/POST | Vérifications de biens |
| `/api/tc/inventory-reports` | GET/POST/PATCH | États des lieux |
| `/api/tc/agents` | GET/POST/PATCH/DELETE | Agents de vérification |
| `/api/tc/missions` | GET/POST/PATCH | Missions terrain |
| `/api/tc/certifications` | GET/POST/PATCH | Certifications |
| `/api/tc/fraud-alerts` | GET/POST/PATCH | Alertes fraude |
| `/api/tc/litiges` | GET/POST/PATCH | Litiges |
| `/api/tc/users` | GET | Liste utilisateurs |
| `/api/tc/messages` | GET/POST | Messagerie TC |
| `/api/tc/oneci` | GET | Vérification ONECI |
| `/api/tc/agent-feedback` | GET/POST | Feedback agents |
| `/api/tc/signal-property` | POST | Signaler une annonce |
| `/api/tc/warn-owner` | POST | Avertir un propriétaire |

### Partagé avec ADMIN
| Endpoint | Méthode | Détail |
|---|---|---|
| `/api/tc/rental-files` | GET/PATCH | Aussi accessible par ADMIN |
| `/api/tc/owner-files` | GET/PATCH | Aussi accessible par ADMIN |
| `/api/tc/litiges` | GET/POST/PATCH | Aussi accessible par ADMIN |

### Exclusif TC (pas ADMIN)
| Endpoint | Raison |
|---|---|
| `/api/tc/agents` | Gestion des équipes terrain |
| `/api/tc/missions` | Opérations terrain |
| `/api/tc/certifications` | Certifications |
| `/api/tc/properties` | Catalogue annonces |

## Composants clés

| Fichier | Description |
|---|---|
| `tc/overview.tsx` | Dashboard avec KPIs (validations, SLA, alertes) |
| `tc/rental-files-queue.tsx` | File d'attente des dossiers locatifs |
| `tc/rental-file-detail.tsx` | Détail dossier locatif (documents, infos locataire) |
| `tc/owner-dossier-validations.tsx` | Validation des dossiers propriétaires |
| `tc/dossier-validations.tsx` | Vue unifiée (location + propriétaire) |
| `tc/property-verifications.tsx` | Vérification des biens |
| `tc/agents.tsx` | Gestion des agents de vérification |
| `tc/missions.tsx` | Gestion des missions |
| `tc/litiges.tsx` | Gestion des litiges |
| `tc/fraud-alerts.tsx` | Alertes fraude |
| `tc/oneci-verification.tsx` | Vérification d'identité ONECI |
| `tc/sla-monitoring.tsx` | Monitoring des SLA |
| `tc/certifications.tsx` | Gestion des certifications |
| `tc/document-preview-dialog.tsx` | Prévisualisation de documents |

## Contraintes & Permissions

- Rôle **non-basculable** : un TC ne peut pas changer de rôle (contrairement aux utilisateurs multi-rôles)
- Accès à tous les dossiers utilisateurs (vue transverse)
- Certains endpoints TC sont **exclusifs TC** (agents, missions, certifications)
- D'autres endpoints sont **partagés avec ADMIN** (rental-files, owner-files, litiges)
- Le TC peut :
  - Voir tous les documents uploadés
  - Valider/rejeter les dossiers
  - Ajouter des commentaires
  - Dé-publier des annonces
  - Avertir les propriétaires
