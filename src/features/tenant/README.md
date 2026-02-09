# Interface Locataire - MonToit

## 📋 Vue d'Ensemble

L'interface locataire de MonToit offre une expérience complète pour la recherche, la location et la gestion de biens immobiliers. De la recherche de propriété à la signature numérique du bail, chaque étape est optimisée pour offrir une expérience utilisateur fluide et moderne.

## 🏗️ Architecture

### Structure des fichiers

```
src/features/tenant/
├── components/
│   ├── TenantDashboardLayout.tsx      # Layout principal avec sidebar
│   ├── TenantSidebar.tsx              # Navigation sidebar responsive
│   ├── TenantDashboardContent.tsx     # Contenu du dashboard
│   ├── TenantApplicationCard.tsx      # Carte de candidature
│   ├── PaymentAlertsBanner.tsx        # Alerte de paiements
│   ├── PropertyRatingDialog.tsx       # Dialog de notation
│   ├── SaveSearchDialog.tsx           # Dialog sauvegarde recherche
│   └── SearchErrorBoundary.tsx        # Error boundary recherche
├── pages/
│   ├── DashboardPage.tsx              # Tableau de bord principal
│   ├── UnifiedDashboardPage.tsx       # Dashboard unifié
│   ├── ScorePage.tsx                  # Page de scoring
│   ├── SearchPropertiesPage.tsx       # Recherche de biens
│   ├── PropertyDetailPage.tsx         # Détail d'un bien
│   ├── ApplicationFormPage.tsx        # Formulaire candidature
│   ├── MyApplicationsPage.tsx         # Mes candidatures
│   ├── ScheduleVisitPage.tsx          # Planifier une visite
│   ├── MyVisitsPage.tsx               # Mes visites
│   ├── MyContractsPage.tsx            # Mes contrats
│   ├── ContractDetailPage.tsx         # Détail d'un contrat
│   ├── SignLeasePage.tsx              # Signature de bail
│   ├── PaymentHistoryPage.tsx         # Historique paiements
│   ├── MakePaymentPage.tsx            # Effectuer un paiement
│   ├── MaintenancePage.tsx            # Demandes maintenance
│   ├── MaintenanceRequestPage.tsx     # Nouvelle demande
│   ├── EnhancedProfilePage.tsx        # Profil complet
│   ├── DocumentsPage.tsx              # Documents
│   ├── ONECIVerificationPage.tsx      # Vérification ONECI
│   ├── RentalHistoryPage.tsx          # Historique locations
│   ├── MyReviewsPage.tsx              # Mes avis
│   ├── FavoritesPage.tsx              # Favoris
│   ├── SavedSearchesPage.tsx          # Recherches sauvegardées
│   └── NotificationsPage.tsx          # Notifications
└── index.ts                           # Exports des composants
```

## 🛣️ Routes Locataire

```
/locataire/
├── verification-oneci          # Vérification d'identité (standalone)
├── dashboard                   # Tableau de bord principal
├── mon-espace                  # Dashboard unifié
├── calendrier                  # Calendrier des visites
├── profil                      # Gestion du profil
├── profil/historique-locations # Historique des locations
├── mon-score                   # Score de crédit
├── favoris                     # Biens favoris
├── recherches-sauvegardees     # Alertes de recherche
├── mes-candidatures            # Candidatures envoyées
├── mes-visites                 # Visites programmées
├── mes-contrats                # Contrats de location
├── contrat/:id                 # Détail d'un contrat
├── signer-bail/:id             # Signature numérique
├── mes-paiements               # Historique paiements
├── effectuer-paiement          # Paiement en ligne
├── maintenance                 # Demandes maintenance
├── maintenance/nouvelle        # Nouvelle demande
├── documents                   # Documents
├── avis                        # Avis donnés
├── notifications               # Notifications
├── visiter/:id                 # Planifier visite
└── candidature/:id             # Formulaire candidature
```

## 🚀 Fonctionnalités Principales

### 1. Recherche & Découverte

#### Recherche Avancée (`/recherche`)
- **Filtres multi-critères** : Prix, localisation, type de bien, équipements
- **Carte interactive** : Visualisation des biens sur carte
- **Sauvegarde de recherche** : Création d'alertes automatiques
- **Comparaison** : Comparer plusieurs biens
- **Favoris** : Sauvegarder les biens intéressants

#### Détail d'un Bien (`/propriete/:id`)
- **Photos HD** avec galerie immersive
- **Visite virtuelle** 360° (si disponible)
- **Informations complètes** : Caractéristiques, équipements, charges
- **Quartier** : Services à proximité, transports
- **Propriétaire** : Profil et avis
- **Disponibilité** en temps réel

