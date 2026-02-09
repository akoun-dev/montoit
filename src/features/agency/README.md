# Module Agence - MonToit

Module de gestion complète pour les agences immobilières sur la plateforme MonToit.

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Routes](#-routes)
- [Composants](#-composants)
- [Services](#-services)
- [Hooks](#-hooks)
- [Base de données](#-base-de-données)
- [Architecture](#-architecture)
- [Sécurité](#-sécurité)
- [Intégrations](#-intégrations)

---

## 🚀 Fonctionnalités

### Dashboard

| Fonctionnalité | Description |
|----------------|-------------|
| **Vue d'ensemble** | Statistiques globales de l'agence |
| **KPIs** | Biens, baux actifs, candidatures, revenus |
| **Tendances** | Évolution des indicateurs clés |
| **Actions rapides** | Accès rapide aux fonctionnalités principales |

### Gestion des Biens

| Fonctionnalité | Description |
|----------------|-------------|
| **Liste des biens** | Vue complète avec filtres et recherche |
| **Détail bien** | Informations complètes avec photos et caractéristiques |
| **Édition** | Modification des informations d'un bien |
| **Ajout** | Création via formulaire complet |
| **Attributions** | Assignation aux agents de l'agence |
| **Tableau avancé** | Vue avec agents assignés et statuts |

### Gestion des Mandats

| Fonctionnalité | Description |
|----------------|-------------|
| **Liste des mandats** | Filtres : tous, en attente, actifs, suspendus, annulés |
| **Recherche** | Par bien, ville ou propriétaire |
| **Détail mandat** | Informations complètes |
| **Signature numérique** | Via CryptoNeo |
| **Signature manuscrite** | Capture à la main |
| **Kanban** | Vue tableau des mandats |
| **Commission** | Calcul automatique |
| **Permissions** | Gestion des droits par mandat |

**Statuts de mandat :**
- `pending` - En attente d'acceptation
- `active` - Mandat actif
- `suspended` - Suspendu temporairement
- `cancelled` - Annulé

### Gestion des Candidatures

| Fonctionnalité | Description |
|----------------|-------------|
| **Liste** | Toutes les candidatures locataires |
| **Statuts** | En attente, acceptée, refusée, en cours |
| **Détail candidat** | Profil complet avec documents |

### Contrats de Location

| Fonctionnalité | Description |
|----------------|-------------|
| **Création** | Créer un contrat de location |
| **Liste** | Vue de tous les contrats |
| **Génération PDF** | Documents automatiques |
| **Signature** | Intégration CryptoNeo |

### Équipe & Collaborateurs

| Fonctionnalité | Description |
|----------------|-------------|
| **Gestion d'équipe** | Liste des agents avec rôles |
| **Invitations** | Email avec token sécurisé |
| **Rôles** | admin, owner, agent |
| **Commissions** | Taux par agent |
| **Profils** | Gestion des profils agents |
| **Demandes** | Inscriptions en attente |

### Suivi Financier

| Fonctionnalité | Description |
|----------------|-------------|
| **Commissions** | Tableau de bord complet |
| **Paiements** | Encaissés et en attente |
| **Revenus** | Statistiques mensuelles |
| **Performance** | Graphiques de progression |

### Planning & Organisation

| Fonctionnalité | Description |
|----------------|-------------|
| **Calendrier** | Rendez-vous et événements |
| **Visites** | Gestion des visites de biens |
| **Rappels** | Système automatique |

### Communication

| Fonctionnalité | Description |
|----------------|-------------|
| **Messagerie** | Communication avec locataires et propriétaires |
| **Notifications** | Temps réel pour événements importants |

### Documents

| Fonctionnalité | Description |
|----------------|-------------|
| **Gestion** | Stockage et organisation |
| **Génération PDF** | Mandats et contrats automatiques |

### Analytics

| Fonctionnalité | Description |
|----------------|-------------|
| **Tableau de bord** | Statistiques globales |
| **Métriques** | Biens, baux, candidatures |
| **Tendances** | Revenus et commissions |

---

## 🛣️ Routes

Base : `/agences/` (défini dans `src/app/routes/agencyRoutes.tsx`)

| Route | Composant | Description |
|-------|-----------|-------------|
| `/agences/dashboard` | DashboardPage | Vue d'ensemble |
| `/agences/biens` | AgencyPropertiesPage | Liste des biens |
| `/agences/biens/:id` | AgencyPropertyDetailPage | Détail bien |
| `/agences/biens/:id/edit` | AgencyPropertyEditPage | Édition bien |
| `/agences/ajouter-bien` | AddPropertyPage | Ajouter bien |
| `/agences/mandats` | AgencyMandatesPage | Liste mandats |
| `/agences/mes-mandats` | MyMandatesPage | Mes mandats |
| `/agences/mandats-kanban` | AgencyMandatesKanbanPage | Vue Kanban |
| `/agences/mandats/:id` | MandateDetailPage | Détail mandat |
| `/agences/signer-mandat/:id` | SignMandatePage | Signature numérique |
| `/agences/mes-mandats/signer/:id` | HandwrittenSignaturePage | Signature manuscrite |
| `/agences/candidatures` | CandidaturesPage | Candidatures |
| `/agences/contrats` | ContratsPage | Liste contrats |
| `/agences/creer-contrat` | CreateContractPage | Créer contrat |
| `/agences/creer-contrat/:propertyId` | CreateContractPage | Contrat pour bien |
| `/agences/analytics` | AnalyticsPage | Statistiques |
| `/agences/calendrier` | CalendarPage | Calendrier |
| `/agences/visites` | VisitsPage | Visites |
| `/agences/paiements` | PaymentsPage | Paiements |
| `/agences/documents` | DocumentsPage | Documents |
| `/agences/rappels` | RemindersPage | Rappels |
| `/agences/equipe` | TeamManagementPage | Équipe |
| `/agences/attributions` | PropertyAssignmentsPage | Attributions |
| `/agences/commissions` | CommissionsPage | Commissions |
| `/agences/agent/:id` | AgentDetailPage | Profil agent |
| `/agences/inscription-demandes` | RegistrationRequestsPage | Demandes |
| `/agences/profil` | ProfilePage | Profil agence |
| `/agences/messages` | MessagesPage | Messagerie |

---

## 🧩 Composants

### Layout

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `AgencyDashboardLayout` | `components/AgencyDashboardLayout.tsx` | Layout principal |
| `AgencySidebar` | `components/AgencySidebar.tsx` | Navigation latérale |
| `Header` | `components/Header.tsx` | En-tête professionnel |

### Navigation

- Badges pour les notifications (candidatures, paiements, rappels)
- Design glassmorphism
- Responsive avec overlay mobile
- Items organisés par catégories

### Cards & Statistiques

| Composant | Description |
|-----------|-------------|
| `StatCard` | Carte statistique avec tendance et détails |
| `MandateCard` | Carte de résumé de mandat |
| `MandateStatusBadge` | Badge de statut coloré |

### Tables & Listes

| Composant | Description |
|-----------|-------------|
| `PropertiesTable` | Tableau biens avec agents assignés |
| `MandateDetailPanel` | Panel d'informations détaillées |

### Formulaires & Dialogs

| Composant | Description |
|-----------|-------------|
| `MandatePermissionsForm` | Formulaire permissions mandat |
| `InviteAgencyDialog` | Dialog d'invitation agent |
| `HandwrittenSignaturePage` | Capture signature manuscrite |

### Demandes d'inscription

| Composant | Description |
|-----------|-------------|
| `RegistrationRequests` | Gestion des candidatures agents |
| `AgentInvitation` | Formulaire d'invitation |

---

## 🔧 Services

### AgentInvitationService

`src/features/agency/services/agentInvitation.service.ts`

```typescript
// Inviter un agent
inviteAgent(email: string, commissionRate: number, role: string): Promise<Invitation>

// Valider un token
validateInvitation(token: string): Promise<ValidationResult>

// Accepter une invitation
acceptInvitation(token: string, userId: string): Promise<void>
```

### MandateService

Gestion complète des mandats :
- CRUD opérations
- Changements de statut
- Calcul des commissions
- Gestion des permissions

### NotificationService

- Notifications temps réel
- Emails automatiques
- Statuts de mandat

---

## 🪝 Hooks

### useAgencyMandates

`src/hooks/useAgencyMandates.ts`

```typescript
const {
  mandates,           // Liste des mandats
  loading,           // État de chargement
  error,             // Erreur éventuelle
  // Actions
  acceptMandate,     // Accepter un mandat
  refuseMandate,     // Refuser un mandat
  terminateMandate,  // Terminer un mandat
  suspendMandate,    // Suspendre un mandat
  reactivateMandate, // Réactiver un mandat
  updatePermissions, // Mettre à jour les permissions
  calculateCommission // Calculer la commission
} = useAgencyMandates(agencyId);
```

---

## 💾 Base de Données

### Tables principales

#### `profiles`

```sql
-- Champs agence
agency_name              text
agency_logo              text
agency_description       text
agency_website           text
agency_phone             text
agency_email             text
agency_id                uuid (references agencies)
verification_documents   jsonb
```

#### `agencies`

```sql
id                  uuid primary key
name                text not null
commission_rate     numeric
verification_status text
created_at          timestamp
updated_at          timestamp
```

#### `mandates`

```sql
id              uuid primary key
property_id     uuid (references properties)
agency_id       uuid (references agencies)
agent_id        uuid (references profiles)
owner_id        uuid (references profiles)
status          text -- pending, active, suspended, cancelled
commission_rate numeric
start_date      date
end_date        date
permissions     jsonb
created_at      timestamp
updated_at      timestamp
```

#### `agent_invitations`

```sql
id              uuid primary key
agency_id       uuid (references agencies)
email           text
token           text
commission_rate numeric
role            text
accepted_at     timestamp
expires_at      timestamp
created_at      timestamp
```

---

## 🏗️ Architecture

### Structure des dossiers

```
src/features/agency/
├── components/
│   ├── AgencyDashboardLayout.tsx    # Layout principal
│   ├── AgencySidebar.tsx            # Navigation
│   ├── Header.tsx                   # En-tête
│   ├── StatCard.tsx                 # Cartes stats
│   ├── MandateCard.tsx              # Cartes mandats
│   ├── MandateStatusBadge.tsx       # Badges statut
│   ├── MandateDetailPanel.tsx       # Panel détail
│   ├── PropertiesTable.tsx          # Tableau biens
│   ├── RegistrationRequests.tsx     # Demandes
│   ├── InviteAgencyDialog.tsx       # Dialog invitation
│   └── MandatePermissionsForm.tsx   # Formulaire permissions
├── pages/
│   ├── DashboardPage.tsx            # Dashboard
│   ├── AgencyMandatesPage.tsx       # Liste mandats
│   ├── MyMandatesPage.tsx           # Mes mandats
│   ├── EnhancedAgencyMandatesPage.tsx # Version améliorée
│   ├── MandateDetailPage.tsx        # Détail mandat
│   ├── AgencyMandatesKanbanPage.tsx # Vue Kanban
│   ├── AgencyPropertiesPage.tsx     # Liste biens
│   ├── AgencyPropertyDetailPage.tsx # Détail bien
│   ├── AgencyPropertyEditPage.tsx   # Édition bien
│   ├── AddPropertyPage.tsx          # Ajouter bien
│   ├── PropertyAssignmentsPage.tsx  # Attributions
│   ├── TeamManagementPage.tsx       # Équipe
│   ├── RegistrationRequestsPage.tsx # Demandes inscription
│   ├── CommissionsPage.tsx          # Commissions
│   ├── AgentDetailPage.tsx          # Profil agent
│   ├── InviteAgencyDialog.tsx       # Invitation
│   ├── ProfilePage.tsx              # Profil agence
│   ├── AnalyticsPage.tsx            # Analytics
│   ├── CandidaturesPage.tsx         # Candidatures
│   ├── ContratsPage.tsx             # Contrats
│   ├── CreateContractPage.tsx       # Créer contrat
│   ├── VisitsPage.tsx               # Visites
│   ├── CalendarPage.tsx             # Calendrier
│   ├── PaymentsPage.tsx             # Paiements
│   ├── DocumentsPage.tsx            # Documents
│   ├── RemindersPage.tsx            # Rappels
│   ├── SignMandatePage.tsx          # Signature numérique
│   └── HandwrittenSignaturePage.tsx # Signature manuscrite
├── services/
│   └── agentInvitation.service.ts   # Service invitations
└── index.ts                         # Exports
```

### Flux de données

```
┌─────────────────┐
│   Routes        │  /agences/*
└────────┬────────┘
         │
┌────────▼────────┐
│  Layout         │  AgencyDashboardLayout
│  + Sidebar      │  AgencySidebar
└────────┬────────┘
         │
┌────────▼────────┐
│    Pages        │  Contenu spécifique
└────────┬────────┘
         │
┌────────▼────────┐
│  Hooks/Services │  useAgencyMandates, etc.
└────────┬────────┘
         │
┌────────▼────────┐
│  Supabase       │  Database + Auth
└─────────────────┘
```

---

## 🔐 Sécurité

### Protection des routes

- Toutes les routes protégées par `ProtectedRoute`
- Vérification des rôles via table `user_roles`

### Rôles & Permissions

| Rôle | Permissions |
|------|-------------|
| `admin` | Accès complet, analytics, paiements, commissions |
| `owner` | Gestion équipe, attributions, invitations |
| `agent` | Biens, mandats, candidatures, contrats, visites |
| `moderator` | Modération contenu |

### RLS (Row Level Security)

- Policies sur les tables Supabase
- Filtrage par `agency_id`
- Vérification des permissions à chaque requête

### Tokens sécurisés

- Invitations avec token UUID
- Expiration des tokens
- Validation à l'acceptation

---

## 📱 Responsive Design

### Breakpoints

- Mobile : < 640px
- Tablet : 768px - 1023px
- Desktop : > 1024px
- Large Desktop : > 1280px

### Adaptations mobile

- Sidebar avec overlay et backdrop
- Grilles statistiques en colonnes
- Tableaux scrollables horizontalement
- Touch targets minimum 44px

---

## 🎨 Design System

### Couleurs

```css
--color-primary-500: #ff6c2f;   /* Orange de marque */
--color-primary-600: #e05519;   /* Hover state */
--color-neutral-900: #171717;   /* Texte principal */
--color-neutral-700: #404040;   /* Texte secondaire */
```

### Couleurs sémantiques

- **Succès** : #059669 (Vert)
- **Erreur** : #DC2626 (Rouge)
- **Avertissement** : #D97706 (Orange)
- **Information** : #2563EB (Bleu)

---

## 🔗 Intégrations

### Services externes

| Service | Usage |
|---------|-------|
| **CryptoNeo** | Signatures numériques des mandats |
| **Supabase** | Auth, Database, Storage, Realtime |
| **Brevo** | Emails d'invitation et notifications |

---

## 📝 Développement

### Ajouter une nouvelle page

1. Créer le composant dans `src/features/agency/pages/`
2. Exporter depuis `src/features/agency/index.ts`
3. Ajouter la route dans `src/app/routes/agencyRoutes.tsx`
4. Ajouter l'item dans `AgencySidebar.tsx`

### Conventions de nommage

- Composants : `PascalCase` (ex: `DashboardPage`)
- Routes : `kebab-case` (ex: `/agences/mandats`)
- Hooks : `camelCase` avec `use` (ex: `useAgencyMandates`)
- Services : `camelCase` avec `.service.ts`

---

## 📚 Ressources connexes

- [README Principal](../../../README.md)
- [Documentation Auth](../../../docs/auth.md)
- [Guide de développement](../../../docs/development.md)
