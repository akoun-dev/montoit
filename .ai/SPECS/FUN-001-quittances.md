# FUN-001 — SPEC D'IMPLÉMENTATION : Quittances de loyer (LOCATAIRE)

**Task ID** : 4-h · **Agent** : AGENT 2 (Chef de projet / QA / Product Owner) · **Date** : 2026-10-26
**Statut** : SPEC PRÊTE POUR CODAGE — wave 2 (tâche backlog FUN-001, Sprint 4)
**Références** : `.ai/ANALYSES/1-b-docs-fonctionnel.md` §3.1 (quittances = manquant ❌), `src/components/dashboard/locataire/payment-detail.tsx` (quittance TXT existante à remplacer), migrations `payments`/`leases`/`properties`/`users`, CGU (`cgu.tsx` : « Chaque paiement donne lieu à l'émission d'une quittance électronique »).
**Règle de périmètre** : ce document SPECIFIE ; l'agent wave 2 code ; l'orchestrateur met à jour TASKS.xlsx.

---

## 1. Résumé

Chaque paiement de loyer **PAYÉ** (ou PARTIAL entièrement soldé) doit donner lieu à une **quittance de loyer** formelle, numérotée de façon unique, consultable/imprimable par le locataire **et** le propriétaire concerné. Aujourd'hui il existe une "quittance" **client-side en fichier .txt** (`payment-detail.tsx` lignes 240-296) avec un bug (`Nom : Non renseigné` pour le locataire) et aucune valeur probante. La CGU promet déjà une quittance électronique : il faut tenir la promesse.

**Décisions techniques tranchées** (détail §4-§6) :
1. **Format : HTML print-friendly servi par route API** + `window.print()` côté client — **aucune nouvelle dépendance** (vérifié : pas de jsPDF/pdfmake/pdf-lib dans `package.json` ; `docx` + LibreOffice headless réservés aux baux, trop lourds pour une quittance).
2. **Route : `GET /api/payments/[id]/quittance`** — ⚠️ écart volontaire par rapport à l'intitulé initial `/api/rental-records/[id]/quittance` : **aucune table/route `rental-records` n'existe** dans le code ; la ressource réelle est `payments` (routes existantes `/api/payments/[id]`, `initiate`, `balance`, `callback`…). Conserver le nommage réel du domaine.
3. **Numérotation : nouvelle table `rent_receipts`** (1 quittance = 1 paiement, `payment_id` unique) + numéro `QT-YYYY-NNNNNN` via séquence Postgres — ré-émission idempotente (re-télécharger ne crée PAS un nouveau numéro).

---

## 2. Contexte métier

### 2.1 Règle métier cible
```
Paiement Intouch confirmé (callback HMAC idempotent)
        │
        ▼
payments.status = 'PAID'   (ou 'PARTIAL' si amount_paid >= amount)
        │
        ▼  (à la demande, à chaud — pas d'envoi de masse en v1)
GET /api/payments/[id]/quittance   [locataire own | propriétaire du bien | ADMIN]
        │
        ├─ 1re demande → INSERT rent_receipts (numéro séquentiel) → HTML 200
        └─ demandes suivantes → même numéro (idempotent) → HTML 200
        │
        ▼
Client : ouvre dans un nouvel onglet / bouton "Imprimer / Enregistrer en PDF"
        (navigateur → window.print() ; le print CSS produit un PDF A4 propre)
```

### 2.2 État actuel du code (vérifié)
| Fait | Source |
|---|---|
| Quittance .txt générée côté client, locataire « Non renseigné », sans numéro, sans valeur probante | `payment-detail.tsx` L240-296 (fonction de download + boutons L329 « Quittance », L489 « Télécharger la quittance ») |
| Éligibilité actuelle : seulement `status === 'PAID'` (test L240) | idem |
| Données dispo : `payment.reference`, `paidAt`, `amount`, `lease.monthlyRent`, `lease.charges`, `property.title/address/city`, `owner.firstName/lastName` | `payment-detail.tsx` + select `/api/payments/route.ts` L86-118 |
| Montants en `real` (float) ; `amount_paid` ajouté par migration `20260910000010_partial_payments.sql` | migrations |
| Helpers financiers existants : `getLeaseMonthlyRent`, `getLeaseDepositAmount`, `getLeaseAdvanceRentAmount` | `src/lib/lease-financials.ts` |
| Middleware : `/api/payments` dans `PROTECTED_API_PREFIXES` (auth requise) ; pas de gate par rôle → autorisation à faire dans le handler (pattern `resolveRequestUser`) | `middleware.ts` L24 |
| Aucune lib PDF légère ; pipeline bail = `docx` → LibreOffice headless (30 s timeout, fallback DOCX) | `src/lib/generate-and-upload-lease-pdf.ts` |