### 2. Candidatures & Visites

#### Candidature (`/locataire/candidature/:id`)
- **Formulaire guidé** avec étapes
- **Lettre de motivation** personnalisable
- **Upload de documents** : Pièce d'identité, justificatifs
- **Vérification ONECI** intégrée
- **Suivi de statut** en temps réel
- **Annulation** avec motif

#### Gestion des Candidatures (`/locataire/mes-candidatures`)
- **Liste des candidatures** avec statuts
- **Filtrage** par statut (en attente, acceptée, refusée)
- **Actions rapides** : Consulter, annuler, relancer
- **Notifications** de changement de statut

#### Visites (`/locataire/visiter/:id` et `/locataire/mes-visites`)
- **Calendrier interactif** pour planifier
- **Créneaux disponibles** proposés par le propriétaire
- **Confirmations** automatiques par email
- **Rappels** avant la visite
- **Historique** des visites passées
- **Avis** après visite

### 3. Contrats & Signature Numérique

#### Liste des Contrats (`/locataire/mes-contrats`)
- **Contrats actifs** et historiques
- **Statuts de signature** : En attente, signé, expiré
- **Actions** : Consulter, télécharger, renouveler
- **Alertes** de fin de bail

#### Détail d'un Contrat (`/locataire/contrat/:id`)
- **Informations complètes** : Durée, loyer, charges, dépôt de garantie
- **Clauses spécifiques** : Annexes, avenants
- **Coordonnées** des parties
- **Historique** des modifications

#### Signature Numérique (`/locataire/signer-bail/:id`)
- **Signature cryptographique** via CryptoNeo
- **Vérification OTP** par SMS
- **Certificat de signature** téléchargeable
- **Horodatage** certifié
- **Stockage sécurisé** sur blockchain

### 4. Paiements

#### Historique (`/locataire/mes-paiements`)
- **Historique complet** des paiements
- **Reçus** téléchargeables
- **Relevés** mensuels/annuels
- **Statistiques** de paiement

#### Paiement en Ligne (`/locataire/effectuer-paiement`)
- **Moyens de paiement** multiples : Carte, virement, mobile money
- **Paiement programmé** : Mensuel, trimestriel, annuel
- **Prélèvement automatique** configurable
- **Alertes** de paiement à venir
- **Reçu** immédiat après paiement

### 5. Maintenance & Demandes

#### Liste des Demandes (`/locataire/maintenance`)
- **Historique** des demandes
- **Suivi de statut** : En attente, en cours, résolu
- **Filtrage** par urgence et catégorie
- **Communications** avec le propriétaire

#### Nouvelle Demande (`/locataire/maintenance/nouvelle`)
- **Formulaire détaillé** avec photos
- **Catégorisation** : Plomberie, électricité, menuiserie, etc.
- **Niveau d'urgence** : Faible, moyen, élevé, critique
- **Upload de photos** pour illustration
- **Suivi** en temps réel

### 6. Profil & Vérification

#### Profil Complet (`/locataire/profil`)
- **Informations personnelles** : Nom, coordonnées, situation
- **Photo de profil** personnalisable
- **Préférences** de recherche
- **Documents** : Pièce d'identité, justificatifs
- **Vérification** du compte

#### Vérification ONECI (`/locataire/verification-oneci`)
- **Vérification d'identité** officielle
- **Upload de la pièce d'identité**
- **Validation automatique** via OCR
- **Selfie** pour vérification
- **Certificat** de vérification

#### Scoring (`/locataire/mon-score`)
- **Score de crédit** locataire
- **Facteurs** influençant le score
- **Historique** d'évolution
- **Recommandations** d'amélioration
- **Comparaison** avec la moyenne

#### Historique des Locations (`/locataire/profil/historique-locations`)
- **Locations passées** avec détails
- **Avis** des propriétaires
- **Durée** des locations
- **Motifs de départ**

### 7. Communication

#### Notifications (`/locataire/notifications`)
- **Centre de notifications** unifié
- **Filtrage** par type
- **Actions rapides** : Marquer lu, archiver
- **Préférences** de notification

#### Messages (intégration messaging)
- **Messagerie instantanée** avec propriétaires
- **Notifications** push pour nouveaux messages
- **Historique** des conversations
- **Partage de documents**

### 8. Documents

