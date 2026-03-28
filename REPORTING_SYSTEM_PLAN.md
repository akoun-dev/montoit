# Plan Système de Signalement - MonToit

## État Actuel

### ✅ Existant

| Fonctionnalité         | Statut     | Tables                                                                  | UI                                         |
| ---------------------- | ---------- | ----------------------------------------------------------------------- | ------------------------------------------ |
| **Avis (Reviews)**     | ✅ Complet | `reviews` avec `moderation_status`, `is_visible`                        | ✅ Admin: `/admin/moderation-avis`         |
| **Litiges (Disputes)** | ✅ Complet | `disputes`, `dispute_messages`, `dispute_evidence`, `dispute_proposals` | ✅ Admin: `/admin/gestion-litiges`         |
| **Signalement avis**   | ✅ Partiel | Via `helpful_count` (valeurs négatives)                                 | ⚠️ Bouton "Signaler" sans logique complète |

### ❌ Manquant

| Fonctionnalité                | Description                                          | Priorité    |
| ----------------------------- | ---------------------------------------------------- | ----------- |
| **Table reports centralisée** | Unifier tous les types de signalements               | 🔴 Critique |
| **Signalement propriétés**    | Signaler bien frauduleux, photos fausses, prix faux  | 🔴 Critique |
| **Signalement utilisateurs**  | Signaler profil suspect, arnaque, comportement       | 🟠 Élevée   |
| **Signalement messages**      | Signaler message inapproprié (API existe sans table) | 🟠 Élevée   |
| **UI de signalement**         | Modale/formulaire pour utilisateurs                  | 🔴 Critique |
| **Panel modération**          | Vue unifiée pour modérateurs                         | 🟡 Moyenne  |

---

## Plan d'Implémentation

### Phase 1: Base de données (1-2 jours)

#### 1.1 Table `reports` - Signalements centralisés

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  report_type TEXT NOT NULL CHECK (report_type IN ('property', 'user', 'message', 'review', 'contract')),
  entity_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    -- Raisons communes
    'fraud', 'inappropriate', 'spam', 'duplicate',
    -- Propriété
    'fake_photos', 'fake_price', 'fake_listing', 'scam',
    -- Utilisateur
    'fake_profile', 'harassment', 'impersonation',
    -- Message
    'inappropriate_content', 'phishing', 'scam_attempt',
    -- Avis
    'fake_review', 'conflict_of_interest', 'defamatory'
  )),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed', 'escalated')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  evidence_urls JSONB DEFAULT '[]',
  assigned_to UUID REFERENCES profiles(id),
  moderator_notes TEXT,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reports_entity ON reports(report_type, entity_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_assigned ON reports(assigned_to);
CREATE INDEX idx_reports_created ON reports(created_at DESC);
```

#### 1.2 Trigger pour updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 1.3 RLS Policies

```sql
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut créer un signalement
CREATE POLICY "Anyone can create reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Les admins/modérateurs peuvent tout voir
CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator', 'trust_agent')
    )
  );

-- Les utilisateurs voient leurs propres signalements
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Admins/modérateurs peuvent modifier
CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator', 'trust_agent')
    )
  );
```

### Phase 2: Service TypeScript (1 jour)

#### 2.1 Fichier: `src/services/reports/reportService.ts`

```typescript
interface CreateReportParams {
  entityType: 'property' | 'user' | 'message' | 'review' | 'contract';
  entityId: string;
  reason: string;
  description?: string;
  evidence?: string[];
}

interface Report {
  id: string;
  reporter_id: string;
  report_type: string;
  entity_id: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  evidence_urls: string[];
  assigned_to: string | null;
  moderator_notes: string | null;
  resolution: string | null;
  created_at: string;
}

