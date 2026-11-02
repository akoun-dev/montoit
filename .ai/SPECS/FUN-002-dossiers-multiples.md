# FUN-002 — SPEC D'IMPLÉMENTATION : Dossiers locatifs multiples (LOCATAIRE)

**Task ID** : 4-h · **Agent** : AGENT 2 (Chef de projet / QA / Product Owner) · **Date** : 2026-10-26
**Statut** : SPEC PRÊTE POUR CODAGE — wave 2 (tâche backlog FUN-002, Sprint 4)
**Références** : `.ai/ANALYSES/1-b-docs-fonctionnel.md` §3.1 (dossiers multiples = manquant ❌, « pas de versions de dossier (config familiale/garant) »), `.ai/ACTORS.md` §1 (LOCATAIRE : « multi-dossiers ❌ (v1 unique) »), migrations `rental_files`/`applications`, `src/app/api/rental-file/route.ts`, `src/app/api/applications/route.ts`, `src/lib/rental-file-completeness.ts`.
**Règle de périmètre** : ce document SPECIFIE ; l'agent wave 2 code (migration incluse) ; l'orchestrateur met à jour TASKS.xlsx.

---

## 1. Résumé

Un locataire peut avoir **plusieurs configurations de vie simultanées** : dossier personnel, dossier familial (config familiale), dossier colocation, dossier avec garant. Aujourd'hui la plateforme impose **UN seul dossier DRAFT par locataire** et le parcours candidature pioche automatiquement « le » dossier validé le plus récent. Il faut autoriser **plusieurs dossiers par type**, laisser le locataire candidater avec le dossier de son choix, et donner un repère clair du « dossier actif » dans l'interface.

**Décisions tranchées** (détail §3-§6) :
1. Contrainte actuelle à remplacer : `idx_rental_files_one_draft_per_tenant` (index unique partiel sur `tenant_id WHERE status='DRAFT'`) → nouvelle unicité **`(tenant_id, file_type) WHERE status='DRAFT'`** avec nouvelle colonne `file_type`.
2. **Migration = NOUVEAU fichier** (jamais de modification d'une migration existante), idempotente, avec backfill `file_type='STANDARD'`.
3. UI : **sélecteur de dossier actif dans le header dashboard LOCATAIRE**, persistance par utilisateur (store Zustand dédié, ne pas toucher au store auth existant).

---

## 2. Contexte & contrainte actuelle (vérifiée dans le code)

### 2.1 La contrainte d'unicité exacte
Elle apparaît **deux fois** (idempotente) et doit être remplacée en une fois :
```sql
-- supabase/migrations/20260518131908_create_rental_files.sql  (création)
-- supabase/migrations/20260617000000_unique_rental_file_applications.sql  (ré-application)
create unique index if not exists idx_rental_files_one_draft_per_tenant
  on rental_files (tenant_id) where status = 'DRAFT';
```
→ **UN seul DRAFT par locataire, tout type confondu.** C'est LA contrainte à lever (et à remplacer, pas à supprimer bêtement : sans garde-fou, double-clic/race conditions recréent des doublons — cf. leçon de la migration `20260617000000`).

### 2.2 Code app dépendant de l'unicité (points de branchement vérifiés)
| Fichier | Comportement actuel | Impact multi-dossiers |
|---|---|---|
| `src/app/api/rental-file/route.ts` (POST L102+) | check-then-insert + **réutilisation du dossier REJECTED** (repassé DRAFT, même ID, syncApplicationsStatus) + audit_log | le reuse et le check doivent être **scopés par `file_type`** |
| `src/lib/rental-file-completeness.ts` (`findCurrentCompleteValidatedRentalFile`, L36-45) | renvoie le dossier `VALIDATED`/`ACCEPTED` **le plus récent** (`order updated_at desc`) | devient un choix explicite : accepter un `rentalFileId` contrôlé (ownership + statut + complétude) |
| `src/app/api/applications/route.ts` (POST L73-86) | appel du helper ci-dessus, 409 si candidature active existante sur le bien (index `idx_applications_active_per_property` sur `(tenant_id, property_id) WHERE DRAFT/SUBMITTED`) | accepter `rentalFileId` du body ; fallback = STANDARD ; l'unicité par bien est INCHANGÉE |
| `src/app/api/leases/create/route.ts` (L154) | `rental_file_id: rentalFileId` requis (dossier VALIDÉ) | aucun changement de contrat — un bail reste rattaché à UN dossier ; simplement le dossier peut être de type différent |
| `src/app/api/rental-files/[id]/route.ts` + `/api/rental-file/documents` | détail/documents par ID | déjà multi-dossiers-ready (par ID) |
| UI `rental-files-list.tsx` (313 l., routé hors sidebar) | liste des dossiers | devient l'écran pivot (sélection, statuts) |
| UI `rental-file.tsx` (formulaire 887 l. en useState) | création/édition du dossier | champ « Type de dossier » + la logique de réutilisation serveur doit matcher |

### 2.3 Table `rental_files` (colonnes réelles, migration `20260518131908`)
`id, status rental_file_status ∈ {DRAFT, SUBMITTED, TC_REVIEW, VALIDATED, ACCEPTED, REJECTED, EXPIRED}, priority, on_hold, tenant_category ∈ {SALARIE, ENTREPRENEUR, ETUDIANT}, monthly_income, employer, employment_type, guarantor_name/phone/relation, valid_until, rejection_reason, tc_comment, reviewed_at, tenant_id → users, reviewed_by_id → users` — **aucune colonne de type** à ce jour.

---

## 3. Modification de migration proposée (NOUVEAU fichier)

> ⚠️ Créer `supabase/migrations/2026XXXX_multiple_rental_files.sql` — **ne jamais modifier** `20260518131908` ni `20260617000000`.

```sql
-- Dossiers locatifs multiples : un DRAFT par (locataire, type de dossier)

-- 1. Type de dossier (config familiale / colocation / standard)
do $$ begin
  create type rental_file_type as enum ('STANDARD', 'FAMILLE', 'COLOCATION');
exception when duplicate_object then null; end $$;

alter table rental_files
  add column if not exists file_type rental_file_type not null default 'STANDARD';

-- 2. Remplacer l'unicité DRAFT : 1 par (locataire, type) au lieu de 1 par locataire
drop index if exists idx_rental_files_one_draft_per_tenant;
create unique index if not exists idx_rental_files_one_draft_per_tenant_and_type
  on rental_files (tenant_id, file_type) where status = 'DRAFT';

-- 3. Lecture rapide par locataire (listes, sélecteur header)
create index if not exists idx_rental_files_tenant_type
  on rental_files (tenant_id, file_type);
```

**Points d'attention** :
- Le backfill est automatique (`default 'STANDARD'` sur colonne ajoutée) — les dossiers existants deviennent STANDARD ; aucun doublon possible car l'ancienne contrainte garantissait l'unicité.
- `drop index` : vérifier en pré-req qu'aucun locataire ne possède déjà 2 DRAFT (impossible via l'ancien index, donc sain).
- **Ne PAS toucher** à `idx_applications_active_per_property` (candidature active unique par bien, types confondus) — règle métier conservée : on ne candidate pas 2 fois au même bien, même avec 2 dossiers.
- RLS `rental_files` : **aucun changement** (le cloisonnement est déjà `tenant_id = auth.uid()` + TC/ADMIN).
- Le type s'applique aussi aux statuts SUBMITTED→VALIDATED : un locataire peut avoir **plusieurs dossiers VALIDÉS** simultanément (ex. STANDARD accepté hier, COLOCATION en review) — c'est le but.

