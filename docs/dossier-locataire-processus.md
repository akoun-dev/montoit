# Processus Dossier Locataire

## Vue d'ensemble

Le dossier locataire (*rental file*) est le socle du parcours locatif. Chaque locataire constitue un dossier avec ses informations personnelles et documents, le soumet au **Tiers de Confiance (TC)** pour validation, puis le propriétaire l'accepte ou le refuse.

```
Tenant                    TC                      Owner/Agent
  │                       │                        │
  ├─ Crée/modifie DRAFT   │                        │
  ├─ Ajoute documents     │                        │
  │                       │                        │
  ├─ Soumet ─────────────►│                        │
  │                       ├─ Vérifie documents     │
  │                       ├─ APPROVE ──────────────►
  │                       │  (→ VALIDATED)         │
  │                       │                        ├─ ACCEPT (→ ACCEPTED + bail)
  │                       │                        └─ REJECT (→ REJECTED)
  │                       │
  │◄──────────────────────┤
  │  REQUEST_INFO         │
  │  (→ TC_REVIEW)        │
  │  REJECT (→ REJECTED)  │
```

---

## 1. Statuts du dossier

| Statut | Signification |
|--------|--------------|
| `DRAFT` | Brouillon — le locataire remplit/modifie son dossier |
| `SUBMITTED` | Soumis — en attente de vérification par le TC |
| `TC_REVIEW` | En relecture — le TC a demandé des infos complémentaires |
| `VALIDATED` | Validé par le TC — visible par les propriétaires |
| `ACCEPTED` | Accepté par un propriétaire — un bail est créé |
| `REJECTED` | Rejeté (par le TC ou le propriétaire) |
| `EXPIRED` | Expiré (colonne `valid_until` dépassée) |

### Transitions autorisées

```
DRAFT ──(soumission)──► SUBMITTED
                         │
                    ┌────┴────┐
                    │         │
                    ▼         ▼
              VALIDATED    REJECTED ◄── propriétaire
                    │         │
                    │    (réouverture)
                    │         │
                    │         ▼
                    │      DRAFT
                    │
              ┌─────┴─────┐
              │           │
              ▼           ▼
          ACCEPTED     REJECTED
          (propriétaire)

SUBMITTED ──(TC: REQUEST_INFO)──► TC_REVIEW
TC_REVIEW ──(soumission)─────────► SUBMITTED
REJECTED ──(réouverture)────────► DRAFT
EXPIRED ──(réouverture)─────────► DRAFT
```

**Règles :**
- On ne peut soumettre qu'avec au moins le document `ID_CARD` obligatoire
- Un dossier `VALIDATED` peut être réouvert si le locataire le repasse en DRAFT depuis son tableau de bord
- Un dossier rejeté peut être rouvert : les documents repassent en `PENDING`, le motif de rejet est effacé

---

## 2. Acteurs et rôles

### Locataire (`LOCATAIRE`)

**Actions possibles :**
- Créer/modifier un brouillon (DRAFT)
- Ajouter/supprimer des documents (uniquement en DRAFT)
- Soumettre le dossier (→ SUBMITTED)
- Résoumettre un dossier rejeté/expiré
- Voir l'historique et le statut en temps réel

**Vues :**
- `RentalFileForm` — formulaire multi-étapes (garant + documents)
- Timeline de statut avec progression
- Badge de statut avec couleur

### Tiers de Confiance (`TIERS_CONFIANCE`)

**Actions possibles (via `PATCH /api/tc/rental-files`) :**

| Action | Statut résultant | Effet |
|--------|-----------------|-------|
| `APPROVE` | → `VALIDATED` | Tous les documents → `VALIDATED`. Notification au locataire. |
| `REJECT` | → `REJECTED` | Motif de rejet requis. Tous les documents → `REJECTED`. Notification. |
| `REQUEST_INFO` | → `TC_REVIEW` | Le locataire peut modifier et resoumettre. |

**Autres actions :**
- Mettre en attente (`onHold: true`) avec motif
- Changer la priorité (`NORMAL` / `HIGH` / `URGENT`)
- Valider/rejeter document par document (via `documentUpdates`)

