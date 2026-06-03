# Admin (Administrator)

## Rôle

L'**administrateur** est le super-utilisateur de la plateforme. Il a une vue complète sur l'ensemble du système, gère les utilisateurs, les configurations, la sécurité, et supervise les opérations des Tiers de Confiance.

## Fonctionnalités

### Gestion des Utilisateurs
- Lister, filtrer et rechercher tous les utilisateurs
- Modifier les rôles, suspendre/bannir des comptes
- Voir les détails complets (KYC, documents, historique)

### Modération des Biens
- Modérer les annonces signalées
- Approuver/rejeter les mises en ligne
- Gérer les signalements

### Supervision TC
- Gérer les comptes Tiers de Confiance
- Superviser leur activité
- Consulter les indicateurs de performance

### Gestions des Signalements
- Recevoir et traiter les signalements d'annonces ou d'utilisateurs
- Prendre des mesures (avertissement, bannissement)

### Litiges (Supervision)
- Vue complète de tous les litiges
- Arbitrage et résolution

### Sécurité & Configuration
- Paramètres de sécurité plateforme (IP rules, 2FA, sessions)
- Configuration générale (SLA, notifications, etc.)
- Règles de validation

### Maintenance Système
- Monitoring de l'état du système
- Gestion des sauvegardes (backups)
- Consultation des logs d'audit
- Rapports et statistiques

## Sections du tableau de bord

| Section | Composant | Description |
|---|---|---|
| `overview` | `AdminOverview` | Vue d'ensemble (KPIs système, alertes) |
| `users` | `AdminUsers` | Gestion des utilisateurs |
| `properties-moderation` | `PropertiesModeration` | Modération des annonces |
| `moderation` | `AdminModeration` | Modération générale |
| `tc-management` | `TcManagement` | Supervision des TC |
| `trust-agents` | `AdminTrustAgents` | Supervision des agents de vérification |
| `signalements` | `AdminSignalements` | Gestion des signalements |
| `disputes` | `Disputes` | Supervision des litiges |
| `notifications` | `AdminNotifications` | Notifications système |
| `reports` | `Reports` | Rapports et statistiques |
| `system` | `AdminSystem` | Santé du système |
| `security` | `AdminSecurity` | Sécurité de la plateforme |
| `config` | `AdminConfig` | Configuration générale |
| `backups` | `AdminBackups` | Gestion des sauvegardes |
| `settings` | `AdminSettings` | Paramètres plateforme |

## API Endpoints

### Admin spécifique
| Endpoint | Méthode | Description |
|---|---|---|
| `/api/admin/users` | GET/PATCH | Gestion des utilisateurs |
| `/api/admin/properties-moderation` | GET/PATCH | Modération des biens |
| `/api/admin/backups` | GET/POST | Sauvegardes |
| `/api/admin/system` | GET | Métriques système |
| `/api/admin/audit-logs` | GET | Logs d'audit |
| `/api/admin/settings` | GET/PATCH | Paramètres plateforme |
| `/api/admin/signalements` | GET/PATCH | Gestion des signalements |

### Partagé avec TC
| Endpoint | Méthode | Description |
|---|---|---|
| `/api/tc/rental-files` | GET/PATCH | Dossiers locatifs |
| `/api/tc/owner-files` | GET/PATCH | Dossiers propriétaires |
| `/api/tc/litiges` | GET/POST/PATCH | Litiges |

### Général (consultation)
| Endpoint | Méthode | Description |
|---|---|---|
| `/api/users` | GET | Recherche utilisateurs |
| `/api/properties` | GET | Tous les biens |
| `/api/stats` | GET | Statistiques plateforme |
| `/api/history` | GET | Historique global |

## Composants clés

| Fichier | Description |
|---|---|
| `admin/overview.tsx` | Dashboard avec KPIs (utilisateurs, biens, TC, alertes) |
| `admin/users.tsx` | Gestion et modération des utilisateurs |
| `admin/properties-moderation.tsx` | Modération des annonces |
| `admin/moderation.tsx` | Modération générale (contenu) |
| `admin/tc-management.tsx` | Supervision des Tiers de Confiance |
| `admin/trust-agents.tsx` | Supervision des agents de vérification |
| `admin/signalements.tsx` | Traitement des signalements |
| `admin/disputes.tsx` | Arbitrage des litiges |
| `admin/system.tsx` | Monitoring système (CPU, mémoire, uptime) |
| `admin/security.tsx` | Sécurité (IP rules, 2FA, sessions) |
| `admin/config.tsx` | Configuration plateforme |
| `admin/backups.tsx` | Gestion des sauvegardes |
| `admin/reports.tsx` | Rapports et statistiques |

## Contraintes & Permissions

- Rôle **non-basculable** : un ADMIN ne peut pas changer de rôle
- Accès total à toutes les données (aucune restriction)
- Peut suspendre/bannir des utilisateurs
- Peut modifier les rôles des utilisateurs
- Accès aux logs d'audit complets
- Gère les sauvegardes de la base de données
- Configure les paramètres globaux de la plateforme (SLA, sécurité, notifications)
- Les paramètres admin sont stockés dans la table `platform_settings` avec les clés :
  - `admin_security`
  - `admin_notifications`
  - `admin_sla`
  - `admin_ip_rules`