---

## 4. Impacts routes API (contrats précis)

### 4.1 `POST /api/rental-file` (création/édition)
- Body : ajouter `fileType?: 'STANDARD' | 'FAMILLE' | 'COLOCATION'` (défaut STANDARD, zod/validator léger — la route est en useState/validators, respecter le pattern local, cf. T6).
- Recherche de réutilisation (REJECTED→DRAFT) et check DRAFT existant : **`.eq('file_type', fileType)`** ajouté aux deux requêtes ; l'audit_log inclut `file_type`.
- Réponse 409 si un DRAFT du même type existe (`error: "Vous avez déjà un dossier en brouillon pour ce type"`).
- `GET /api/rental-file` (liste) : renvoyer `file_type` dans chaque dossier (source du sélecteur UI).

### 4.2 `POST /api/applications` (candidature)
- Body : ajouter `rentalFileId?: string`.
- Si fourni : vérifier `rental_files.tenant_id = user` **ET** statut ∈ {VALIDATED, ACCEPTED} **ET** complétude documents requise (réutiliser `rental-file-completeness.ts`) → sinon 400/404.
- Si absent : fallback = comportement actuel (`findCurrentCompleteValidatedRentalFile`, en le restreignant à `file_type='STANDARD'` d'abord puis le plus récent — documenté).
- Réponse : inclure `rental_file_id` (déjà fait, L134).
- **Inchangé** : unicité candidature active par bien (23505 → 409, déjà géré L92-96).

### 4.3 `GET /api/applications` (liste)
- Déjà jointure `rental_files` (L208) : ajouter `file_type` au select → affichage « Dossier : Colocation » dans candidatures et détail.

### 4.4 Baux (`/api/leases/*`)
- Aucun changement de contrat : `leases.rental_file_id` reste la clé. Vérifier côté écran `lease-detail`/`my-leases` que l'affichage remonte bien le dossier d'origine (optionnel : badge type).

### 4.5 TC (validation)
- File de validation `/api/tc/rental-files` + écran `dossiers de validation` : exposer `file_type` (badge) + **filtre par type** (une seule colonne lue, pas de nouvelle table) — le TC doit savoir qu'il valide un dossier « Colocation » (impacte sa décision sur revenus/garants).

---

## 5. Impacts UI (LOCATAIRE)

### 5.1 Sélecteur « dossier actif » dans le header
```
┌──────────────────────────────────────────────────────────────┐
│ [☰] Mon Toit CI        [Dossier : Personnel ▾]   [🔔] [👤]   │
│                           │  ✅ Personnel   (VALIDÉ)         │
│                           │  🕓 Colocation  (EN REVUE)       │
│                           │  ───────────────────────         │
│                           │  + Créer un dossier              │
└──────────────────────────────────────────────────────────────┘
```
- Emplacement : `src/components/dashboard/dashboard-header.tsx` — affiché **uniquement si `activeRole === 'LOCATAIRE'`** ET ≥ 2 dossiers (sinon invisible : zéro bruit pour le cas simple).
- Composant : `SearchableSelect` (déjà dans `ui/`) ou dropdown shadcn — style cohérent tokens.
- Le dossier actif pré-sélectionne : la candidature (4.2), l'écran d'édition, et le récapitulatif d'overview.
- Empty/loading/error : EmptyState mutualisé (FE-005).

### 5.2 Persistance du choix
- **Nouveau store dédié** `src/lib/active-dossier-store.ts` (zustand `persist`, clé localStorage `montoit-active-dossier-<userId>`) — **ne pas modifier `auth-store.ts`** (son `persist` global est couplé à l'auth ; risque de migration de version inutile).
- Invalidation : au chargement du dashboard, si `activeDossierId` n'existe plus (supprimé/expiré) → reset sur le dossier STANDARD le plus récent ; si l'utilisateur change, aucune donnée serveur ne bouge (le choix n'est que client).
- ⚠️ Le choix n'est PAS persisté serveur (v1) : c'est une préférence d'UI, pas une donnée métier — la candidature porte toujours explicitement son `rentalFileId`.

### 5.3 Écrans
| Écran | Changement |
|---|---|
| `rental-files-list.tsx` | badge type par carte + bouton « Créer un dossier » (ouvre le formulaire avec type pré-sélectionné) ; blocage explicite si DRAFT existant du même type (409 server-driven) |
| `rental-file.tsx` (formulaire) | champ « Type de dossier » (radio : Personnel / Familial / Colocation), éditable seulement en DRAFT ; explication courte de chaque type |
| `applications.tsx` | afficher le type du dossier utilisé + sélecteur si ≥ 2 dossiers VALIDÉS au moment de candidater (préremplie par le dossier actif) |
| `overview.tsx` | carte dossier = dossier actif (titre + type) |
| Header TC (files de validation) | badge type + filtre (§4.5) |

---

## 6. Scénarios de référence (recette)

```
SC-1  Locataire sans dossier → crée STANDARD (DRAFT) → OK
SC-2  Il crée un 2e dossier COLOCATION pendant que STANDARD est DRAFT → OK (2 DRAFT)
SC-3  Il re-crée un COLOCATION → 409 (1 DRAFT max par type)
SC-4  STANDARD soumis puis VALIDÉ ; COLOCATION soumis → 2 dossiers VALIDÉS cohabitent
SC-5  Candidature bien A avec dossier COLOCATION (sélecteur) → applications.rental_file_id = COLOCATION
SC-6  Candidature 2e fois bien A (même avec l'autre dossier) → 409 (règle par bien inchangée)
SC-7  Bail créé sur dossier COLOCATION → leases.rental_file_id correct ; quittance/fin de bail inchangées
SC-8  Retrait (withdraw) du COLOCATION soumis → applications resync (syncApplicationsStatus) sur le bon dossier
SC-9  Header : choix persisté après refresh ; dossier supprimé → fallback STANDARD
SC-10 TC voit badge COLOCATION + filtre fonctionne ; validation suit le flux existant
```

---

## 7. Tâches backlog proposées (pour insertion TASKS.xlsx par l'orchestrateur)

| ID | Tâche | Sprint | Agent | Critères QA (acceptation) |
|---|---|---|---|---|
| FUN-008 | Migration `multiple_rental_files` (enum + colonne + remplacement index + index lecture) | S4 | DEV FULLSTACK/DATA | Idempotente ; backfill STANDARD ; ancien index supprimé ; candidature unique par bien conservée ; 0 rupture types.ts (update inclus ou suivi DAT-001) |
| FUN-009 | Backend : `file_type` sur rental-file (CRUD + reuse scoped), `rentalFileId` sur applications POST (+ contrôles ownership/statut/complétude), `file_type` exposé partout | S4 | DEV BACKEND | SC-1→SC-8 passent en API ; 409 par type ; candidature sur dossier d'autrui → 403/404 ; fallback documenté |
| FUN-010 | UI locataire : champ type au formulaire, badges liste, sélecteur header + store persist dédié, candidature préremplie | S4 | DEV FRONTEND | Sélecteur visible dès 2 dossiers ; choix persisté par user ; états vides/erreurs mutualisés ; parcours SC-1→SC-5 au clavier (a11y) |
| FUN-011 | UI TC : badge + filtre type dans file de validation | S4 | DEV FRONTEND | Filtre fonctionnel ; badge sur détail ; aucune régression kanban existant |
| FUN-012 | QA FUN-002 : E2E multi-dossiers + rejeu concurrence (double-clic création) | S4 | QA (AGENT 2) | Checklist §8 100 % verte ; test concurrence : 2 POST parallèles même type → 1 seul DRAFT (index) |

---

## 8. Checklist QA finale (exhaustive)

**Migration & données**
- [ ] Migration appliquée en 1 clic sur DB existante (idempotente, re-runnable sans erreur).
- [ ] Dossiers pré-existants = STANDARD ; aucun dossier perdu ; RLS inchangée (locataire ne voit que les siens).
- [ ] Ancien index `idx_rental_files_one_draft_per_tenant` absent ; nouveau présent avec clause `WHERE status='DRAFT'`.
- [ ] `idx_applications_active_per_property` INTACT (tentative de 2e candidature sur un bien → 409).

**Règles métier**
- [ ] 1 DRAFT max par (locataire, type) — les 3 types peuvent coexister en DRAFT.
- [ ] Un dossier par type peut évoluer indépendamment DRAFT → SUBMITTED → VALIDATED (SC-4).
- [ ] Réutilisation REJECTED→DRAFT scoped par type (un REJECTED STANDARD ne ressort pas pour COLOCATION).
- [ ] Candidature : dossier obligatoirement VALIDÉ/ACCEPTED, complet, et APPARTENANT au locataire (test frauduleux : rentalFileId d'un autre user → 403/404).
- [ ] Candidature par bien unique, tous types confondus (SC-6).
- [ ] Baux : rattachés au dossier choisi ; création de bail sans dossier validé impossible (inchangé).
- [ ] Expiration (`valid_until`) et rappels existants fonctionnent par dossier (aucune hypothèse d'unicité résiduelle).
- [ ] Withdraw resubmit : statuts resynchronisés uniquement sur les applications du dossier concerné.

**API**
- [ ] `GET /api/rental-file` liste tous les dossiers avec `file_type`, triés récents d'abord.
- [ ] `POST /api/rental-file` avec `fileType` invalide → 400 (message FR clair).
- [ ] `POST /api/applications` sans `rentalFileId` → comportement fallback stable et documenté (STANDARD d'abord).
- [ ] Réponses 409 explicites (double DRAFT même type / double candidature bien).
- [ ] audit_logs : création/réutilisation tracés avec `file_type`.

**UI**
- [ ] Sélecteur header : visible UNIQUEMENT pour LOCATAIRE avec ≥ 2 dossiers ; masqué sinon (zéro régression cas simple).
- [ ] Choix persisté après refresh et changement de vue (Zustand persist par userId) ; fallback si dossier invalide.
- [ ] Formulaire : type éditable seulement en DRAFT ; libellés FR clairs (Personnel/Familial/Colocation).
- [ ] Liste : badge type + état par carte ; bouton « Créer un dossier » désactivé + tooltip si DRAFT du type existant.
- [ ] Candidatures : type du dossier affiché dans la liste ET le détail.
- [ ] TC : badge + filtre type, compteur de file correct par filtre.
- [ ] A11y : sélecteur navigable au clavier, aria-labels (cohérence audit 1-d).
- [ ] Responsive mobile 360px + dark mode (tokens, pas de couleur hardcodée).

**Non-régression**
- [ ] Parcours complet mono-dossier (recherche → candidature → bail) rejoué vert en E2E.
- [ ] Suite vitest existante (rental-file, applications, TC resubmission) verte.
- [ ] Aucune modification de migration antérieure (`git status` propre sur supabase/migrations/<anciens fichiers>).

---

*Fin de la spec FUN-002 — Agent 2 (QA/PO), Task 4-h. Prête pour codage wave 2.*
