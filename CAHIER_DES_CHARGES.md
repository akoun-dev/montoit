# Cahier des Charges - MonToit

**Plateforme Immobilière de Gestion de Location**

---

## 1. Présentation Générale

### 1.1 Contexte
MonToit est une plateforme immobilière numérique complète destinée au marché français de la location immobilière. Elle connecte les locataires, les propriétaires et les agences immobilières tout en assurant sécurité, vérification et conformité légale.

### 1.2 Objectifs
- Simplifier la recherche et la gestion de biens locatifs
- Sécuriser les transactions locatives via un système de vérification d'identité
- Faciliter la gestion des baux et des paiements
- Assurer la conformité avec la législation française

### 1.3 Technologies
- **Frontend**: React 18.3 + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Mobile**: Capacitor (iOS/Android)
- **Styling**: Tailwind CSS
- **State**: Zustand + TanStack Query

---

## 2. Acteurs et Rôles

### 2.1 Types d'Utilisateurs (Business Types)

| Type | Code | Description |
|------|------|-------------|
| **Locataire** | `tenant` / `locataire` | Recherche et loue des biens immobiliers |
| **Propriétaire** | `owner` / `proprietaire` | Met en location ses biens immobiliers |
| **Agence** | `agent` / `agence` | Gère des mandats de location et des biens |

### 2.2 Rôles Système (System Roles)

| Rôle | Description |
|------|-------------|
| **Admin** | Administrateur de la plateforme avec accès complet |
| **Moderator** | Modérateur de contenu généré par les utilisateurs |
| **Trust Agent** | Agent de vérification (certification des biens et utilisateurs) |
| **User** | Rôle par défaut pour tout utilisateur authentifié |

---

## 3. Architecture Fonctionnelle

### 3.1 Carte des Acteurs

