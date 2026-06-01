# Audit Cross-Rôle — Mon Toit (v4.0.0)

> Date : 30 mai 2026
> Méthode : Analyse statique du code (routes API + composants + schéma BDD)

---

## 1. Architecture générale

### Rôles existants

| Rôle | Dashboard | Sections clés |
|---|---|---|
| **LOCATAIRE** | `src/components/dashboard/locataire/` | Maintenance, Visites, Paiements, Candidatures, Contrats, Favoris, Profil |
| **PROPRIETAIRE** | `src/components/dashboard/proprietaire/` | Mes biens, Candidatures reçues, Contrats/locations, Paiements, Maintenance, Mandats, Relevés, Profil |
| **AGENCE** | `src/components/dashboard/agence/` | Mandats, Biens gérés, Paiements, Locataires, Propriétaires, Paramètres |
| **TIERS_CONFIANCE (TC)** | `src/components/dashboard/tc/` | 25 sous-composants : Aperçu, Vérifications biens, Validation dossiers locataires, Validation propriétaires, Validation agences, Missions, Agents, Certifications, Litiges, Alertes fraude, États des lieux, Vérification ONECI, SLA, Messagerie, Utilisateurs |
| **ADMIN** | `src/components/dashboard/admin/` | 15 sous-composants : Aperçu, Utilisateurs, Modération biens, Signalements, Litiges, Sauvegardes, Paramètres système, Conformité, Agents de confiance, Sécurité, Notifications, Gestion TC, Rapports |

### Routes API par rôle (nombre de fichiers)

| Domaine | Nb fichiers route.ts | Notes |
|---|---|---|
| **Auth** | ~5 | Inscription, connexion, OTP, profil, sessions |
| **Propriétés** | ~8 | CRUD, images, suppression |
| **Locataire (candidatures)** | 2 | Applications, dossiers locatifs |
| **Baux (leases)** | ~6 | Création, signature, liste, mise à jour |
| **Paiements** | 1 | Payments (GET, POST) + notifications de retard |
| **Visites** | 1 | Visit requests |
| **Maintenance** | 3 | CRUD, commentaires, détails |
| **TC** | 18 | Vérifications biens, dossiers, litiges, missions, agents, certifications, fraudes, etc. |
| **Admin** | 8 | Utilisateurs, modération, signalements, logs, backups, settings |
| **Mandats** | 2 | Création, signature |
| **Litiges (disputes)** | 1 | Générique (tous rôles), version TC dédiée |

---

## 2. Workflow 1 : Candidature → Visite → Bail → Signature → Paiement

### Acteurs : **Locataire ⇄ Propriétaire (↔ Agence)**

```
Locataire                          Propriétaire                      Système
    │                                    │                              │
    ├─ POST /api/applications ───────────┤                              │
    │  (candidature liée à un rental_file)│                              │
    │                                    ├─ Notification reçue ─────────┤
    │                                    │  (type: DOSSIER_UPDATE)       │
    │                                    │                              │
    │  POST /api/visit-requests ────────►│                              │
    │  (demande de visite)              │                              │
    │                                    │                              │
    │◄─── Propriétaire approuve/rejette ──┤                              │
    │                                    │                              │
    │  Dossier validé par TC (optionnel)│                              │
    │                                    │                              │
    │◄─── Bail créé par propriétaire ─────┤                              │
    │  POST /api/leases/create           │                              │
    │  (nécessite: rental_file VALIDATED)│                              │
    │                                    │                              │
    │  Signature propriétaire            │                              │
    │  POST /api/leases/[id]/sign        │                              │
    │  (OTP CryptoNeo si pas d'email)    │                              │
    │                                    │                              │
    │  Signature locataire               │                              │
    │  POST /api/leases/[id]/sign        │                              │
    │                                    │                              │
    │◄─── PDF généré async ───────────────┤                              │
    │  (generateAndUploadLeasePdf)       │                              │
    │                                    │                              │
    │  Paiement loyer                    │                              │
    │  GET /api/payments                 │                              │
    │  (stats, historique)               │                              │
    │                                    │                              │
    │  Maintenance                       │                              │
    │  POST /api/maintenance ───────────►│                              │
    │  (créée par locataire)             │  Notification propriétaire    │
    │                                    │  (type: MAINTENANCE)          │
```

### Analyse critique

