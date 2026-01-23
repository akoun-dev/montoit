# Rapport - Fonctionnalités manquantes dans l'interface Agence

> **Date** : 23 janvier 2026
> **Comparaison** : Interface Propriétaire vs Interface Agence
> **Objectif** : Identifier les fonctionnalités présentes chez le propriétaire mais absentes chez l'agence

---

## Résumé exécutif

L'interface propriétaire possède **3 pages de fonctionnalités principales** qui sont manquantes dans l'interface agence :

1. **Gestion des paiements** (`PaymentsPage.tsx`) - 868 lignes
2. **Gestion des documents** (`DocumentsPage.tsx`) - 815 lignes
3. **Système de rappels automatisés** (`RemindersPage.tsx`) - 949 lignes

---

## 1. Page Paiements & Charges ⚠️ PRIORITAIRE

**Fichier** : `src/pages/owner/PaymentsPage.tsx`

### Fonctionnalités existantes (Propriétaire)

#### 1.1 Tableau de bord financier
- Statistiques clés en temps réel :
  - Loyer du mois courant
  - Paiements en retard (nombre + montant)
  - Taux de paiement (avec tendance)
  - Charges en attente de facturation

#### 1.2 Gestion des paiements
- **Vue d'ensemble** : Résumé des paiements du mois par contrat
- **Liste des paiements** avec filtres avancés :
  - Recherche par locataire ou propriété
  - Filtre par statut (payés, en attente, en retard)
  - Filtre par propriété
- **Actions disponibles** :
  - Marquer un paiement comme payé
  - Envoyer un rappel au locataire
- **Badges de statut** :
  - Payé (vert)
  - En attente (orange)
  - En retard (rouge)
  - Échoué/Annulé (gris)

#### 1.3 Gestion des charges locatives
- Liste des charges par type :
  - Eau (droplets icon)
  - Électricité (zap icon)
  - Internet (globe icon)
  - Maintenance (wrench icon)
  - Autre
- Informations affichées :
  - Période de consommation
  - Part locataire vs propriétaire
  - Statut de paiement
- Bouton pour ajouter une nouvelle charge

#### 1.4 Formatage et devise
- Formatage en FCFA (XOF)
- Affichage compact pour les grands nombres
- Gestion multidevise potentielle

### Tables de données utilisées
```sql
lease_contracts      -- Contrats de location actifs
payments             -- Historique des paiements
property_charges     -- Charges locatives
profiles             -- Profils locataires
```

### Pages manquantes dans l'interface Agence

| Fonctionnalité | Propriétaire | Agence | Priorité |
|----------------|--------------|--------|----------|
| Tableau de bord financier | ✅ | ❌ | Haute |
| Liste des paiements | ✅ | ❌ | Haute |
| Gestion des charges | ✅ | ❌ | Moyenne |
| Envoi de rappels de paiement | ✅ | ❌ | Haute |
| Marquer paiement comme payé | ✅ | ❌ | Haute |

---

## 2. Page Documents 📄

**Fichier** : `src/pages/owner/DocumentsPage.tsx`

### Fonctionnalités existantes (Propriétaire)

#### 2.1 OCR et traitement IA automatique
- **OCR local avec Tesseract.js** :
  - Extraction de texte des documents PDF/Images
  - Barre de progression en temps réel
  - Gestion des erreurs

#### 2.2 Tagging intelligent par IA
- Génération automatique de tags via Azure OpenAI
- Catégorisation automatique des documents
- Recherche full-text dans le contenu OCR

#### 2.3 Catégories de documents
| Catégorie | Icone | Couleur |
|-----------|-------|---------|
| Contrats de location | FileText | Bleu |
| Bail commercial | FileSignature | Violet |
| Assurances | CheckCircle | Vert |
| Diagnostics | AlertCircle | Ambre |
| Factures | File | Rouge |
| Quittances de loyer | Calendar | Orange |
| Autres | FileText | Gris |

#### 2.4 Gestion des documents
- Upload par glisser-déposer
- Association à un bien immobilier
- Recherche par :
  - Nom du fichier
  - Tags
  - Contenu OCR (full-text)
- Actions :
  - Télécharger
  - Partager (à venir)
  - Signer électroniquement (à venir)
  - Supprimer
- Statut de signature (signé/non signé)
- Badge de statut OCR (ready, processing, error)