// Fonctions
export async function createReport(params: CreateReportParams): Promise<Report>;
export async function getReports(filters?: ReportFilters): Promise<Report[]>;
export async function getReportById(id: string): Promise<Report>;
export async function updateReportStatus(
  id: string,
  status: string,
  notes?: string
): Promise<Report>;
export async function assignReport(id: string, moderatorId: string): Promise<Report>;
export async function getUserReports(userId: string): Promise<Report[]>;
export async function getEntityReports(entityType: string, entityId: string): Promise<Report[]>;
```

### Phase 3: UI Utilisateur (1-2 jours)

#### 3.1 Composant: `ReportModal.tsx`

- Modale de signalement
- Sélection du type de raison
- Zone de description
- Upload d'preuves (optionnel)
- Confirmation

#### 3.2 Boutons de signalement

- Sur les pages de propriété: "Signaler ce bien"
- Sur les profils utilisateur: "Signaler ce profil"
- Sur les messages: "Signaler" (3 dots menu)
- Sur les avis: Déjà existant, à connecter au nouveau système

### Phase 4: Panel Modération (1-2 jours)

#### 4.1 Page: `/moderation/signalements` ou `/admin/signalements`

**Fonctionnalités:**

- Liste paginée des signalements
- Filtres: type, statut, priorité, date
- Recherche par ID ou description
- Actions groupées: assigner, marquer résolu, rejeter
- Vue détaillée avec:
  - Informations sur l'entité signalée
  - Historique du signalement
  - Notes du modérateur
  - Preuves attachées

#### 4.2 Tableau de bord modérateur

- Statistiques: nombre de signalements par type, par statut
- Tendances: graphiques des 7/30 derniers jours
- Priorisation: signalements urgents en premier

### Phase 5: Notifications & Intégrations (1 jour)

#### 5.1 Notifications

- Email au modérateur lors d'un nouveau signalement
- Notification in-app pour le créateur du signalement sur les changements
- Notification à l'utilisateur signalé si action prise

#### 5.2 Automatisation

- Auto-escalade si > X signalements pour même entité
- Auto-compteurs pour détecter les abus (spam signalements)
- Intégration avec système de suspension utilisateur

---

## Ordre de priorité

### Sprint 1 - Critique

1. ✅ Table `reports` avec RLS
2. ✅ Service TypeScript `reportService`
3. ✅ Modale de signalement utilisateur
4. ✅ Boutons sur fiches propriétés

### Sprint 2 - Élevé

5. ✅ Signalement messages (connecter API existante)
6. ✅ Signalement profils utilisateurs
7. ✅ Panel admin basique

### Sprint 3 - Moyenne

8. ✅ Notifications automatiques
9. ✅ Tableau de bord modérateur
10. ✅ Automatisation (escalade, détection abus)

---

## Implémentation Technique

### Structure des fichiers

```
src/
├── services/
│   └── reports/
│       ├── reportService.ts
│       └── types.ts
├── shared/
│   └── reports/
│       ├── ReportModal.tsx
│       ├── ReportButton.tsx
│       └── ReportReasons.tsx
├── pages/
│   ├── admin/
│   │   └── ReportsManagementPage.tsx
│   └── moderator/
│       └── ModerationDashboardPage.tsx
└── components/
    └── property/
        └── PropertyCard.tsx (ajouter bouton signaler)
```

### Types de signalements par entité

| Entité          | Raisons disponibles                                                               |
| --------------- | --------------------------------------------------------------------------------- |
| **Propriété**   | `fake_photos`, `fake_price`, `fake_listing`, `scam`, `inappropriate`, `duplicate` |
| **Utilisateur** | `fake_profile`, `harassment`, `impersonation`, `scam`, `spam`                     |
| **Message**     | `inappropriate_content`, `phishing`, `scam_attempt`, `harassment`                 |
| **Avis**        | `fake_review`, `conflict_of_interest`, `defamatory`, `inappropriate`              |
| **Contrat**     | `fraud`, `terms_violation`, `fake_contract`                                       |

---

## Validation & Tests

### Tests à implémenter

1. **Unit tests** sur le service reportService
2. **Integration tests** sur les RLS policies
3. **E2E tests** sur le flux de signalement complet
4. **Performance tests** sur les requêtes de liste de signalements

### Validation des règles métier

- Un utilisateur ne peut pas se signaler lui-même
- Limite de X signalements par jour par utilisateur (anti-spam)
- Un utilisateur ne peut pas signaler la même entité plusieurs fois
- Les modérateurs ne peuvent pas modifier les signalements qu'ils ont créés