| Étape | Route API | Validation | Problèmes potentiels |
|---|---|---|---|
| **Candidature** | `POST /api/applications` | Vérifie `rental_status !== 'loué'`, pas de doublon SUBMITTED/DRAFT, crée rental_file si nécessaire | ✅ OK |
| **Dossier locatif** | `rental_files` | Documents attachés via `rental_file_documents` | Vérification des docs par TC ou proprio ? Non visible dans les routes — la validation de doc se fait comment exactement ? |
| **Création bail** | `POST /api/leases/create` | Vérifie `role === PROPRIETAIRE`, `rental_file.status === VALIDATED`, pas de bail existant DRAFT/PENDING_SIGNATURE/ACTIVE | ✅ OK |
| **Signature** | `POST /api/leases/[id]/sign` | OTP CryptoNeo, signature image | ✅ OK (validation existante) |
| **PDF** | `generateAndUploadLeasePdf` | Asynchrone, non bloquant | ⚠️ Si la génération échoue, le bail existe sans contrat. Pas de retry explicite. |
| **Paiement** | `GET /api/payments` | Scope par rôle (LOCATAIRE = ses paiements, PROPRIETAIRE = paiements des locations) | ✅ OK |
| **Maintenance** | `POST /api/maintenance` | Seul LOCATAIRE peut créer, vérifie lease appartient au tenant | ✅ OK |

---

## 3. Workflow 2 : Mandat Agence

### Acteurs : **Propriétaire ⇄ Agence**

```
Propriétaire                          Agence                           Système
    │                                    │                              │
    ├─ POST /api/mandats ───────────────►│                              │
    │  (seul PROPRIETAIRE peut créer)   │                              │
    │  fields: propertyId, agencyId,    │                              │
    │  type, commissionRate, startDate, │                              │
    │  endDate, conditions              │                              │
    │                                    ├─ Notification reçue ─────────┤
    │                                    │  (type: LEASE_UPDATE)         │
    │                                    │                              │
    │◄─── Agence signe le mandat ────────┤                              │
    │  POST /api/mandats/[id]/sign      │                              │
    │                                    │                              │
    │  Mandat ACTIVE                    │                              │
    │                                    │                              │
    │  Propriétaire peut résilier       │                              │
    │  (terminated_at, terminationReason)│                              │
```

### Analyse critique

| Étape | Validation | Problèmes |
|---|---|---|
| **Création** | Vérifie `property.owner_id === userId`, `agency.role === AGENCE`, pas de mandat actif existant | ✅ OK |
| **Types** | GESTION_COMPLETE, GESTION_LOCATION, MANDAT_SIMPLE | ✅ OK |
| **Signature** | Double signature (owner + agency) via CryptoNeo | ✅ OK |
| **Cycle de vie** | DRAFT → PENDING_SIGNATURE → ACTIVE → TERMINATED | ✅ OK |

---

## 4. Workflow 3 : Vérification TC → Publication

### Acteurs : **Propriétaire → TC**

```
Propriétaire                          TC                               Système
    │                                    │                              │
    ├─ Publie un bien                    │                              │
    │  (status → PENDING_VERIFICATION)   │                              │
    │                                    │                              │
    │◄─── TC voit le bien ───────────────┤                              │
    │  GET /api/tc/verifications          │                              │
    │  (filtre status=PENDING_VERIFICATION)│                             │
    │                                    │                              │
    │◄─── TC approuve ou rejette ────────┤                              │
    │  PATCH /api/tc/verifications       │                              │
    │  { propertyId, action: 'APPROVE'|'REJECT', comment}             │
    │                                    │                              │
    │  Si APPROVE :                      │                              │
    │  - Vérifie inventaire COMPLETED    │                              │
    │  - status → ACTIVE, is_verified=true│                             │
    │  - Notification propriétaire       │                              │
    │    + Agence si mandat actif        │                              │
    │                                    │                              │
    │  Si REJECT :                       │                              │
    │  - status → SUSPENDED              │                              │
    │  - Raison dans rental_terms        │                              │
    │  - Notification propriétaire       │                              │
    │    + Agence si mandat actif        │                              │
```

### Analyse critique

| Étape | Validation | Problèmes |
|---|---|---|
| **Propriétaire publie** | → `PENDING_VERIFICATION` | ❓ Comment le statut passe-t-il à PENDING_VERIFICATION ? Route API non lue. |
| **TC liste** | `GET /api/tc/verifications` filtre par status, commune, type, search | ✅ OK |
| **TC approuve** | Vérifie inventaire COMPLETED obligatoire, update properties | ✅ OK |
| **TC rejette** | Stocke raison dans `rental_terms.rejectionReason` | ✅ OK |
| **Notifications** | Propriétaire + Agence via mandats actifs | ✅ OK |
| **Audit logs** | PROPERTY_APPROVED / PROPERTY_REJECTED | ✅ OK |