---

## 3. Tables impliquées (colonnes réelles vérifiées)

### 3.1 `payments` (migration `20260518131922` + `20260910000010`)
`id, amount real (total dû), amount_paid real (déf. 0), status payment_status ∈ {PENDING, PAID, LATE, PARTIAL, CANCELLED, PROCESSING}, due_date, paid_at, reference (réf. Intouch), method payment_method ∈ {ORANGE_MONEY, MTN_MOMO, MOOV_MONEY, WAVE}, operator_transaction_id, operator_phone_number, payment_operator_data jsonb, lease_id → leases, tenant_id → users`

### 3.2 `leases` (migration `20260518131920`)
`id, status, start_date, end_date, monthly_rent, charges, deposit, property_id → properties, tenant_id → users, owner_id → users, rental_file_id → rental_files, owner_signature_image (base64 PNG, si signé), tenant_signature_image`

### 3.3 `users` (migration `20260518131902`)
`id, first_name, last_name, email, phone, company_name` (bailleur personne morale : utiliser `company_name` si renseigné)

### 3.4 `properties` (migration `20260518131905`)
`title, address, city, type property_type` — l'adresse de quittance = `address + ', ' + city`

### 3.5 NOUVELLE table `rent_receipts` (migration à créer — fichier NOUVEAU, ne rien modifier d'existant)
```sql
-- 2026XXXX_create_rent_receipts.sql
create table if not exists rent_receipts (
  id          text        primary key,                 -- uuid
  payment_id  text        not null unique references payments(id) on delete cascade,
  number      text        not null unique,             -- 'QT-2026-000123'
  amount      real        not null,                    -- snapshot montant acquitté
  issued_at   timestamptz not null default now(),
  issued_by   text        not null references users(id), -- demandeur (locataire ou proprio)
  issuer_role text        not null check (issuer_role in ('LOCATAIRE','PROPRIETAIRE','ADMIN'))
);
create sequence if not exists rent_receipt_number_seq start 1;
-- RLS : enable + policies select tenant/owner/admin (copier le modèle payments_select_*)
-- Accès applicatif : service_role dans la route (pattern existant)
```

---

## 4. Logique de numérotation

- **Format** : `QT-<année d'émission>-<séquence sur 6 chiffres>` ex. `QT-2026-000042` — lisible, unique, chronologique, indexable.
- **Génération** : côté serveur, dans une transaction : `INSERT INTO rent_receipts (…, number) VALUES (…, 'QT-' || extract(year from now()) || '-' || lpad(nextval('rent_receipt_number_seq')::text, 6, '0'))` avec `ON CONFLICT (payment_id) DO NOTHING` puis `SELECT` du row existant → **ré-émission idempotente** (le re-téléchargement renvoie le même numéro, jamais de double).
- **Contraintes garanties** : `UNIQUE(number)` et `UNIQUE(payment_id)` → unicité par quittance et par paiement, y compris sous concurrence (le pattern check-then-insert seul est interdit — cf. leçon `payments_idempotency` migration `20260910000003`).
- **Trous acceptés** : une transaction avortée peut consommer un numéro de séquence — documenté et acceptable (aucune obligation de continuité légale stricte identifiée ; à confirmer en revue juridique, cf. §7).
- **Année** : l'année est celle de l'ÉMISSION (pas de reset automatique requis ; la séquence est globale — le préfixe année reste informatif).

---

## 5. Contrat de la route API