#### Espace Documents (`/locataire/documents`)
- **Contrats** de location
- **Quittances** de loyer
- **Justificatifs** divers
- **Attestations** d'hébergement
- **Classement** par catégorie
- **Recherche** rapide

### 9. Avis

#### Mes Avis (`/locataire/avis`)
- **Avis donnés** aux propriétaires
- **Notes** et commentaires
- **Historique** complet
- **Modification** d'avis existants

## 🎨 Design System

### Layouts

L'interface utilise 3 types de layouts :

1. **TenantDashboardLayout** : Layout complet avec sidebar pour les pages principales
2. **TenantSidebarLayout** : Layout minimal avec sidebar pour les pages secondaires
3. **Standalone** : Pages sans sidebar (ex: ONECI)

### Design Tokens

```css
/* Couleurs principales */
--color-primary-500: #ff6c2f; /* Orange de marque */
--color-primary-600: #e05519; /* Hover state */
--color-neutral-900: #171717; /* Texte principal */
--color-neutral-700: #404040; /* Texte secondaire */

/* Palette sémantique */
--color-success: #059669;   /* Vert - Succès */
--color-error: #DC2626;     /* Rouge - Erreur */
--color-warning: #D97706;   /* Orange - Avertissement */
--color-info: #2563EB;      /* Bleu - Information */

/* Espacements */
--spacing-4: 16px;  /* Espacement standard */
--spacing-8: 32px;  /* Padding carte minimum */
--spacing-12: 48px; /* Espacement sections */

/* Ombres */
--shadow-base: 0 1px 3px rgba(0, 0, 0, 0.1);
--shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-focus: 0 0 0 3px rgba(255, 108, 47, 0.15);
```

## ♿ Accessibilité

### Conformité WCAG AA

- **Contraste** minimum 4.5:1 pour le texte normal
- **Touch targets** minimum 44px pour les éléments interactifs
- **Navigation clavier** complète sur toutes les pages
- **Focus rings** visibles et cohérents
- **ARIA labels** sur les éléments interactifs
- **Alt text** descriptif pour les images

### Animations

- **Respect du prefers-reduced-motion**
- **Transitions** fluides (< 300ms)
- **Indicateurs** de chargement

## 📱 Responsive Design

### Breakpoints

- **Mobile** : < 640px
- **Tablet** : 640px - 1023px
- **Desktop** : > 1024px

### Adaptations Mobile

- **Sidebar** transformée en menu hamburger avec overlay
- **Grilles** adaptées en colonnes simples
- **Tableaux** scrollables horizontalement
- **Filtres** dans drawer collapsible
- **Actions** optimisées pour le tactile

## 🔧 Services & Hooks

### Services Principaux

```typescript
// Service de candidature
import { applicationService } from '@/services/applicationService';

// Créer une candidature
const application = await applicationService.create({
  propertyId: 'xxx',
  coverLetter: '...',
  documents: [...]
});

// Service de contrat
import { contractService } from '@/services/contractService';

// Récupérer les contrats
const contracts = await contractService.getTenantContracts(userId);

// Service de paiement
import { rentPaymentService } from '@/services/rentPaymentService';

// Effectuer un paiement
await rentPaymentService.createPayment({
  contractId: 'xxx',
  amount: 500,
  method: 'card'
});

// Service de scoring
import { scoringService } from '@/services/scoringService';

// Récupérer le score
const score = await scoringService.getTenantScore(userId);
```

### Hooks Personnalisés

```typescript
// Hook pour les alertes de paiement
import { usePaymentAlerts } from '@/hooks/usePaymentAlerts';

const { alerts, loading } = usePaymentAlerts();

// Hook pour les rôles contextuels
import { useContextualRoles } from '@/hooks/useContextualRoles';

const { isTenant, isOwner } = useContextualRoles();

// Hook pour les statistiques du dashboard
import { useHomeStats } from '@/hooks/useHomeStats';

const { stats, refresh } = useHomeStats();
```

## 🗄️ Base de Données

### Tables Principales