### ⚠️ Problème identifié : Point d'entrée manquant

Comment le bien passe-t-il de `DRAFT` ou `ACTIVE` à `PENDING_VERIFICATION` ? La route `POST /api/properties` ou `PATCH /api/properties` n'a pas été inspectée. Il faut vérifier que :
1. La soumission du bien par le propriétaire déclenche bien le statut `PENDING_VERIFICATION`
2. Le propriétaire ne peut pas bypass la vérification en mettant directement `ACTIVE`

---

## 5. Workflow 4 : Litige + Escalade Admin

### Acteurs : **Locataire/Propriétaire/Agence → TC → Admin**

```
N'importe qui (lié au bail)           TC                               Admin
    │                                    │                              │
    ├─ POST /api/disputes ──────────────►│                              │
    │  (types: UNPAID_RENT,              │                              │
    │   PROPERTY_DAMAGE, HARASSMENT,     │                              │
    │   FRAUD, OTHER)                    │                              │
    │  + Notification TC                 │                              │
    │                                    │                              │
    │◄─── TC traite le litige ───────────┤                              │
    │  GET /api/tc/litiges               │                              │
    │  PATCH /api/tc/litiges             │                              │
    │  (status: OPEN→IN_REVIEW→RESOLVED) │                              │
    │  + investigationNotes, evidenceUrls│                              │
    │                                    │                              │
    │◄─── TC peut escalader à l'Admin ───┤                              │
    │  { action: 'ESCALATE',             │                              │
    │    escalationReason }              │                              │
    │                                    ├──► Admin voit le signalement ─┤
    │                                    │   GET /api/admin/signalements │
    │                                    │   PATCH /api/admin/signalements│
    │                                    │   (status: REVIEWED/RESOLVED  │
    │                                    │    /DISMISSED)                │
```

### Analyse critique

| Étape | Validation | Problèmes |
|---|---|---|
| **Création litige** | Vérifie lien au bail (tenant/owner/agency via mandat), pas de doublon OPEN/IN_REVIEW | ✅ OK |
| **Notification TC** | Envoie à TOUS les utilisateurs `TIERS_CONFIANCE` | ✅ OK |
| **TC prend en charge** | `handled_by_id = userId` si passage IN_REVIEW | ✅ OK |
| **Transitions statut** | Validées : OPEN→IN_REVIEW, IN_REVIEW→RESOLVED/OPEN, RESOLVED→CLOSED/OPEN | ✅ OK |
| **Escalade** | Nécessite IN_REVIEW, prévient le reporter | ✅ OK |
| **Admin traitement** | Signalement avec notes admin, résolution, notification retour | ✅ OK |
| **Signalements vs Litiges** | Signalements = entité séparée (signalements table) vs Litiges (disputes table) | ⚠️ Double flux : un litige escaladé crée-t-il un signalement admin automatiquement ? Non — l'admin utilise `disputes` directement. Les `signalements` sont un flux parallèle (signalement d'utilisateur vers admin). |

### ❌ Problème identifié : Pas de création automatique de signalement admin à l'escalade

Quand un TC escalade un litige (`action: 'ESCALATE'`), cela marque `is_escalated: true` dans la table `disputes`, mais **aucun signalement automatique** n'est créé dans la table `signalements`. L'admin doit donc surveiller manuellement les litiges escaladés via sa propre section dédiée — pas de notification automatique ni de file d'attente centralisée.

---

## 6. Workflow 5 : Maintenance

### Acteurs : **Locataire → Propriétaire**

```
Locataire                          Propriétaire
    │                                    │
    ├─ POST /api/maintenance ───────────►│
    │  (leaseId, title, description,     │
    │   priority, images)                │
    │  + Notification proprio            │
    │  + Audit log                       │
    │                                    │
    │◄─── Propriétaire voit la requête ──┤
    │  GET /api/maintenance               │
    │  (scope: leases du propriétaire)    │
    │                                    │
    │  Statuts: OPEN, IN_PROGRESS,       │
    │  RESOLVED, CLOSED                  │
    │                                    │
    │  Images: jusqu'à 5 (JSON stringify)│
    │                                    │
    │  Commentaires:                     │
    │  /api/maintenance/[id]/comments    │
```

### Analyse critique

| Étape | Validation | Problèmes |
|---|---|---|
| **Création** | Seul LOCATAIRE, vérifie lease_id appartient au tenant | ✅ OK |
| **Scope propriétaire** | Filtre par `owner_lease_ids` (leases où le user est owner_id) | ✅ OK |
| **Stats** | Comptage par statut | ✅ OK |
| **Images** | Jusqu'à 5, stockées en JSON | ≖ Limitation raisonnable |
| **Priorité** | LOW, MEDIUM, HIGH, URGENT | ✅ OK |