### 5.1 `GET /api/payments/[id]/quittance`
| Aspect | Spécification |
|---|---|
| Auth | `resolveRequestUser(request)` → 401 si absent ; cookie `applyCookies` en réponse (pattern existant) |
| Autorisation | 200 si : `payments.tenant_id = user` **OU** `leases.owner_id = user` (jointure lease) **OU** role `ADMIN`. Sinon **404** (ne pas révéler l'existence : 404 plutôt que 403, décision anti-énumération) |
| Éligibilité | `status = 'PAID'` **OU** (`status = 'PARTIAL'` ET `amount_paid >= amount - 0.01`). Sinon **409** `{ error: "Quittance disponible uniquement pour les paiements effectués" }` (PENDING/PROCESSING/LATE non soldé/CANCELLED) |
| Réponse | `Content-Type: text/html; charset=utf-8`, `Cache-Control: no-store` (données financières), `X-Content-Type-Options: nosniff` |
| Effet de bord | 1re émission → INSERT `rent_receipts` + `audit_logs` (action `RENT_RECEIPT_ISSUED`, payment_id, issued_by) ; émission suivante → lecture seule |
| Données chargées | `payments` + `leases (monthly_rent, charges, owner_signature_image)` + `properties (title, address, city)` + `users` (tenant + owner, first/last, company_name) — 2 requêtes Supabase max |
| Arrondi FCFA | Montants affichés arrondis à l'entier (`Math.round`) — le FCFA n'a pas de subdivision ; logger un warning si `amount != Math.round(amount)` (dette `real` documentée §8) |

### 5.2 Contenu HTML de la quittance (mentions obligatoires)
```
┌────────────────────────────────────────────────────────────┐
│  [Logo Mon Toit CI]            QUITTANCE DE LOYER          │
│                                N° QT-2026-000042           │
├────────────────────────────────────────────────────────────┤
│ BAILLEUR   : KOFFI Alain (ou « SCI ABIDJAN IMMO » si       │
│              company_name) — téléphone/email               │
│ LOCATAIRE  : TRAORÉ Fatou — téléphone                      │
│ BIEN LOUÉ  : Appartement 2 pièces — Rue L112, Cocody,      │
│              Abidjan (properties.address + city)           │
│ BAIL       : contrat du 01/03/2026 au 28/02/2027           │
├────────────────────────────────────────────────────────────┤
│ PÉRIODE    : Loyer de MARS 2026 (due_date → libellé mois)  │
│ LOYER HC   : 150 000 FCFA                                  │
│ CHARGES    :   10 000 FCFA                                 │
│ TOTAL ACQUITTÉ : 160 000 FCFA                              │
│              (en toutes lettres : cent soixante mille      │
│               francs CFA)                                  │
│ MODE       : ORANGE MONEY — réf. INTCH-9F3A21              │
│ PAYÉ LE    : 03/03/2026  (payments.paid_at)                │
│ ÉMISE LE   : 05/03/2026 (rent_receipts.issued_at)          │
├────────────────────────────────────────────────────────────┤
│ [img owner_signature_image si présente]                    │
│ Signature du bailleur  — OU —  « Quittance émise           │
│ électroniquement via Mon Toit CI pour le compte du         │
│ bailleur » (si absence de signature)                       │
│ « Le bailleur reconnaît avoir reçu… » (mention actuelle    │
│ conservée et corrigée)                                     │
└────────────────────────────────────────────────────────────┘
```
- **Print CSS embarqué** (`@page A4, margin 15mm` ; `@media print` masque tout hors quittance) : la page sert AUSSI à l'impression navigateur → "Enregistrer en PDF" natif, zéro dépendance.
- **Responsive mobile** : largeur max ~720px, polices système ; sur Capacitor, ouverture via in-app browser (`@capacitor/inappbrowser` déjà présent).
- **Nombre en lettres** : nouveau helper `src/lib/number-to-french-words.ts` — règles françaises (70→« soixante-dix », 71→« soixante et onze », 80→« quatre-vingts », 81→« quatre-vingt-un », 100/200→« cent/deux cents », 1000→« mille » invariable, 1 000 000→« un million ») + suffixe « francs CFA ». Montants entiers uniquement (FCFA).

### 5.3 Frontend (remplacement du TXT)
1. `payment-detail.tsx` : supprimer la génération .txt (L240-296) ; bouton « Télécharger la quittance » → `window.open('/api/payments/'+id+'/quittance', '_blank')` + bouton « Imprimer » (même URL, `window.print()` auto déclenchable via `?print=1` — script inline `<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300))</script>` conditionnel).
2. Liste `payments.tsx` : icône d'action quittance sur les lignes PAID/PARTIAL soldé (menu existant).
3. Côté propriétaire : même URL depuis son écran paiements/finances (autorisation déjà prévue §5.1).
4. États : loading (skeleton), erreur (EmptyState/ErrorState mutualisés FE-005), 409 → toast « Quittance disponible uniquement pour les paiements effectués ».
5. **Nom de fichier suggéré** (à l'impression PDF) : `<title>` du HTML = `Quittance QT-2026-000042 — Mars 2026`.

---

## 6. Droits d'accès (matrice)

| Acteur | GET quittance | Justification (alignée ACTORS.md §2 : « Paiements (consulter) ») |
|---|---|---|
| LOCATAIRE | ✅ ses paiements uniquement (`tenant_id = user`) | own |
| PROPRIETAIRE | ✅ les paiements de SES biens (`leases.owner_id = user`) | ses biens |
| AGENCE | ❌ en v1 (portefeuille sous mandat — à ouvrir plus tard si besoin produit, aligné sur les limites actuelles de la route liste) | hors scope |
| TIERS_CONFIANCE | ❌ | non concerné (matrice ACTORS.md : TC ❌ paiements) |
| ADMIN | ✅ (supervision, déjà ✅ en lecture paiements) | matrice ACTORS.md |
| VISITEUR / non authentifié | ❌ 401 | middleware `PROTECTED_API_PREFIXES` |

---

## 7. Mentions légales & conformité (point de vigilance)

- Mentions incluses (§5.2) couvrent : identification bailleur/locataire, adresse du bien, période, loyer + charges, montant en chiffres **et** lettres, mode/référence de paiement, date de paiement, date d'émission, numéro unique, signature du bailleur **ou** mention d'émission électronique.
- ⚠️ **Revue juridique CI à planifier** (pas de blocage technique) : références réglementaires applicables aux quittances de loyer en Côte d'Ivoire (contenu obligatoire, conservation, admissibilité d'un document électronique sans certification) → tâche de doc légère proposée au backlog (§9, DOC-003). Ne pas inventer de référence de loi dans le document généré tant que la revue n'a pas validé.
- Conservation : `rent_receipts` + `audit_logs` suffisent ; les PDF/impressions restent côté utilisateurs (pas de stockage binaire de la quittance en v1 — régénération à l'identique garantie par le snapshot `amount` + données immuables du paiement).

---

## 8. Dettes et choix assumés

| # | Choix/dette | Motif |
|---|---|---|
| 1 | HTML print au lieu de PDF serveur | Pas de lib PDF légère présente ; LibreOffice = OOM risk (déjà constaté 502/Turbopack 4.9 GB) + timeout 30 s ; `window.print()`→PDF est natif sur tous les navigateurs cibles |
| 2 | Montants `real` (float) | Dette data existante (1-e) ; la quittance ARRONDI à l'entier et logge les écarts — correction de type hors périmètre |
| 3 | Pas d'envoi automatique (email/SMS) de la quittance | Scope v1 = à la demande ; l'envoi ANSUT est une évolution triviale (hook sur callback paiement) — listée en évolution |
| 4 | Écart de chemin API (`/api/payments/[id]/quittance` au lieu de `/api/rental-records/...`) | Alignement sur le code réel ; aucune ressource `rental-records` |

---

## 9. Tâches backlog proposées (pour insertion TASKS.xlsx par l'orchestrateur)

| ID | Tâche | Sprint | Agent | Critères QA (acceptation) |
|---|---|---|---|---|
| FUN-003 | Migration `rent_receipts` (numéro unique, payment_id unique, séquence, RLS) | S4 | DEV FULLSTACK/DATA | Migration idempotente ; 2 inserts concurrents même payment → 1 seule ligne ; RLS select tenant/owner/admin |
| FUN-004 | Route `GET /api/payments/[id]/quittance` (auth, autorisation 404, éligibilité 409, HTML + print CSS, numérotation idempotente, audit log) | S4 | DEV BACKEND | Tests : locataire own 200 ; autre locataire 404 ; propriétaire bien 200 ; agence 404 ; PENDING 409 ; re-demande → même numéro ; no-store |
| FUN-005 | Helper `number-to-french-words` (FCFA entiers) + tests unitaires | S4 | DEV BACKEND | Cas : 0, 1, 71, 80, 81, 100, 200, 1000, 21 000, 200 000, 1 000 000, 2 500 000 ; 100 % des tests verts |
| FUN-006 | UI : remplacer la quittance TXT (payment-detail) par ouverture/impression ; action quittance dans liste paiements + écran propriétaire | S4 | DEV FRONTEND | Bouton absent pour PENDING ; quittance affichée avec nom locataire correct (bug « Non renseigné » réglé) ; print A4 propre ; états loading/error |
| FUN-007 | QA FUN-001 : E2E paiement→quittance + relecture mentions légales | S4 | QA (AGENT 2) | Checklist §10 100 % verte ; un PDF imprimé vérifié visuellement |
| DOC-003 | Revue juridique des mentions de quittance (CI) + mise à jour de la spec si requis | S4 | PO/DOC | Mention légale validée ou flag « à confirmer » documenté |

---

## 10. Checklist QA finale (exhaustive)

**Émission & numérotation**
- [ ] Une quittance est accessible pour CHAQUE paiement `PAID` (immatériel : initier, callback, consulter, quittance).
- [ ] Les paiements `PARTIAL` non soldés → 409 ; `PARTIAL` soldés (`amount_paid >= amount`) → 200.
- [ ] `PENDING`/`PROCESSING`/`LATE` non soldé/`CANCELLED` → 409 avec message clair.
- [ ] Le numéro est unique (2 paiements différents ≠ même numéro) ; 2 téléchargements du MÊME paiement → MÊME numéro (idempotence, vérifier DB : 1 ligne `rent_receipts`).
- [ ] Numéro au format `QT-YYYY-NNNNNN`, indexable, présent sur le document.
- [ ] Concurrence : 2 requêtes simultanées → aucune erreur 500, un seul numéro.

**Mentions légales (relecture du HTML rendu)**
- [ ] Nom complet du bailleur (ou raison sociale via `company_name`) + contact.
- [ ] Nom complet du LOCATAIRE — **bug « Nom : Non renseigné » réglé**.
- [ ] Adresse complète du bien (`address, city`) + titre/type.
- [ ] Période concernée (libellé du mois de `due_date`).
- [ ] Loyer hors charges, charges, total — en chiffres (format `150 000 FCFA`) et **en toutes lettres**.
- [ ] Mode de paiement (opérateur) + référence transaction (`reference`/`operator_transaction_id`).
- [ ] Date de paiement (`paid_at`) + date d'émission.
- [ ] Signature du bailleur (`owner_signature_image`) **ou** mention « quittance émise électroniquement via Mon Toit CI ».

**Droits d'accès & sécurité**
- [ ] Locataire A ne peut PAS ouvrir la quittance du locataire B (404, pas 403 — anti-énumération).
- [ ] Propriétaire peut ouvrir les quittances de ses biens ; pas celles d'autres propriétaires.
- [ ] Agence/TC → 404 ; non authentifié → 401 ; middleware maintenu.
- [ ] `Cache-Control: no-store` ; aucune donnée de quittance dans le cache disque/HTTP.
- [ ] `audit_logs` : `RENT_RECEIPT_ISSUED` tracé une seule fois par paiement (issued_by présent).

**UX & multi-plateforme**
- [ ] Impression navigateur → PDF A4 propre (marges, logo, pas de scrollbars/éléments UI).
- [ ] Mobile (viewport 360px) lisible ; ouverture depuis Capacitor OK.
- [ ] Bouton quittance visible uniquement sur les paiements éligibles (liste + détail).
- [ ] Ancien fichier .txt totalement supprimé (0 référence restante).
- [ ] États loading/error/empty mutualisés (cohérence FE-005).

**Données**
- [ ] Montants affichés = entiers FCFA (pas de décimales) ; warning log si écart float.
- [ ] Les données affichées proviennent de la DB serveur (jamais du state client) — rechargement = même contenu.

---

*Fin de la spec FUN-001 — Agent 2 (QA/PO), Task 4-h. Prête pour codage wave 2.*