```sql
-- Candidatures
CREATE TABLE applications (
  id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  tenant_id UUID REFERENCES profiles(id),
  status TEXT, -- pending, accepted, rejected, cancelled
  cover_letter TEXT,
  submitted_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Contrats de location
CREATE TABLE lease_contracts (
  id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  tenant_id UUID REFERENCES profiles(id),
  start_date DATE,
  end_date DATE,
  monthly_rent DECIMAL,
  security_deposit DECIMAL,
  status TEXT, -- draft, active, expired, terminated
  signed_at TIMESTAMP,
  created_at TIMESTAMP
);

-- Demandes de maintenance
CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  tenant_id UUID REFERENCES profiles(id),
  category TEXT,
  urgency TEXT, -- low, medium, high, critical
  description TEXT,
  status TEXT, -- pending, in_progress, resolved
  created_at TIMESTAMP
);

-- Paiements
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  contract_id UUID REFERENCES lease_contracts(id),
  amount DECIMAL,
  payment_method TEXT,
  status TEXT, -- pending, completed, failed
  paid_at TIMESTAMP,
  created_at TIMESTAMP
);

-- Favoris
CREATE TABLE favorites (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  property_id UUID REFERENCES properties(id),
  created_at TIMESTAMP,
  UNIQUE(user_id, property_id)
);

-- Recherches sauvegardées
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  criteria JSONB,
  email_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMP
);
```

## 🔒 Sécurité

### RLS (Row Level Security)

Toutes les tables sont protégées par des politiques RLS :

```sql
-- Un locataire ne voit que ses propres candidatures
CREATE POLICY "Tenant own applications"
  ON applications FOR SELECT
  USING (tenant_id = auth.uid());

-- Un locataire ne voit que ses propres contrats
CREATE POLICY "Tenant own contracts"
  ON lease_contracts FOR SELECT
  USING (tenant_id = auth.uid());
```

### Validation des Données

- **Validation côté client** avant envoi
- **Validation côté serveur** via Supabase
- **Sanitisation** des entrées utilisateur
- **Rate limiting** sur les actions sensibles

## 🚀 Performance

### Optimisations

- **Lazy loading** des composants avec `lazyWithRetry`
- **Pagination** des listes (candidatures, contrats, paiements)
- **Mise en cache** avec TanStack Query
- **Optimistic updates** pour les actions fréquentes
- **Compression** des images uploadées

### Métriques Cibles

- **LCP** : < 2.5s
- **FID** : < 100ms
- **CLS** : < 0.1
- **Lighthouse Score** : > 90

## 📱 Application Mobile

L'interface locataire est disponible en application native via Capacitor :

### Fonctionnalités Mobile

- **Notifications push** pour les alertes
- **Caméra** pour upload de documents
- **Géolocalisation** pour la recherche
- **Haptics** pour les feedbacks
- **Offline mode** limité

### Commandes Mobile

```bash
# Synchroniser les assets web
npx cap sync

# Ouvrir le projet Android
npx cap open android

# Ouvrir le projet iOS
npx cap open ios
```

## 🧪 Tests

### Tests Recommandés

```typescript
// Tests des composants
describe('TenantDashboard', () => {
  test('affiche les alertes de paiement', () => {});
  test('affiche les locations actives', () => {});
  test('navigation fonctionne', () => {});
});

// Tests des services
describe('applicationService', () => {
  test('crée une candidature', () => {});
  test('annule une candidature', () => {});
  test('récupère les candidatures', () => {});
});

// Tests E2E
describe('Candidature workflow', () => {
  test('workflow complet de candidature', () => {});
});
```

### Lancer les Tests

```bash
# Tests unitaires
npm run test

# Tests avec UI
npm run test:ui

# Tests de sécurité
npm run test:security
```

## 📚 Documentation Complémentaire

### Services Connexes

- [`README_APPLICATIONS.md`](../../../services/README_APPLICATIONS.md) - Gestion des candidatures
- [`README_CONTRACTS.md`](../../../services/contracts/README.md) - Gestion des contrats et signatures

### Guides

- Guide d'utilisation pour les locataires
- FAQ sur les candidatures
- Tutoriel signature numérique
- Guide du scoring

## 🤝 Contribution

### Standards de Code

- **TypeScript** strict
- **ESLint** + **Prettier**
- **Composants fonctionnels** avec hooks
- **Nommage** en français pour l'UI
- **Comments JSDoc** pour les fonctions exportées

### Processus de Pull Request

1. Fork et branch
2. Code avec tests
3. Linting et type-checking
4. PR avec description

## 🐛 Problèmes Connus

| Problème | Statut | Solution |
|----------|--------|----------|
| Signature iOS | En cours | Alternative webview |
| Upload photos grandes | À faire | Compression côté client |
| Notifications Android | OK | FCM configuré |

## 📞 Support

Pour toute question ou problème lié à l'interface locataire :

- **Documentation** : `/docs/tenant-guide.md`
- **Issues GitHub** : Tag `tenant`
- **Support technique** : support@montoit.fr

---

**Version :** 1.0.0
**Status :** Production Ready ✅
**Dernière mise à jour :** Février 2026