---

## 7. Vue d'ensemble : qui fait quoi ?

### Matrice des permissions par route

| Route | LOCATAIRE | PROPRIETAIRE | AGENCE | TC | ADMIN |
|---|---|---|---|---|---|
| `POST /api/applications` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /api/leases/create` | ❌ | ✅ | ✅ | ❌ | ❌ |
| `POST /api/leases/[id]/sign` | ✅ (tenant) | ✅ (owner) | ❌ | ❌ | ❌ |
| `POST /api/mandats` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `POST /api/disputes` | ✅ (lié) | ✅ (lié) | ✅ (lié via mandat) | ❌ | ❌ |
| `PATCH /api/tc/verifications` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `PATCH /api/tc/litiges` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `POST /api/maintenance` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `GET /api/payments` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `PATCH /api/admin/signalements` | ❌ | ❌ | ❌ | ❌ | ✅ |

### Complexité des dashboards (lignes de code)

| Dashboard | Nb fichiers | Lignes totales (approx.) |
|---|---|---|
| **TC** | 25 fichiers | ~6 000+ (overview seul : ~600) |
| **Admin** | 15 fichiers | ~3 000+ |
| **Propriétaire** | ~10 fichiers | ~2 000+ |
| **Locataire** | ~8 fichiers | ~1 500+ |
| **Agence** | ~5 fichiers | ~1 000+ |

---

## 8. Problèmes identifiés

### 🔴 Critique

1. **Escalade de litige sans création de signalement admin**
   - Quand un TC escalade un litige vers l'admin, le champ `is_escalated` passe à `true` dans la table `disputes`, mais **aucune entrée** n'est créée automatiquement dans `signalements`.
   - **Impact** : L'admin n'est pas notifié et doit surveiller manuellement.
   - **Fix suggéré** : Dans `PATCH /api/tc/litiges`, quand `action === 'ESCALATE'`, insérer automatiquement un signalement ou notifier directement les admins.

2. **Génération PDF asynchrone sans retry**
   - `generateAndUploadLeasePdf` est lancée en `Promise<void>` sans await. Si elle échoue, l'erreur est logguée mais le bail existe déjà sans contrat.
   - **Impact** : Un bail signé sans document contractuel.
   - **Fix suggéré** : Ajouter un retry (3 tentatives) et/ou un job de fond pour régénérer les PDFs manquants.

3. ~~**Property status → PENDING_VERIFICATION**~~ ✅ Résolu
   - La route `src/app/api/properties/route.ts` (l.250) gère la transition `DRAFT` → `PENDING_VERIFICATION` correctement via le paramètre `isDraft`.

### 🟡 Important

4. **Pas de validation de documents par le propriétaire**
   - Le workflow Candidature → Bail ne montre pas comment le propriétaire valide les documents du dossier locatif. La route `POST /api/leases/create` vérifie seulement `rental_file.status === VALIDATED` — mais qui passe le statut à `VALIDATED` ? Le TC ?

5. **Double système de file d'attente admin**
   - `disputes` (géré par TC, escalade possible) et `signalements` (créé par n'importe qui, géré par admin) sont deux entités séparées avec des flux parallèles. Cela peut créer de la confusion.

### 🟢 Mineur

6. **TAILLE des composants TC** — 25 fichiers, dont `overview.tsx` ~600 lignes, `property-verifications.tsx` ~500 lignes. Un refactoring en sous-composants serait bénéfique.

7. **`any` casts massifs** — La quasi-totalité des routes API utilise `as any` pour contourner TypeScript. C'est une dette technique significative.

---

## 9. Recommandations

### Actions immédiates
- [ ] Créer un signalement admin automatique lors de l'escalade d'un litige par le TC
- [ ] Ajouter un mécanisme de retry pour la génération PDF des baux
- [ ] Vérifier la route de soumission des propriétés (DRAFT → PENDING_VERIFICATION)

### Court terme
- [ ] Clarifier qui valide les dossiers locatifs (propriétaire ou TC) et implémenter la route manquante si nécessaire
- [ ] Unifier les notifications admin pour les litiges escaladés
- [ ] Réduire l'utilisation de `as any` dans les routes API

### Moyen terme
- [ ] Refactorer les gros composants TC en sous-composants
- [ ] Ajouter des tests d'intégration cross-rôle (un test qui simule le parcours complet Locataire → Propriétaire → TC)
