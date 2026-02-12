# Système de Candidature - Services et Utilitaires

Ce dossier contient tous les services, types et utilitaires pour le système de candidature de l'application MonToit.

## 📁 Structure des Fichiers

### Types TypeScript

- **`src/types/application.ts`** - Types et interfaces principales pour les candidatures
  - Interface `Application` principale
  - Types pour les statuts, étapes, documents
  - Types pour les formulaires et validations

### Services

- **`src/services/applicationService.ts`** - Service API et logique métier
  - CRUD des candidatures
  - Gestion des documents (upload/suppression)
  - Calcul automatique des scores
  - Statistiques et rapports

### Utilitaires

- **`src/utils/applicationHelpers.ts`** - Fonctions utilitaires et helpers
  - Validation des formulaires
  - Calculs de progression
  - Formatage des données
  - Export/import des candidatures

### Hooks Personnalisés

- **`src/hooks/useApplications.ts`** - Hooks React pour la gestion d'état
  - `useApplications()` - Hook principal avec filtres/pagination
  - `useApplication()` - Gestion d'une candidature spécifique
  - `useApplicationStats()` - Statistiques des candidatures
  - `useApplicationForm()` - Gestion des formulaires

### Constantes

- **`src/constants/applicationStatuses.ts`** - Constantes pour les statuts
- **`src/constants/applicationSteps.ts`** - Constantes pour les étapes du formulaire

## 🚀 Fonctionnalités Principales

### 1. Gestion des Candidatures

```typescript
// Créer une candidature
const { createApplication } = useApplications();
await createApplication(propertyId, applicantId, formData);

// Récupérer les candidatures avec filtres
const { applications, loading } = useApplications({
  filters: { status: ['pending', 'in_progress'] },
  pagination: { page: 1, pageSize: 10 },
});
```

### 2. Système de Scoring Automatique

- Score financier (40%)
- Score de stabilité professionnelle (30%)
- Score des garanties (20%)
- Score de complétude des documents (10%)
- Niveaux: faible, moyen, bon, excellent

### 3. Workflow par Étapes

1. **Informations personnelles** (10 min)
2. **Situation financière** (15 min)
3. **Garanties** (5 min)
4. **Documents** (20 min)
5. **Validation** (3 min)

### 4. Gestion des Documents

- Upload sécurisé vers Supabase Storage
- Validation des formats (JPG, PNG, WEBP, PDF)
- Taille maximum: 5MB par fichier
- Types: pièce d'identité, bulletins de salaire, avis d'imposition, etc.

## 📊 Statuts de Candidature

| Statut       | Description              | Couleur | Actions           |
| ------------ | ------------------------ | ------- | ----------------- |
| `pending`    | En attente de traitement | Jaune   | Éditer, Supprimer |
| `in_progress` | En cours d'examen       | Bleu    | Aucune            |
| `accepted`   | Acceptée                 | Vert    | Aucune            |
| `rejected`   | Refusée                  | Rouge   | Supprimer         |
| `cancelled`  | Annulée                  | Gris    | Supprimer         |

## 🔧 Utilisation

### Validation des Formulaires

```typescript
import { validateApplicationForm } from '@/utils/applicationHelpers';

const errors = validateApplicationForm(formData);
if (Object.keys(errors).length === 0) {
  // Formulaire valide
}
```

### Calcul de Score

```typescript
import { calculateApplicationScore } from '@/utils/applicationHelpers';

const score = calculateApplicationScore(application);
console.log(`Score global: ${score.globalScore}/100`);
```

### Upload de Documents

```typescript
const { uploadDocument } = useDocumentUpload();
const document = await uploadDocument(applicationId, file, 'piece_identite');
```

### Statistiques

```typescript
const { stats, loading } = useApplicationStats();
console.log(`Taux de conversion: ${stats?.conversionRate}%`);
```

## 🏗️ Architecture

### Service Layer

- Isolation de la logique métier
- Gestion des erreurs centralisée
- Intégration avec Supabase

### Hook Layer

- Gestion d'état avec React Query
- Mutations optimisées
- Cache intelligent

### Helper Layer

- Fonctions réutilisables
- Validation côté client
- Formatage et conversions

### Constants Layer

- Configuration centralisée
- Éviter les magic numbers
- Faciliter la maintenance

## 🔒 Validation et Sécurité

### Validation Côté Client

- Schemas Yup/Zod (à implémenter)
- Messages d'erreur localisés
- Feedback utilisateur en temps réel

### Validation Côté Serveur

- Validation dans les services
- Vérification des permissions
- Sanitisation des données

### Sécurité des Documents

- Upload sécurisé
- Validation des types MIME
- Scan antivirus (à configurer)
- Accès contrôlé

## 📈 Métriques et Analytics

### Statistiques Disponibles

- Total des candidatures
- Répartition par statut
- Score moyen
- Taux de conversion
- Temps de traitement moyen

### Dashboards

- Vue d'ensemble des candidatures
- Analyse des tendances
- Performance des agents
- Export des rapports

## 🚀 Prochaines Étapes

### Phase 1 - Intégration

- [ ] Créer les tables Supabase
- [ ] Configurer les politiques RLS
- [ ] Intégrer les hooks dans les composants

### Phase 2 - Fonctionnalités Avancées

- [ ] Workflow d'approbation
- [ ] Notifications en temps réel
- [ ] Scoring avancé avec IA
- [ ] Génération automatique de contrats

### Phase 3 - Optimisation

- [ ] Cache intelligent
- [ ] Compression d'images
- [ ] Préchargement des données
- [ ] Monitoring et alertes

## 📚 Exemples d'Utilisation

### Formulaire Complet

```typescript
const { formData, currentStep, updatePersonalInfo, nextStep, isFormValid } = useApplicationForm();

useEffect(() => {
  if (isFormValid()) {
    createApplication(propertyId, applicantId, formData);
  }
}, [isFormValid]);
```

### Gestion des Documents

```typescript
const { uploadDocument, isUploading, uploadError } = useDocumentUpload();

const handleFileUpload = async (file: File) => {
  try {
    await uploadDocument(applicationId, file, 'piece_identite');
  } catch (error) {
    console.error('Erreur upload:', error);
  }
};
```

### Filtrage et Recherche

```typescript
const { applications, filters, updateFilters, pagination, updatePagination } = useApplications();

const handleSearch = (query: string) => {
  updateFilters({ searchQuery: query });
};

const handleStatusFilter = (statuses: ApplicationStatus[]) => {
  updateFilters({ status: statuses });
};
```

## 🔧 Configuration

### Variables d'Environnement

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Stockage des documents
VITE_MAX_FILE_SIZE=5242880  # 5MB
VITE_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,application/pdf
```

### Configuration Supabase

```sql
-- Tables nécessaires
CREATE TABLE applications (...);
CREATE TABLE application_documents (...);
CREATE TABLE application_notifications (...);

-- Politiques RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
```

## 📞 Support

Pour toute question ou problème, référez-vous à la documentation technique complète ou contactez l'équipe de développement.

---

**Date de création:** 01/12/2025  
**Version:** 1.0.0  
**Statut:** Production Ready