```
┌─────────────────────────────────────────────────────────────────┐
│                        MONTOIT PLATFORM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ LOCATAIRE│  │  PROPRIÉTAIRE │  AGENCE   │  │   ADMIN       │    │
│  │          │  │          │  │          │  │               │    │
│  │ - Recherche│ - Gestion biens│ - Mandats │ - Admin sys    │    │
│  │ - Candidatures│ - Contrats │ - Équipe   │ - Modération   │    │
│  │ - Paiements│ - Locataires│ - Commissions│ - Config       │    │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └───────┬───────┘    │
│        │              │              │                 │            │
│        └──────────────┼──────────────┼─────────────────┘            │
│                       │              │                               │
│         ┌─────────────┴──────────────┴─────────────┐               │
│         │          SERVICES PARTAGÉS                │               │
│         │  - Messagerie                             │               │
│         │  - Vérification (ONECI)                   │               │
│         │  - Contrats / Signature électronique      │               │
│         │  - Paiements                              │               │
│         └────────────────────────────────────────────┘               │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │               TRUST AGENT / MODERATOR                    │    │
│  │  - Vérification terrain                                 │    │
│  │  - Validation documents                                 │    │
│  │  - Certification biens/utilisateurs                     │    │
│  │  - Gestion des litiges                                  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Flux Principaux

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   PUBLICATION│───▶│   RECHERCHE   │───▶│ CANDIDATURE  │───▶│   CONTRAT     │
│              │    │              │    │              │    │              │
│ Propriétaire │    │  Locataire   │    │  Locataire   │    │   Signature  │
│   Agence     │    │              │    │              │    │   Paiement   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

---

## 4. Fonctionnalités par Acteur

## 4.1 LOCATAIRE (Tenant)

### 4.1.1 Authentification et Profil
- [ ] Inscription avec email/mot de passe
- [ ] Vérification par OTP email
- [ ] Vérification biométrique (reconnaissance faciale)
- [ ] Complétion de profil obligatoire
- [ ] Vérification d'identité ONECI (carte nationale)
- [ ] Gestion multi-profils (si applicable)
- [ ] Réinitialisation mot de passe

### 4.1.2 Recherche de Biens
- [ ] Recherche par critères (localisation, prix, type, surface)
- [ ] Filtres avancés (équipements, disponibilité, MEUBLÉ/VIDE)
- [ ] Recherche rapide (QuickSearch)
- [ ] Sauvegarde des recherches
- [ ] Alertes email pour nouveaux biens
- [ ] Affichage cartes/liste
- [ ] Biens favoris

### 4.1.3 Consultation de Biens
- [ ] Fiche détaillée du bien
- [ ] Galerie photos/vidéos
- [ ] Plan d'accès carte interactive
- [ ] Équipements et commodités
- [ ] Informations propriétaire/agence (après auth)
- [ ] Visites virtuelles (si disponibles)
- [ ] Certificat de vérification (CEV)

### 4.1.4 Candidatures
- [ ] Candidature en ligne
- [ ] Suivi des candidatures
- [ ] Statut en temps réel
- [ ] Historique des candidatures
- [ ] Modification candidature en cours

### 4.1.5 Contrats
- [ ] Consultation des contrats de location
- [ ] Signature électronique
- [ ] Téléchargement PDF
- [ ] Historique des contrats
- [ ] Renouvellement de bail

### 4.1.6 Paiements
- [ ] Paiement du loyer en ligne
- [ ] Historique des paiements
- [ ] Moyens de paiement multiples (CB, prélèvement)
- [ ] Reçus et quittances de loyer
- [ ] Rappels de paiement
- [ ] Plan de paiement (si applicable)

### 4.1.7 Maintenance
- [ ] Signalement de problèmes
- [ ] Suivi des demandes
- [ ] Communication avec propriétaire
- [ ] Historique des interventions

### 4.1.8 Messagerie
- [ ] Messagerie sécurisée avec propriétaires/agents
- [ ] Conversation par bien
- [ ] Partage de documents
- [ ] Notifications en temps réel
- [ ] Blocage d'utilisateurs

### 4.1.9 Tableau de Bord
- [ ] Vue d'ensemble de la location
- [ ] Prochain paiement
- [ ] Contrat en cours
- [ ] Demandes de maintenance
- [ ] Messages non lus
- [ ] Calendrier des échéances

### 4.1.10 Documents
- [ ] Accès aux documents locatifs
- [ ] Contrat de location
- [ ] Quittances de loyer
- [ ] Attestations d'assurance
- [ ] États des lieux

---

## 4.2 PROPRIÉTAIRE (Owner)

### 4.2.1 Authentification et Profil
- [ ] Inscription/compte propriétaire
- [ ] Vérification d'identité
- [ ] Vérification des biens (Trust Agent)
- [ ] Badge Ansut de confiance
- [ ] Gestion du profil

### 4.2.2 Gestion des Biens
- [ ] Ajout de bien immobilier
- [ ] Édition des informations
- [ ] Photos multiples (jusqu'à X)
- [ ] Description détaillée
- [ ] Équipements et commodités
- [ ] Prix de location
- [ ] Disponibilité
- [ ] Statut du bien (actif/inactif/occupé)
- [ ] Statistiques de vues
- [ ] Suppression de bien

### 4.2.3 Candidatures
- [ ] Réception des candidatures
- [ ] Consultation des dossiers
- [ ] Vérification du profil candidat
- [ ] Acceptation/refus
- [ ] Communication avec candidats
- [ ] Historique des candidatures

### 4.2.4 Contrats
- [ ] Génération automatique de bail
- [ ] Modèles de contrat conformes
- [ ] Personnalisation du contrat
- [ ] Envoi pour signature
- [ ] Suivi de signature
- [ ] Archivage des contrats
- [ ] Renouvellement de bail
- [ ] Résiliation de bail

### 4.2.5 Gestion des Locataires
- [ ] Liste des locataires actuels
- [ ] Dossier locataire complet
- [ ] Historique des paiements
- [ ] Suivi des quittances
- [ ] Communication directe
- [ ] Documents locataire

### 4.2.6 Mandats
- [ ] Création de mandat d'agence
- [ ] Sélection de l'agence
- [ ] Durée du mandat
- [ ] Conditions de mandat
- [ ] Suivi du mandat
- [ ] Résiliation de mandat

### 4.2.7 Paiements
- [ ] Réception des loyers
- [ ] Historique des paiements
- [ ] Relevés de compte
- [ ] Export comptable

### 4.2.8 Visites
- [ ] Planification de visites
- [ ] Gestion des créneaux
- [ ] Confirmation avec candidats
- [ ] Historique des visites
- [ ] Notes après visite

### 4.2.9 Documents
- [ ] Gestion documentaire
- [ ] États des lieux entrée/sortie
- [ ] Diagnostics techniques
- [ ] Assurance propriétaire
- [ ] Taxe foncière

### 4.2.10 Rappels
- [ ] Configuration de rappels loyer
- [ ] Rappels d'échéances
- [ ] Alertes impayés
- [ ] Notifications personnalisées

### 4.2.11 Tableau de Bord
- [ ] Vue d'ensemble des biens
- [ ] Taux d'occupation
- [ ] Revenus locatifs
- [ ] Candidatures en attente
- [ ] Paiements du mois
- [ ] Alertes et notifications

---

## 4.3 AGENCE (Agency)

### 4.3.1 Espace Agence
- [ ] Tableau de bord agence
- [ ] Configuration du profil agence
- [ ] Certifications et agréments
- [ ] Paramètres de gestion

### 4.3.2 Gestion des Mandats
- [ ] Création de mandat
- [ ] Liste des mandats actifs
- [ ] Suivi des mandats
- [ ] Renouvellement
- [ ] Résiliation
- [ ] Historique des mandats

### 4.3.3 Gestion des Biens
- [ ] Ajout de bien sous mandat
- [ ] Édition des informations
- [ ] Photos et visuels
- [ ] Publication/dépublication
- [ ] Statistiques par bien

### 4.3.4 Équipe
- [ ] Gestion des agents
- [ ] Assignation des biens aux agents
- [ ] Droits et permissions
- [ ] Performance par agent
- [ ] Planning d'équipe

### 4.3.5 Candidatures
- [ ] Centralisation des candidatures
- [ ] Assignation aux agents
- [ ] Suivi du pipeline
- [ ] Statistiques de conversion

### 4.3.6 Contrats
- [ ] Création de contrats pour propriétaires
- [ ] Gestion des baux
- [ ] États des lieux
- [ ] Signature électronique

### 4.3.7 Commissions
- [ ] Calcul des commissions
- [ ] Suivi des paiements
- [ ] Facturation
- [ ] Rapports de commission

### 4.3.8 Analytics
- [ ] Tableau de bord statistiques
- [ ] Performance des biens
- [ ] Taux de transformation
- [ ] Rapports personnalisés
- [ ] Export de données

### 4.3.9 Calendrier
- [ ] Planning des visites
- [ ] Assignation des agents
- [ ] Synchronisation avec calendriers externes
- [ ] Rappels automatiques

### 4.3.10 Assignation
- [ ] Assignation des biens aux agents
- [ ] Gestion des portefeuilles
- [ ] Répartition des candidatures
- [ ] Suivi de performance

---

## 4.4 ADMIN (Administrateur)

### 4.4.1 Administration Système
- [ ] Tableau de bord admin
- [ ] Statistiques plateforme
- [ ] Monitoring des services
- [ ] Logs système
- [ ] Health checks

### 4.4.2 Gestion des Utilisateurs
- [ ] Liste des utilisateurs
- [ ] Détails utilisateur
- [ ] Modification de rôles
- [ ] Suspension/bannissement
- [ ] Réactivation de comptes
- [ ] Export utilisateur
- [ ] Historique des actions

### 4.4.3 Gestion des Rôles
- [ ] Attribution de rôles
- [ ] Gestion des permissions
- [ ] Création de rôles personnalisés
- [ ] Audit des permissions

### 4.4.4 Gestion des Biens
- [ ] Vue globale des biens
- [ ] Modération des annonces
- [ ] Signalement de biens
- [ ] Suppression de bien
- [ ] Validation de bien

### 4.4.5 Validation des Documents
- [ ] Queue de validation
- [ ] Vérification des identités
- [ ] Validation des justificatifs
- [ ] Rejet de documents
- [ ] Historique des validations

### 4.4.6 Gestion des Trust Agents
- [ ] Liste des agents de confiance
- [ ] Attribution de missions
- [ ] Géolocalisation des missions
- [ ] Validation des rapports
- [ ] Performance des agents

### 4.4.7 Clés API
- [ ] Gestion des clés API
- [ ] Rotation des clés
- [ ] Surveillance d'utilisation
- [ ] Révocation de clés

### 4.4.8 Règles Métier
- [ ] Configuration des règles plateforme
- [ ] Limites et quotas
- [ ] Frais et commissions
- [ ] Paramètres légaux

### 4.4.9 CEV (Certificat Électronique de Visite)
- [ ] Gestion des certificats
- [ ] Templates de certificats
- [ ] Validation des certificats
- [ ] Historique des CEV

### 4.4.10 Monitoring des Services
- [ ] État des services
- [ ] Alertes et incidents
- [ ] Métriques de performance
- [ ] Logs d'erreurs

### 4.4.11 Logs
- [ ] Logs d'audit
- [ ] Logs d'activité
- [ ] Logs de sécurité
- [ ] Export des logs
- [ ] Recherche dans les logs

### 4.4.12 Feature Flags
- [ ] Activation/désactivation de fonctionnalités
- [ ] Déploiement progressif
- [ ] Tests A/B
- [ ] Configuration par environnement

### 4.4.13 Transactions
- [ ] Historique des transactions
- [ ] Suivi des paiements
- [ ] Rapports financiers
- [ ] Export comptable

### 4.4.14 Prestataires de Services
- [ ] Gestion des intégrations externes
- [ ] Configuration des services tiers
- [ ] Surveillance des connexions
- [ ] Tests de connectivité

### 4.4.15 Analytics
- [ ] Statistiques plateforme
- [ ] KPIs métier
- [ ] Rapports périodiques
- [ ] Export de données

---

## 4.5 TRUST AGENT (Agent de Vérification)

### 4.5.1 Espace Trust Agent
- [ ] Tableau de bord des missions
- [ ] Statut de disponibilité
- [ ] Historique des missions
- [ ] Performance et KPIs

### 4.5.2 Missions Terrain
- [ ] Liste des missions assignées
- [ ] Détails de la mission
- [ ] Itinéraire et navigation
- [ ] Check-in/check-out géolocalisé
- [ ] Compte-rendu de mission

### 4.5.3 Vérification Photos
- [ ] Vérification des photos de biens
- [ ] Comparaison avec réalité
- [ ] Validation des visuels
- [ ] Demandes de corrections

### 4.5.4 Validation de Documents
- [ ] Validation des pièces d'identité
- [ ] Vérification des justificatifs de domicile
- [ ] Contrôle des revenus
- [ ] Validation des dossiers locataires

### 4.5.5 États des Lieux
- [ ] Réalisation d'état des lieux
- [ ] Photos annotées
- [ ] Inventaire du mobilier
- [ ] État de l'immobilier
- [ ] Signature mobile

### 4.5.6 Certification Utilisateurs
- [ ] Certification d'identité
- [ ] Vérification biométrique
- [ ] Badge de confiance
- [ ] Niveau de vérification

### 4.5.7 Certification de Biens
- [ ] Visite de vérification
- [ ] Attestation de conformité
- [ ] Photos certifiées
- [ ] Badge de certification

### 4.5.8 Validation de Dossier
- [ ] Révision complète du dossier
- [ ] Checklist de validation
- [ ] Demande de compléments
- [ ] Décision finale

### 4.5.9 Missions CEV
- [ ] Émission de certificats de visite
- [ ] Validation des conditions
- [ ] Rapport de visite
- [ ] Signature numérique

### 4.5.10 Gestion des Litiges
- [ ] Médiation propriétaire-locataire
- [ ] Visite de conciliation
- [ ] Rapport de litige
- [ ] Recommandations

### 4.5.11 Rapports
- [ ] Génération de rapports PDF
- [ ] Photos et preuves
- [ ] Notes et observations
- [ ] Envoi aux parties

### 4.5.12 Gestion d'Équipe
- [ ] Vue d'équipe des agents
- [ ] Répartition des missions
- [ ] Communication interne
- [ ] Partage de bonnes pratiques

---

## 4.6 MODERATOR (Modérateur)

### 4.6.1 Espace Modération
- [ ] Tableau de bord de modération
- [ ] Files d'attente
- [ ] Statistiques de modération

### 4.6.2 Modération de Contenu
- [ ] Modération des annonces immobilières
- [ ] Modération des messages
- [ ] Modération des avis
- [ ] Modération des photos

### 4.6.3 Signalements Utilisateurs
- [ ] Liste des signalements
- [ ] Détails du signalement
- [ ] Actions (avertissement, suspension)
- [ ] Historique des sanctions

### 4.6.4 File de Modération
- [ ] Queue chronologique
- [ ] Priorisation
- [ ] Assignation aux modérateurs
- [ ] Escalade

### 4.6.5 Historique de Modération
- [ ] Journal des actions
- [ ] Raison des décisions
- [ ] Statistiques par modérateur
- [ ] Export des données

---

## 5. Services Transverses

### 5.1 Messagerie (`/src/features/messaging/`)
- [ ] Messagerie sécurisée chiffrée
- [ ] Conversations par bien
- [ ] Messagerie instantanée
- [ ] Notifications push
- [ ] Partage de documents
- [ ] Système de blocage
- [ ] Signalement de messages
- [ ] Historique des conversations

### 5.2 Vérification (`/src/features/verification/`)
- [ ] Vérification d'identité ONECI
- [ ] Capture faciale biométrique
- [ ] Validation de documents
- [ ] Indicateurs de confiance
- [ ] Badge Ansut
- [ ] Niveaux de vérification
- [ ] Historique des vérifications

### 5.3 Contrats (`/src/features/contract/`)
- [ ] Création automatique de bail
- [ ] Modèles conformes (loi ALUR)
- [ ] Signature électronique
- [ ] Génération PDF
- [ ] Archivage légal
- [ ] Notifications d'échéances
- [ ] État des lieux

### 5.4 Paiements (`/src/features/payments/`)
- [ ] Intégration moyen de paiement
- [ ] Paiement sécurisé
- [ ] Prélèvements automatiques
- [ ] Reçus et factures
- [ ] Gestion des impayés
- [ ] Notifications de paiement
- [ ] Export comptable

### 5.5 Notifications (`/src/features/notifications/`)
- [ ] Notifications email
- [ ] Notifications push mobile
- [ ] Notifications in-app
- [ ] Préférences de notification
- [ ] Historique des notifications
- [ ] Centre de notifications

---

## 6. Base de Données

### 6.1 Tables Principales

| Table | Description |
|-------|-------------|
| `profiles` | Profils utilisateurs (type business) |
| `user_roles` | Rôles système attribués |
| `properties` | Biens immobiliers |
| `lease_contracts` | Contrats de location |
| `applications` | Candidatures locataires |
| `payments` | Paiements de loyer |
| `messages` | Messages échangés |
| `conversations` | Conversations de messagerie |
| `notifications` | Notifications utilisateurs |
| `mandates` | Mandats d'agence |
| `verifications` | Vérifications d'identité |
| `admin_audit_logs` | Journal d'audit admin |
| `maintenance_requests` | Demandes de maintenance |
| `property_visits` | Visites de biens |
| `trust_agents_missions` | Missions agents de confiance |

### 6.2 Sécurité
- Row Level Security (RLS) sur toutes les tables
- JWT pour l'authentification
- Chiffrement des données sensibles
- Logs d'audit complets

---

## 7. UX/UI et Design

### 7.1 Principes de Design
- Design mobile-first
- Conformité WCAG AA (accessibilité)
- Système de design tokens
- Touch targets minimum 44px
- Grille de spacing 4pt

### 7.2 Palette de Couleurs
- `neutral-900`: Texte principal
- `neutral-700`: Texte secondaire
- `primary-500`: Orange (#ff6c2f) - Action principale
- Couleurs de statut (succès, erreur, avertissement, info)

### 7.3 Composants Partagés
- Button (variants: primary, secondary, outline, text)
- Input (text, email, password, number, tel)
- Card (minimum padding 32px)
- Modal
- Dropdown
- Badge
- Avatar
- Skeleton (loading states)

### 7.4 Mises en page
- **Public**: Header/Footer, contenu centré
- **Dashboard**: Sidebar + Main Content
- **Mobile**: Bottom navigation
- **Tablette**: Responsive layout adaptatif

---

## 8. Routes de l'Application

### 8.1 Routes Publiques (`/`)
| Route | Description |
|-------|-------------|
| `/` | Accueil |
| `/recherche` | Recherche de biens |
| `/bien/:id` | Détail d'un bien |
| `/mentions-legales` | Mentions légales |
| `/confidentialite` | Politique de confidentialité |
| `/cgu` | Conditions générales |

### 8.2 Routes d'Authentification (`/auth`)
| Route | Description |
|-------|-------------|
| `/auth/login` | Connexion |
| `/auth/register` | Inscription |
| `/auth/forgot-password` | Mot de passe oublié |
| `/auth/reset-password` | Réinitialisation |
| `/auth/verify-email` | Vérification email |
| `/auth/callback` | OAuth callback |

### 8.3 Routes Locataire (`/locataire`)
| Route | Description |
|-------|-------------|
| `/locataire/dashboard` | Tableau de bord |
| `/locataire/profil` | Profil |
| `/locataire/recherche` | Recherche avancée |
| `/locataire/favoris` | Biens favoris |
| `/locataire/candidatures` | Candidatures |
| `/locataire/contrats` | Contrats |
| `/locataire/paiements` | Paiements |
| `/locataire/maintenance` | Maintenance |
| `/locataire/documents` | Documents |
| `/locataire/messages` | Messagerie |
| `/locataire/calendrier` | Calendrier |

### 8.4 Routes Propriétaire (`/proprietaire`)
| Route | Description |
|-------|-------------|
| `/proprietaire/dashboard` | Tableau de bord |
| `/proprietaire/biens` | Gestion des biens |
| `/proprietaire/biens/ajouter` | Ajouter un bien |
| `/proprietaire/biens/:id` | Éditer un bien |
| `/proprietaire/candidatures` | Candidatures |
| `/proprietaire/contrats` | Contrats |
| `/proprietaire/locataires` | Locataires |
| `/proprietaire/mandats` | Mandats |
| `/proprietaire/paiements` | Paiements |
| `/proprietaire/visites` | Visites |
| `/proprietaire/documents` | Documents |
| `/proprietaire/messages` | Messagerie |
| `/proprietaire/rappels` | Rappels |

### 8.5 Routes Agence (`/agences`)
| Route | Description |
|-------|-------------|
| `/agences/dashboard` | Tableau de bord |
| `/agences/mandats` | Mandats |
| `/agences/biens` | Biens |
| `/agences/equipe` | Équipe |
| `/agences/candidatures` | Candidatures |
| `/agences/contrats` | Contrats |
| `/agences/commissions` | Commissions |
| `/agences/analytics` | Analytics |
| `/agences/calendrier` | Calendrier |
| `/agences/assignations` | Assignations |
| `/agences/messages` | Messagerie |

### 8.6 Routes Admin (`/admin`)
| Route | Description |
|-------|-------------|
| `/admin/dashboard` | Tableau de bord |
| `/admin/utilisateurs` | Gestion utilisateurs |
| `/admin/roles` | Gestion des rôles |
| `/admin/biens` | Modération biens |
| `/admin/documents` | Validation documents |
| `/admin/trust-agents` | Agents de confiance |
| `/admin/api-keys` | Clés API |
| `/admin/regles` | Règles métier |
| `/admin/cev` | Certificats visite |
| `/admin/services` | Monitoring services |
| `/admin/logs` | Logs système |
| `/admin/feature-flags` | Feature flags |
| `/admin/transactions` | Transactions |
| `/admin/prestataires` | Services tiers |
| `/admin/analytics` | Analytics |

### 8.7 Routes Trust Agent (`/trust-agent`)
| Route | Description |
|-------|-------------|
| `/trust-agent/dashboard` | Tableau de bord |
| `/trust-agent/missions` | Missions |
| `/trust-agent/verifications` | Vérifications |
| `/trust-agent/etats-lieux` | États des lieux |
| `/trust-agent/certifications` | Certifications |
| `/trust-agent/rapports` | Rapports |
| `/trust-agent/litiges` | Litiges |
| `/trust-agent/equipe` | Équipe |

### 8.8 Routes Moderator (`/moderator`)
| Route | Description |
|-------|-------------|
| `/moderator/dashboard` | Tableau de bord |
| `/moderator/contenu` | Modération contenu |
| `/moderator/signalements` | Signalements |
| `/moderator/file` | File de modération |
| `/moderator/historique` | Historique |

---

## 9. Sécurité et Conformité

### 9.1 Sécurité
- [ ] Authentification forte (2FA optionnelle)
- [ ] Chiffrement des données sensibles
- [ ] Row Level Security (RLS)
- [ ] Protection XSS, CSRF
- [ ] Rate limiting API
- [ ] Scan de sécurité automatisé
- [ ] Tests de pénétration réguliers

### 9.2 Conformité Légale (France)
- [ ] RGPD (protection données personnelles)
- [ ] Loi ALUR (bail d'habitation)
- [ ] Loi ELAN (dispositions logement)
- [ ] Diagnostic de performance énergétique (DPE)
- [ ] État des lieux réglementaire
- [ ] Quittance de loyer conforme
- [ ] Assurance responsabilité civile

### 9.3 Données Personnelles
- [ ] Consentement explicite
- [ ] Droit d'accès
- [ ] Droit de rectification
- [ ] Droit à l'oubli
- [ ] Portabilité des données
- [ ] Politique de confidentialité
- [ ] Registre des traitements

---

## 10. Mobile (Capacitor)

### 10.1 Fonctionnalités Mobile
- [ ] Authentification biométrique (Face ID/Touch ID)
- [ ] Notifications push
- [ ] Géolocalisation
- [ ] Appareil photo
- [ ] Stockage local
- [ ] Partage natif
- [ ] Haptiques (feedbacks)

### 10.2 Support Platforme
- [ ] iOS 14+
- [ ] Android 10+
- [ ] App Store (iOS)
- [ ] Google Play Store (Android)

---

## 11. Intégrations Externes

### 11.1 Services Intégrés
| Service | Usage |
|---------|-------|
| **Supabase** | Backend, Auth, Database, Storage |
| **Azure OpenAI** | Services IA (optionnel) |
| **Mapbox** | Cartes et géocodage (optionnel) |
| **Google Maps** | Cartes alternatives (optionnel) |
| **Azure SMS** | SMS notifications (optionnel) |
| **Services signature** | Signature électronique (optionnel) |
| **Paiement** | Stripe / autre (optionnel) |

---

## 12. Non-Fonctionnels

### 12.1 Performance
- [ ] Temps de chargement < 3 secondes
- [ ] First Contentful Paint < 1.5s
- [ ] Lazy loading des routes
- [ ] Optimisation des images
- [ ] Code splitting

### 12.2 Disponibilité
- [ ] Uptime 99.9%
- [ ] Backup automatique
- [ ] Recovery plan
- [ ] Monitoring continu

### 12.3 Scalabilité
- [ ] Architecture scalable
- [ ] Gestion de charge
- [ ] Cache (TanStack Query)
- [ ] CDN pour assets

### 12.4 Tests
- [ ] Tests unitaires (Vitest)
- [ ] Tests d'intégration
- [ ] Tests E2E
- [ ] Tests de sécurité
- [ ] Tests de performance
- [ ] Tests de memory leaks

---

## 13. Roadmap

### Phase 1 - MVP (Version Actuelle)
- ✅ Authentification et profils
- ✅ Gestion des biens
- ✅ Recherche de biens
- ✅ Candidatures
- ✅ Contrats de base
- ✅ Messagerie
- ✅ Structure admin

### Phase 2 - Fonctionnalités Avancées
- [ ] Paiements en ligne
- [ ] Signature électronique complète
- [ ] ONECI vérification
- [ ] Trust Agent complet
- [ ] États des lieux mobile
- [ ] Notifications push

### Phase 3 - Intégrations
- [ ] Paiement Stripe
- [ ] Signature électronique (Yousign/DocuSign)
- [ ] Cartes interactives
- [ ] SMS notifications
- [ ] Analytics avancés

### Phase 4 - Mobile
- [ ] App iOS native
- [ ] App Android native
- [ ] Fonctionnalités mobile avancées

---

## 14. Glossaire

| Terme | Définition |
|-------|------------|
| **ONECI** | Office National d'Identification Civil (Côte d'Ivoire) - Service d'identité |
| **CEV** | Certificat Électronique de Visite |
| **ALUR** | Loi pour l'accès au logement et un urbanisme rénové |
| **ELAN** | Évolution du logement, de l'aménagement et du numérique |
| **Ansut** | Badge de certification confiance MonToit |
| **DPE** | Diagnostic de Performance Énergétique |
| **RLS** | Row Level Security (Sécurité au niveau ligne) |
| **OTP** | One-Time Password (Mot de passe à usage unique) |

---

## 15. Annexes

### 15.1 Architecture Technique
- React 18.3 avec TypeScript
- Vite 7.3 pour le build
- Supabase pour le backend
- Capacitor pour le mobile

### 15.2 Structure du Code
```
src/
├── app/              # Application entry point
├── features/         # Domain-driven feature modules
├── components/       # Shared UI components
├── services/         # API services
├── hooks/           # Custom React hooks
├── lib/             # Utilities
├── contexts/        # React contexts
├── types/           # TypeScript types
└── shared/          # Shared utilities
```

---

**Document Version**: 1.0
**Date de Création**: 2026-02-09
**Dernière Mise à Jour**: 2026-02-09
