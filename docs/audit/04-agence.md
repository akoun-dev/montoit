# Agence (Agency)

## Rôle

Une **agence** est une entreprise de gestion locative qui agit comme intermédiaire entre propriétaires et locataires. Elle peut gérer des biens pour le compte de propriétaires (mandats de gestion), prospecter des clients, et assurer la gestion locative au quotidien.

## Fonctionnalités

### Gestion d'Équipe
- Gérer les collaborateurs/agents de l'agence
- Définir les rôles et permissions internes

### Portefeuille de Biens
- Gérer les biens sous mandat
- Publier des annonces pour le compte de propriétaires
- Suivre l'état des locations

### Mandats de Gestion
- Créer et gérer des mandats avec les propriétaires
- Signature électronique des mandats
- Suivi des commissions

### Candidatures & Location
- Recevoir et examiner les candidatures
- Valider les dossiers locatifs
- Gérer les baux et reconductions

### Visites
- Organiser et planifier les visites
- Gérer le calendrier des agents

### Finances
- Suivi des commissions perçues
- Tableau de bord financier
- Rémunération des agents

### Communication
- Messagerie interne et externe
- Marketing et prospection
- Campagnes de communication

### Reporting & Analytics
- Analytiques de performance
- Rapports d'activité
- Tableau de bord commercial

## Sections du tableau de bord

| Section | Composant | Description |
|---|---|---|
| `overview` | `AgenceOverview` | Vue d'ensemble (biens, mandats, commissions) |
| `team` | `TeamManagement` | Gestion de l'équipe |
| `portfolio` | `Portfolio` | Portefeuille de biens |
| `mandats` | `AgenceMandats` | Mandats de gestion |
| `candidatures` | `Candidatures` | Candidatures reçues |
| `finances` | `AgenceFinances` | Tableau de bord financier |
| `disputes` | `MyDisputes` | Gestion des litiges |
| `visits` | `AgenceVisits` | Planification des visites |
| `analytics` | `AgenceAnalytics` | Analytiques de performance |
| `contracts` | `AgenceContracts` | Contrats et baux |
| `communication` | `AgenceCommunication` | Outils de communication |
| `marketing` | `AgenceMarketing` | Outils marketing |
| `client-files` | `ClientFiles` | Dossiers clients |
| `notifications` | `Notifications` | Notifications |
| `settings` | `AgenceSettings` | Paramètres de l'agence |
| `security` | `AgenceSecurity` | Sécurité et accès |

## API Endpoints

### Agence spécifique
| Endpoint | Méthode | Description |
|---|---|---|
| `/api/agence/agents` | GET/POST | Gestion des agents d'agence |
| `/api/agence/commissions` | GET | Suivi des commissions |
| `/api/agence/settings` | GET/PATCH | Paramètres agence |
| `/api/agence/users` | GET | Recherche utilisateurs par rôle |

### Général (utilisé par l'agence)
| Endpoint | Méthode | Description |
|---|---|---|
| `/api/properties` | GET/POST | Gestion des biens |
| `/api/mandats` | GET/POST | Mandats de gestion |
| `/api/mandats/[id]` | GET/PATCH | Détail mandat |
| `/api/mandats/[id]/sign` | POST | Signature mandat |
| `/api/applications` | GET | Candidatures |
| `/api/visits` | GET/POST/PATCH | Visites |
| `/api/leases` | GET/POST/PATCH | Baux |
| `/api/payments` | GET | Paiements |
| `/api/messages` | GET/POST | Messagerie |
| `/api/disputes` | GET/POST/PATCH | Litiges |
| `/api/user/profile` | PATCH | Modification profil |
| `/api/user/notification-preferences` | GET/PATCH | Préférences notifications |

## Composants clés

| Fichier | Description |
|---|---|
| `agence/overview.tsx` | Dashboard avec KPIs (biens gérés, mandats actifs, commissions) |
| `agence/team.tsx` | Gestion des collaborateurs |
| `agence/portfolio.tsx` | Portefeuille de biens sous gestion |
| `agence/mandats.tsx` | Mandats de gestion avec propriétaires |
| `agence/candidatures.tsx` | Candidatures reçues |
| `agence/finances.tsx` | Finances (commissions, frais) |
| `agence/visits.tsx` | Gestion des visites |
| `agence/analytics.tsx` | Analytiques et reporting |
| `agence/contracts.tsx` | Contrats de location |
| `agence/communication.tsx` | Outils de communication |
| `agence/marketing.tsx` | Marketing et prospection |
| `agence/client-files.tsx` | Dossiers clients centralisés |

## Contraintes & Permissions

- Accès API restreint par le rôle `AGENCE`
- L'agence peut gérer plusieurs propriétaires via des mandats
- Les agents de l'agence sont des sous-utilisateurs avec permissions limitées
- L'agence a accès aux données de ses clients (propriétaires et locataires) dans le cadre des mandats
- Le rôle peut être combiné avec `LOCATAIRE` ou `PROPRIETAIRE` via `switch-role`