**Filtres disponibles :**
- Par statut, priorité, mise en attente, recherche (nom/téléphone/email)
- Dossiers en retard (SLA dépassé)
- Pagination (50 par défaut)

### Propriétaire (`PROPRIETAIRE`) / Agence (`AGENCE`)

**Actions possibles (via `POST /api/rental-files/[id]/action`) :**

| Action | Prérequis | Effet |
|--------|-----------|-------|
| `accept` | Dossier `VALIDATED` ou `SUBMITTED` + loyer, dates | Bail créé (`PENDING_SIGNATURE`). Dossier → `ACCEPTED`. Application → `ACCEPTED`. |
| `reject` | Motif de refus requis | Dossier → `REJECTED`. Application → `REJECTED`. |

**Vue :**
- ProprietaireRentalFiles — liste des dossiers validés visibles via `/api/dashboard/proprietaire`
- Ne voit que les dossiers `VALIDATED` (filtré par propriétés lui appartenant)

---

## 3. Documents

### Types de documents acceptés

| Type | Obligatoire | Libellé |
|------|-------------|---------|
| `ID_CARD` | ✅ Oui | Carte d'identité ou Passeport |
| `PROOF_OF_ADDRESS` | ❌ Non | Justificatif de domicile (facture CIE/SODECI) |
| `PAY_SLIP` | ❌ Non | Bulletins de salaire (3 derniers mois) |
| `BANK_STATEMENT` | ❌ Non | Relevés bancaires (3 derniers mois) |
| `EMPLOYMENT_CONTRACT` | ❌ Non | Contrat de travail |
| `GUARANTOR_ID` | ❌ Non | Pièce d'identité du garant |
| `GUARANTOR_INCOME_PROOF` | ❌ Non | Justificatif de revenus du garant |

Autres types techniques : `PASSPORT`, `WORK_CERTIFICATE`, `RCCM_REGISTRATION`, `TAX_DECLARATION`, `SCHOOL_CERTIFICATE`, `SCHOLARSHIP_CERTIFICATE`, `PROPERTY_TITLE`, `UTILITY_BILL`, `BANK_ACCOUNT_DETAILS`, `OTHER`.

### Statuts des documents