#### 2.5 Statistiques
- Total des documents
- Nombre de documents signés
- Nombre de documents taggés
- Taille totale des documents

#### 2.6 Services utilisés
```typescript
// Document processor service
documentProcessorService.extractTextFromFile()     // OCR Tesseract
documentProcessorService.generateTagsAndCategory() // Azure OpenAI
documentProcessorService.onProgress()              // Progression OCR

// Storage
Supabase Storage: 'owner-documents' bucket
```

### Pages manquantes dans l'interface Agence

| Fonctionnalité | Propriétaire | Agence | Priorité |
|----------------|--------------|--------|----------|
| OCR automatique | ✅ | ❌ | Moyenne |
| Tagging IA | ✅ | ❌ | Moyenne |
| Recherche full-text | ✅ | ❌ | Moyenne |
| Upload documents | ✅ | ❌ | Haute |
| Gestion par catégorie | ✅ | ❌ | Haute |
| Signature électronique | 🔜 | ❌ | Basse |

**Note** : Le système de documents utilise la table `owner_documents`. Une table `agency_documents` serait nécessaire.

---

## 3. Page Rappels Automatisés 🔔

**Fichier** : `src/pages/owner/RemindersPage.tsx`

### Fonctionnalités existantes (Propriétaire)

#### 3.1 Types de rappels
| Type | Description | Icône |
|------|-------------|-------|
| Loyer dû | Rappel avant échéance | Calendar |
| Loyer en retard | Paiement en retard | AlertCircle |
| Fin de contrat | Expiration proche | RefreshCw |
| Renouvellement | Renouvellement de bail | FileText |
| Personnalisé | Rappel personnalisé | Bell |