| Statut | Signification |
|--------|--------------|
| `PENDING` | En attente de vérification (défaut à l'upload / après resoumission) |
| `VALIDATED` | Validé par le TC |
| `REJECTED` | Rejeté par le TC (avec commentaire optionnel) |

### Règles

- Upload uniquement quand le dossier est en `DRAFT` ou `TC_REVIEW`
- Taille max : **5 Mo** par fichier
- Formats acceptés : `.pdf`, `.jpg`, `.jpeg`, `.png`
- Un seul document par type (écrase le précédent)
- Les documents sont stockés dans Supabase Storage (bucket `rentals`)
- Quand un dossier est rouvert (DRAFT depuis REJECTED/SUBMITTED/TC_REVIEW) : tous les documents repassent en `PENDING` et leur `tc_comment` est effacé

---

## 4. Candidatures (Applications)

### Relation avec le dossier locataire

Une **candidature** (`applications`) lie un dossier locataire à une propriété :

```
applications {
  id,
  rental_file_id → rental_files(id),
  property_id → properties(id),
  tenant_id → users(id),
  status (même enum que rental_file_status: DRAFT, SUBMITTED, TC_REVIEW, VALIDATED, ACCEPTED, REJECTED)
}
```

**Statuts synchronisés :**
Quand le statut du dossier locataire change (TC approve/reject, owner accept/reject), le statut de toutes les candidatures liées est mis à jour automatiquement.

### Soumission d'une candidature

1. Le locataire clique "Soumettre ma candidature" sur une fiche propriété
2. `POST /api/applications` est appelé avec `propertyId`
3. L'API **trouve ou crée** un DRAFT rental_file pour ce locataire
4. L'API crée la candidature avec `status: SUBMITTED`
5. Le dossier locataire **reste en DRAFT** — le locataire doit explicitement uploader ses documents et soumettre depuis son tableau de bord
6. Le propriétaire reçoit une notification "Nouvelle candidature"
7. Si le dossier est incomplet (pas de documents ou statut ≠ VALIDATED), un avertissement s'affiche avec un bouton "Compléter mon dossier"

### Gestion des candidatures côté propriétaire

Le propriétaire voit :
- Les dossiers `VALIDATED` par le TC (via `/api/dashboard/proprietaire`)
- Les candidatures reçues sur ses propriétés (via `/api/owner/rental-files`)

Il peut :
- **Accepter** → crée un bail (`PENDING_SIGNATURE`), génère un PDF du contrat
- **Refuser** → motif requis, dossier → `REJECTED`

---

## 5. Notifications

Chaque action importante déclenche une notification :

| Événement | Destinataire | Type | Titre |
|-----------|-------------|------|-------|
| Soumission du dossier | Tous les TC actifs | `DOSSIER_UPDATE` | Nouveau dossier locatif soumis |
| TC approuve | Locataire | `DOSSIER_UPDATE` | Dossier validé |
| TC rejette | Locataire | `DOSSIER_UPDATE` | Dossier rejeté |
| TC demande infos | Locataire | `DOSSIER_UPDATE` | Documents complémentaires requis |
| Propriétaire accepte | Locataire | `DOSSIER_UPDATE` | Candidature acceptée |
| Propriétaire refuse | Locataire | `DOSSIER_UPDATE` | Dossier refusé |
| Nouvelle candidature | Propriétaire | `DOSSIER_UPDATE` | Nouvelle candidature |

Les notifications sont stockées dans la table `notifications` et sont livrées en temps réel via Supabase Realtime.

---

## 6. SLA (Validation Service Level Agreement)

Quand un dossier est soumis (`SUBMITTED`), un enregistrement est créé dans `validation_slas` :

```sql
validation_slas {
  id,
  entity_type: 'RENTAL_FILE',
  entity_id → rental_files(id),
  submitted_at,
  deadline_at,  -- now() + 48h
  is_overdue,   -- true si deadline_at dépassée
  completed_at  -- mis à jour quand le TC agit
}
```

Le TC peut filtrer les dossiers en retard via le paramètre `overdue=true`.

---

## 7. Scénarios détaillés

### Scénario A : Parcours nominal

1. **DRAFT** — Le locataire ouvre son espace et remplit le formulaire (garant, infos)
2. **Upload documents** — Ajoute les pièces (ID_CARD obligatoire + optionnels)
3. **Soumission** → `SUBMITTED` — Le TC reçoit une notification
4. **TC vérifie** → `APPROVE` → `VALIDATED` — Le locataire est notifié "Dossier validé"
5. **Propriétaire consulte** — Voit le dossier validé dans sa dashboard
6. **Propriétaire accepte** → `ACCEPTED` + bail créé (`PENDING_SIGNATURE`)
7. **Bail signé** → `ACTIVE`

### Scénario B : TC demande des documents

1-3. Identique au parcours nominal
4. **TC vérifie** → `REQUEST_INFO` → `TC_REVIEW` — "Documents complémentaires requis"
5. **Locataire modifie** — Ajoute/modifie les documents demandés
6. **Locataire soumet à nouveau** → `SUBMITTED`
7. **TC re-vérifie** → `APPROVE` / `REJECT`

### Scénario C : Rejet par le TC

1-3. Identique au parcours nominal
4. **TC vérifie** → `REJECT` → `REJECTED` — Motif fourni
5. **Locataire corrige** — Depuis son dashboard, le dossier rejeté est rouvert en DRAFT
6. Les documents repassent en PENDING
7. Le locataire soumet à nouveau → `SUBMITTED`

### Scénario D : Rejet par le propriétaire

1-5. Identique au parcours nominal (jusqu'à VALIDATED)
6. **Propriétaire refuse** → `REJECTED` — Motif fourni
7. Le locataire peut rouvrir et soumettre à une autre propriété

### Scénario E : Candidature sans dossier complet

1. Le locataire clique "Soumettre ma candidature" sur une propriété
2. La candidature est créée (`SUBMITTED`)
3. Le dossier locataire reste en DRAFT
4. Une alerte "Dossier locataire incomplet" s'affiche avec un bouton "Compléter mon dossier"
5. Le locataire est redirigé vers son dossier pour uploader les documents et soumettre
6. Le propriétaire voit la candidature mais pas le dossier (pas encore VALIDATED)

### Scénario F : Réouverture d'un dossier

N'importe quel dossier non-VALIDATED (REJECTED, SUBMITTED, TC_REVIEW, EXPIRED) peut être rouvert en DRAFT :
- L'ID du dossier est conservé
- Les documents repassent en `PENDING` avec `tc_comment` effacé
- Les champs de rejet/relecture sont effacés (`rejection_reason`, `tc_comment`, `reviewed_by_id`, `reviewed_at`)

### Scénario G : Dossier expiré

La colonne `valid_until` existe dans le schéma mais n'est pas encore implémentée. Quand ce sera fait :
- Un dossier VALIDATED aura une durée de validité (ex: 30 jours)
- Passé ce délai, le statut passe à `EXPIRED`
- Le locataire peut le rouvrir en DRAFT

---

## 8. Architecture technique

### Stack

- **Backend** : Next.js API Routes (App Router)
- **Base de données** : Supabase (PostgreSQL)
- **Auth** : Supabase Auth (JWT, service_role pour les opérations admin)
- **Stockage** : Supabase Storage (bucket `rentals`)
- **Realtime** : Supabase Realtime (souscription aux changements `rental_files`)
- **PDF** : Génération automatique du contrat de bail à l'acceptation

### Points d'API

| Endpoint | Méthode | Rôle requis | Description |
|----------|---------|-------------|-------------|
| `/api/rental-file` | `GET` | LOCATAIRE | Lister ses dossiers |
| `/api/rental-file` | `POST` | LOCATAIRE | Créer/modifier/soumettre un dossier |
| `/api/rental-file/documents` | `POST` | LOCATAIRE | Uploader un document |
| `/api/rental-file/documents` | `DELETE` | LOCATAIRE | Supprimer un document |
| `/api/applications` | `POST` | LOCATAIRE | Soumettre une candidature |
| `/api/applications` | `GET` | LOCATAIRE | Lister ses candidatures |
| `/api/tc/rental-files` | `GET` | TIERS_CONFIANCE | Lister les dossiers à vérifier |
| `/api/tc/rental-files` | `PATCH` | TIERS_CONFIANCE | Approver/rejeter/demander infos |
| `/api/rental-files/[id]/action` | `POST` | PROPRIETAIRE / AGENCE | Accepter/rejeter un dossier validé |
| `/api/dashboard/proprietaire` | `GET` | PROPRIETAIRE | Dashboard proprio (dossiers validés) |
| `/api/owner/rental-files` | `GET` | PROPRIETAIRE | Dossiers liés à ses propriétés |

### Sécurité

- Chaque endpoint vérifie le rôle via `resolveRequestUser` ou `active_role`
- Un locataire ne peut modifier que ses propres dossiers (vérifié par `tenant_id = userId`)
- Un document ne peut être uploadé que si le dossier est en `DRAFT`
- Les TC ne peuvent agir que sur les dossiers `SUBMITTED` ou `TC_REVIEW`
- Un propriétaire ne peut agir que sur les dossiers liés à ses propriétés

### Audit

Toutes les actions importantes sont tracées dans `audit_logs` :
- `CREATE` / `UPDATE` / `SUBMIT` du dossier
- `RENTAL_FILE_APPROVED` / `RENTAL_FILE_REJECTED` / `RENTAL_FILE_INFO_REQUESTED`
- `ACCEPT_RENTAL_FILE` / `REJECT_RENTAL_FILE`
- `RENTAL_FILE_PRIORITY_CHANGED` / `RENTAL_FILE_PUT_ON_HOLD` / `RENTAL_FILE_RESUMED`

---

## 9. Temps réel

Le composant `RentalFileForm` s'abonne aux changements en temps réel via `useRealtimeRentalFiles`. Quand le dossier est modifié (par le TC, par une autre session), l'interface se met à jour automatiquement.

Le propriétaire et le TC voient également les mises à jour en temps réel grâce à la même hook (avec `watchAll: true` pour le propriétaire).