#### 3.2 Configuration des rappels
- **Fréquence programmable** :
  - J-7 (1 semaine avant)
  - J-3 (3 jours avant)
  - J0 (jour de l'échéance)
  - J+3 (3 jours après)
  - J+7 (1 semaine après)

- **Canaux de communication** :
  - Email
  - SMS
  - Email + SMS

#### 3.3 Gestion des rappels
- Création de rappels personnalisés
- Sélection du contrat concerné
- Date/heure d'envoi programmable
- Message personnalisé avec variables :
  - `{tenant}` - Nom du locataire
  - `{propriete}` - Nom du bien
  - `{montant}` - Montant du loyer
  - `{date}` - Date d'échéance
  - `{mois}` - Mois concerné

#### 3.4 Statistiques et tracking
- Total des rappels
- Rappels envoyés
- Rappels ouverts (tracking des ouvertures)
- Taux d'ouverture
- Rappels en attente

#### 3.5 Onglet Renouvellements
- Liste des contrats proches de l'expiration (90 jours)
- Affichage du délai (J-X)
- Code couleur par urgence :
  - J-7 ou moins : Rouge
  - J-30 ou moins : Orange
  - J-90 ou moins : Bleu
- Bouton de contact direct

#### 3.6 Badges de statut
| Statut | Description | Couleur |
|--------|-------------|---------|
| Pending | En attente d'envoi | Ambre |
| Sent | Envoyé | Bleu |
| Delivered | Délivré | Violet |
| Opened | Ouvert par le destinataire | Vert |
| Failed | Échec d'envoi | Rouge |

### Tables de données utilisées
```sql
payment_reminders     -- Rappels créés
reminder_settings     -- Configuration propriétaire
lease_contracts       -- Contrats pour rappels
```

### Pages manquantes dans l'interface Agence

| Fonctionnalité | Propriétaire | Agence | Priorité |
|----------------|--------------|--------|----------|
| Création de rappels | ✅ | ❌ | Haute |
| Configuration automatique | ✅ | ❌ | Moyenne |
| Tracking des ouvertures | ✅ | ❌ | Basse |
| Onglet renouvellements | ✅ | ❌ | Haute |
| Statistiques d'ouverture | ✅ | ❌ | Moyenne |
| Canaux multiples (Email/SMS) | ✅ | ❌ | Haute |

---

## 4. Fonctionnalités similaires mais différenciées

### Dashboard
| Aspect | Propriétaire | Agence |
|--------|--------------|--------|
| Focus | Portefeuille personnel | Équipe et commissions |
| Statistiques | Biens, locataires, paiements | Team, commissions, analytics |
| Design | Chocolat (#2C1810) + Orange | Design plus corporate |

### Gestion des candidatures
| Aspect | Propriétaire | Agence |
|--------|--------------|--------|
| `OwnerApplicationsPage.tsx` | ✅ | ❌ |
| `CandidaturesPage.tsx` | ❌ | ✅ |
| Fonctionnalité | Gère les candidatures pour ses biens | Gère toutes les candidatures + agents |

### Gestion des contrats
| Aspect | Propriétaire | Agence |
|--------|--------------|--------|
| `OwnerContractsPage.tsx` | ✅ | ❌ |
| `ContratsPage.tsx` | ❌ | ✅ |
| Fonctionnalité | Contrats personnels avec détails locataire | Contrats portefeuille agence |

---

## 5. Architecture et services à adapter

### 5.1 Services à répliquer

```typescript
// src/services/documents/
document-processor.service.ts
├── extractTextFromFile()        // OCR Tesseract
├── generateTagsAndCategory()    // Azure OpenAI tagging
└── onProgress()                  // Progress callback

// À créer pour agence
agency-document-processor.service.ts
```

### 5.2 Hooks à adapter

```typescript
// src/hooks/tenant/
usePaymentAlerts.ts              // Alertes de paiement
useInfiniteProperties.ts         // Pagination propriétés

// À créer pour agence
src/hooks/agency/
useAgencyPaymentAlerts.ts
useAgencyDocuments.ts
```

### 5.3 Tables de données à créer/vérifier

```sql
-- Pour agence : adapter les tables existantes
agency_documents         -- Similaire à owner_documents
agency_payments          -- Utiliser payments avec agency_id
agency_payment_reminders -- Adaptation de payment_reminders
agency_reminder_settings -- Adaptation de reminder_settings
```

---

## 6. Recommandations de priorisation

### Phase 1 - Priorité Haute (Fonctionnalités critiques)
1. **Page Paiements** - Essentiel pour le suivi financier
   - Tableau de bord des loyers
   - Liste des paiements avec filtres
   - Actions (marquer payé, rappels)

2. **Page Documents** - Gestion documentaire de base
   - Upload et gestion des documents
   - Catégorisation
   - (OCR/IA peut être ajouté plus tard)

3. **Rappels de base** - Automatisation minimum
   - Création de rappels manuels
   - Envoi email/SMS

### Phase 2 - Priorité Moyenne (Améliorations)
1. **OCR et Tagging IA** - Pour les documents
2. **Renouvellements automatiques** - Tracking des expirations
3. **Statistiques avancées** - Taux d'ouverture, analytics

### Phase 3 - Priorité Basse (Futur)
1. **Signature électronique** - Intégration NeoFace (voir ajout.txt)
2. **Partage sécurisé** - Documents avec locataires
3. **Intégrations externes** - INTOUCH, CryptoNEO, ONECI

---

## 7. Notes spécifiques du fichier `ajout.txt`

Le fichier `ajout.txt` mentionne des intégrations spécifiques qui pourraient impacter l'interface agence :

1. **NeoFace** : Signature de contrat avec notification email
2. **INTOUCH** : Intégration de service de communication
3. **CryptoNEO** : Intégration blockchain/crypto
4. **ONECI** : Vérification d'identité (après NeoFace)

Ces intégrations devraient être ajoutées aux deux interfaces (propriétaire ET agence).

---

## 8. Fichiers source à consulter

```
src/pages/owner/
├── PaymentsPage.tsx         (868 lignes) ⚠️ À adapter
├── DocumentsPage.tsx        (815 lignes) ⚠️ À adapter
└── RemindersPage.tsx        (949 lignes) ⚠️ À adapter

src/services/documents/
└── document-processor.service.ts

src/hooks/
└── usePaymentAlerts.ts

src/features/owner/components/
└── ApplicationCard.tsx

src/features/tenant/components/
├── PaymentAlertsBanner.tsx  (⚠️ Nouveau, à adapter pour agence)
└── PropertyRatingDialog.tsx
```

---

## Conclusion

L'interface agence manque de **3 pages majeures** de gestion financière et documentaire qui sont essentielles pour une expérience complète. L'ajout de ces fonctionnalités devrait suivre l'ordre de priorité indiqué ci-dessus, en commençant par la gestion des paiements qui est le plus critique pour le business.

**Volume de code à adapter** : ~2 632 lignes de code React/TypeScript
