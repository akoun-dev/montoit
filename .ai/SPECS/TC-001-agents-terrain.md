# TC-001 — SPEC PRODUIT : Agents de terrain du Tiers de Confiance (TIERS_CONFIANCE)

**Task ID** : 4-h · **Agent** : AGENT 2 (Chef de projet / QA / Product Owner) · **Date** : 2026-10-26
**Statut** : PROPOSITION DE DÉCISION PRODUIT — à arbitrer par l'orchestrateur avant implémentation (wave 2)
**Références** : `.ai/ANALYSES/1-b-docs-fonctionnel.md` §3.4 + §5.3 (dette #1, P0 structurel), `.ai/ACTORS.md` §1 (TC) + §4.5 (risque « agents sans comptes »), backlog TASKS.xlsx (TC-001, DAT-005), registre de dette `ARCHITECTURE.md` §4.
**Périmètre de ce document** : décision + spec produit. AUCUN code modifié par ce document.

---

## 1. Résumé exécutif

Les **agents de terrain** missionnés par un Tiers de Confiance (contrôleurs de biens, rédacteurs d'états des lieux) **n'ont pas de compte utilisateur**. Ils sont notifiés de leurs missions par SMS/email ANSUT (workaround commit f196e71), travaillent hors plateforme, et le TC saisit lui-même les résultats dans la plateforme. Conséquences : perte d'information terrain, double saisie, aucune traçabilité individuelle, pas de preuve horodatée des photos/constats, et un des derniers P0 structurels du produit non résolu (dette #1 de l'analyse 1-b).

**Recommandation tranchée** : **Option C — Missions éphémères via tokens sécurisés** (liens magiques SMS/email, page mobile dédiée sans compte), avec chemin d'évolution documenté vers l'Option A (comptes nominatifs) si le volume le justifie. Justification complète en §6, plan de mise en œuvre en §8.

---

## 2. Problème

### 2.1 Constat (code vérifié)
| Élément | Fait vérifié |
|---|---|
| Table `verification_agents` (migration `20260518131930`) | `id, first_name, last_name, email, phone, is_active, tc_id→users.id` — **aucune colonne `user_id`**, aucun lien vers `auth.users` → l'agent ne peut PAS se connecter |
| Table `missions` (migration `20260518131931`) | `type ∈ {PROPERTY_VERIFICATION, INVENTORY_REPORT}`, `status ∈ {ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED}`, `photo_urls jsonb`, `report_url`, `inventory_report_id` (unique, nullable), `property_id`, `agent_id→verification_agents`, `tc_id→users` |
| Table `agent_feedback` (migration `20260518131934`) | évaluations TC→agent, même modèle sans `user_id` |
| Contournement actuel | `src/app/api/tc/missions/route.ts` → `notifyAgentOfMission()` envoie **email + SMS ANSUT** à l'agent à la création de mission (lignes 15-40, appel ligne 268) : le "workflow" s'arrête à la notification |
| Saisie des résultats | le **TC** crée le rapport d'état des lieux (`inventory-report-form.tsx` côté TC) — l'agent ne touche jamais à la plateforme |
| Unicité agents | index unique `(tc_id, email)` ; soft-delete/réactivation gérée dans `/api/tc/agents` |

### 2.2 Impacts produit
1. **Qualité** : photos et constats transmis par WhatsApp/appel → re-saisie par le TC, perte de preuves, pas d'horodatage fiable des documents.
2. **Traçabilité/audit** : `audit_logs` ne peut pas attribuer une action à l'agent réel ; la chaîne de responsabilité s'arrête au TC (risque fraude : un "constat" n'est prouvément pas celui de l'agent).
3. **SLA** : pas de visibilité temps réel sur l'avancement d'une mission (ASSIGNED → IN_PROGRESS invisible jusqu'à complétion manuelle).
4. **Volume** : un TC actif gère plusieurs agents × plusieurs missions/semaine — le contournement SMS devient un goulot.
5. **Cohérence** : le même problème existe côté agence (`agency_agents` sans `user_id`, tâche DAT-005 planifiée S3) — mais les deux problèmes ne sont PAS symétriques (cf. §6.4).

---

## 3. Personas

### 3.1 Persona principal — « Konan, contrôleur de terrain »
- **Profil** : 28 ans, Abidjan, smartphone Android d'entrée de gamme + WhatsApp + Orange Money. Précaire, travaille pour 1 à 3 TC différents. **Ne souhaite PAS un mot de passe de plus**, perd/ change de numéro régulièrement.
- **Contexte d'usage** : reçoit une mission le matin (« vérifier le bien X à Cocody, prendre photos, constat d'habitabilité »), se rend sur place, photographie, remplit une grille simple, renvoie le tout **dans l'heure**.
- **Besoins** : zéro inscription, zéro mot de passe, une page mobile qui marche en 3G, boutons gros, upload photo natif (caméra), brouillon conservé si coupure réseau.
- **Anti-besoins** : accès au back-office TC (files de validation, KYC, litiges) — c'est un agent d'exécution, pas un validateur.

### 3.2 Persona secondaire — « Mme Bamba, Tiers de Confiance »
- Gère 4-6 contrôleurs ; veut : créer une mission, savoir si le lien a été ouvert/rempli, relancer en un clic, valider le constat rendu, historiser.
- Craint : les faux constats, les agents "fantômes" (email inventé), la fuite de photos de biens.

### 3.3 Persona tertiaire — « Admin plateforme »
- Veut de l'audit : qui a transmis quoi, quand, depuis quel appareil ; capacité à suspendre un agent fautif (déjà géré via `is_active` + TC).

---

## 4. Scénarios d'usage cibles

### SC-1 — Mission de visite / vérification de bien (PROPERTY_VERIFICATION)
```
TC                     Plateforme                         Agent (SMS + lien)
│  crée mission ──────▶ missions(ASSIGNED)                  │
│                      │  génère token, envoie SMS/email ──▶ ouvre /m/{token}
│                      │                                    │ voit : adresse, contact TC,
│                      │                                    │ checklist visite, consignes
│                      │◀── IN_PROGRESS (premier open) ────│ coche / photographie
│                      │◀── COMPLETED + photos + notes ────│ soumet
│  notifié + valide ──▶ rapport rattaché, bien → ACTIVE    │
```
- Le statut passe `IN_PROGRESS` à l'ouverture du lien (visibilité SLA).
- À soumission : photos uploadées (Storage privé, cf. SEC-006), statut `COMPLETED`, notification in-app + email au TC.

### SC-2 — Constat d'état des lieux (INVENTORY_REPORT)
- Même flux ; la page mobile rend une **grille simplifiée** (pièces × BON/MAUVAIS + observations + clés + photos) alignée sur `inventory_report_items` (9×5 dans le TC full).
- Le rapport est créé en statut **DRAFT/SUBMITTED côté agent**, le TC le révise et le **valide** dans son écran existant (aucune perte de contrôle métier).

### SC-3 — Certification / photos manquantes
- Variante SC-1 avec checklist documentaire (titre foncier, plan… ) → pièces jointes rattachées à la mission, TC décide.

### SC-4 — Hors périmètre explicite (anti-scope)
- L'agent NE valide PAS de dossiers locataires/propriétaires, NE fait PAS de KYC, NE répond PAS aux litiges, NE voit AUCUNE donnée au-delà de SA mission (une propriété, une checklist).
- Pas de messagerie agent↔TC dans v1 (le téléphone de l'agent + contact TC affiché suffisent).

---

## 5. Options de modèle (analyse comparative)

### 5.1 Option A — Comptes nominatifs (« sous-comptes » rattachés au TC)
Chaque agent reçoit un compte `users` (nouveau rôle ou rôle existant) lié à `verification_agents.user_id`.

**Data** (migrations à prévoir) :
- `alter table verification_agents add column user_id text unique references users(id) on delete set null;`
- Nouveau rôle `AGENT_TERRAIN` dans l'enum `user_role` (ou réutilisation `TIERS_CONFIANCE` — **rejetée**, cf. §5.1.1).
- Élargissement des policies RLS `missions`/`verification_agents` à l'agent propriétaire (`user_id = auth.uid()`).
- Flux d'invitation : création user (password_hash provisoire, `is_email_verified=false`) + OTP reset → coût d'onboarding élevé sur mobile.

**Sécurité** :
1. Nouveau rôle = toucher la matrice d'autorisation ENTIÈRE : whitelist d'inscription (SEC-001), middleware `ROLE_ROUTES`, `switch-role`, sidebar, 247 policies RLS, écrans de gestion utilisateurs Admin/TC. Surface de régression majeure sur une app dont la sécurité est 100 % applicative (ADR-0002 en cours d'arbitrage).
2. Un compte `TIERS_CONFIANCE` "light" exposerait les files de validation, KYC et utilisateurs → cloisonnement fin à recoder partout.
3. Gestion de parc de mots de passe pour des profils précaires → partage de comptes (anti-pattern constaté sur le terrain), réinitialisations fréquentes → support.

**UX minimale** : login existant réutilisé ; section "Mes missions" minimaliste dans un dashboard agent dédié (1 écran + 1 détail) ; Notifications in-app.

**Coût estimé** : **8-12 j-h** (migrations 1,5 j ; rôle + middleware + RLS 2-3 j ; routes 1,5 j ; UI agent 2 j ; UI TC 1 j ; tests + QA 1,5 j ; risques de régression inclus).

**Avantages** : traçabilité parfaite (compte authentifié), réutilisable pour messagerie/notifications in-app, évolution naturelle vers "agent agence" (DAT-005) symétrique.
**Inconvénients** : coût et risque les plus élevés ; friction d'onboarding terrain ; churn des agents ; prérequis de stabilisation auth (SEC-002 en Sprint 0) pour ne pas créer des comptes faibles.

#### 5.1.1 Sous-variante rejetée : agent = user avec rôle TIERS_CONFIANCE
Rejetée car le rôle TC porte 28 écrans de validation, KYC et litiges : donner ce rôle à un contrôleur de terrain serait une **escalade de privilèges** (contredirait la matrice ACTORS.md : « Missions TC/certifications ✅ TC » mais « Validation dossiers ❌ pour non-TC »). Exigerait un mini-rôle dédié → retombe sur le coût ci-dessus.

### 5.2 Option B — Comptes partagés par organisme TC
Un seul login "agent" par TC, partagé par tous ses contrôleurs.

**Data** : aucune migration structurelle (optionnel : flag `is_shared` sur users).

**Sécurité** : la plus mauvaise — traçabilité nulle (dette #1 NON résolue : les audit_logs attribuent tout au compte partagé), sessions concurrentes, mot de passe diffusé par WhatsApp, impossible à révoquer par agent, violation du principe d'attribution individuelle attendu par l'audit plateforme (Admin §sécurité).

**UX minimale** : identique à A.

**Coût estimé** : **1-2 j-h**.
**Avantages** : quasi gratuit, immédiat.
**Inconvénients** : ne résout PAS le problème (dette #1 : traçabilité), créé une dette fraude grave (le registre pointe précisément l'absence d'attribution individuelle). **À écarter.**

### 5.3 Option C — Missions éphémères via tokens sécurisés (RECOMMANDÉE)
Aucun compte : chaque mission porte un **token d'accès à usage contrôlé** envoyé par SMS/email ; l'agent ouvre une page mobile publique dédiée `/{base}/m/{token}` et rend sa mission.

**Data** (1 nouvelle table, 0 modification de `users`) :
```sql
create table if not exists mission_access_tokens (
  id            text primary key,
  mission_id    text not null references missions(id) on delete cascade,
  token_hash    text not null unique,          -- sha256(token + pepper), cf. otp-hash.ts
  channel       text not null default 'SMS',   -- SMS | EMAIL
  expires_at    timestamptz not null,          -- TTL 72h par défaut
  opened_at     timestamptz,
  submitted_at  timestamptz,
  revoked_at    timestamptz,
  user_agent    text,
  created_at    timestamptz not null default now()
);
create index idx_mat_mission on mission_access_tokens (mission_id);
alter table mission_access_tokens enable row level security;  -- accès via service_role uniquement (routes dédiées)
```
- `missions.status` : la page mobile met à jour `IN_PROGRESS`/`COMPLETED` + `photo_urls` via une route dédiée identifiée par le token (jamais exposée au middleware `/api/tc/`).
- Optionnel : colonne `missions.completion_notes` (ou réutiliser `notes`/`feedback`).

**Sécurité** (le registre de dette pointe ce problème : dette « agents sans comptes » = 1-b §5.3 #1 + ACTORS.md §4.5) :
- Token aléatoire ≥ 128 bits, **stocké hashé** (même discipline que `otp-hash.ts` + pepper `OTP_HASH_PEPPER`, cf. DOC-002), TTL 72 h, révocable par le TC, single-use par étage de soumission (open ≠ submit), rate-limit sur les routes token (réutiliser `rate-limiter.ts`).
- Périmètre exposé = UNE mission (id mission + property title/address + checklist) — aucune jointure vers users/KYC dans la route token.
- Photos → bucket **privé** mission-evidence (aligné SEC-006), URLs signées pour le TC seulement.
- Audit : entrées `audit_logs` avec `actor='agent:<verification_agents.id>'` via la route serveur ; la chaîne de responsabilité reste : **le TC a créé et envoyé la mission** (déjà authentifié) — attribution légale identique à l'envoi d'un expert par courrier.
- ⚠️ Risque résiduel assumé : l'agent ne s'authentifie pas cryptographiquement (le téléphone qui a reçu le SMS peut être revendu) → acceptable pour des constats **contrôlés a posteriori par le TC** (le TC valide avant publication, cf. SC-2) ; à re-évaluer si les missions deviennent auto-validantes.

**UX minimale** :
- Agent : 1 page mobile responsive `/m/[token]` (Next route sans middleware, hors SPA) : fiche mission → "Commencer" → checklist + photos (input file capture) → résumé → "Rendre compte". États : expiré / révoqué / déjà soumis.
- TC : dans les écrans existants `agents`/`missions` : badge "Lien envoyé / ouvert / rendu / expiré" + bouton "(Re)envoyer le lien" + relance.

**Coût estimé** : **4-6 j-h** (migration 0,5 j ; routes token 1 j ; page mobile agent 2 j ; UI TC 0,5 j ; tests sécurité + QA 1 j).

**Avantages** : meilleure sécurité/coût ; zéro friction agent (le flux SMS existe déjà — on le transforme en workflow) ; aucune ouverture de la matrice de rôles ; compatible mobile/3G ; s'insère dans SEC-006 (buckets privés).
**Inconvénients** : pas de compte réutilisable (chaque mission = un lien) ; pas de notifications in-app pour l'agent ; ne "pave" pas la route vers messagerie agent.

### 5.4 Tableau comparatif
| Critère | A — Comptes nominatifs | B — Comptes partagés | **C — Tokens éphémères** |
|---|---|---|---|
| Résout la dette #1 (traçabilité) | ✅ | ❌ | ✅ (attribution mission) |
| Sécurité (surface ajoutée) | Élevée (rôle+RLS+middleware) | Négative | Faible et bornée |
| Friction agent (onboarding) | Moyenne (mdp) | Basse | **Nulle** |
| Coût | 8-12 j-h | 1-2 j-h | **4-6 j-h** |
| Risque de régression plateforme | Élevé | Faible | Faible |
| Évolutivité (messagerie, multi-TC) | ✅ | ❌ | Moyenne (→ A plus tard si besoin) |
| Cohérence avec DAT-005 (agents agence) | Symétrique | — | Différenciée mais justifiée (§6.4) |

---

## 6. Recommandation tranchée

> **Décision proposée : Option C (tokens éphémères) pour les agents de terrain TC, en v1 (Sprint 4). Réévaluer l'Option A à partir de 50 missions/mois/TC ou si la messagerie agent devient un besoin produit.**

**Arguments** :
1. **Résout la dette sans ouvrir le chantier "rôles"** : le Sprint 3 arbitre ADR-0002 (modèle d'autorisation) — lancer un nouveau rôle AVANT cet arbitrage serait une double réécriture.
2. **Le canal de contournement (SMS ANSUT) devient le produit** : on capitalise sur `notifyAgentOfMission()` déjà en place ; le changement est invisible pour le TC (même réflexe).
3. **Le contrôle métier reste au TC** : rien n'est auto-validé ; le token ne sert qu'à COLLECTER (photos + grille) — la validation/mission COMPLETED finale reste une action TC authentifiée. C'est exactement le périmètre de confiance du persona.
4. **Cohérence différenciée avec DAT-005** : les agents d'agence gèrent un **portefeuille durable** (biens assignés, mandats, candidatures) → il leur faut des comptes (DAT-005, S3, modèle "user_id" = Option A appliquée à `agency_agents`). Les agents de terrain TC ont des **missions ponctuelles isolées** → tokens. Deux usages, deux solutions, une même traçabilité finale.

**Critères de réévaluation (Product Owner)** : > 50 missions/mois/TC, besoin de notifications in-app agent, besoin de multi-missions simultanées par agent, ou demande de signature manuscrite agent persistante.

---

## 7. Impacts transverses (si Option C retenue)

| Domaine | Impact |
|---|---|
| Middleware | Aucun (routes `/m/*` et `/api/missions-token/*` volontairement hors `PROTECTED_API_PREFIXES` — à documenter pour ne pas être "corrigé" par erreur) |
| Buckets | Nouveau bucket privé `mission-evidence` (aligné SEC-006, URLs signées) |
| ANSUT | Réutilise `sendSms`/`sendEmail` (`src/lib/ansut-messaging.ts`) — deep link `https://mon-toit.ansut.ci/m/{token}` (Capacitor : app-launcher/browser déjà présents) |
| Notifications TC | `notify()` in-app à `IN_PROGRESS` et `COMPLETED` |
| Audit | `audit_logs` entries `MISSION_TOKEN_SENT/OPENED/SUBMITTED` avec `actor` serveur |
| i18n/UX | Page agent en français simple, gros boutons, offline-tolerant (brouillon localStorage) |
| RGPD/confidentialité | Photos de tiers (occupants) : mention d'information en tête de page agent |

---

## 8. Plan de mise en œuvre (tâches backlog proposées)

> Format prêt à insérer dans TASKS.xlsx par l'orchestrateur. Sprint cible : **S4** (wave 2). IDs proposés hors collision avec le backlog existant (TC-001 pris).

| ID | Tâche | Sprint | Agent | Critères QA (acceptation) |
|---|---|---|---|---|
| TC-002 | Migration `mission_access_tokens` (hash unique, TTL, révocation, RLS off + accès service_role documenté) + index | S4 | DEV BACKEND | Migration idempotente appliquée ; token stocké hashé (jamais en clair) ; cascade delete mission OK ; test unitaire hash/TTL |
| TC-003 | Routes token : POST `/api/tc/missions/[id]/send-link` (génère/renvoie, ANSUT SMS+email, révocable) + routes publiques `/api/missions-token/[token]` (GET fiche, POST start/submit) avec rate-limit | S4 | DEV BACKEND | TC hors owner → 403 ; token expiré/révoqué/re-soumis → 410/409 ; rate-limit actif ; réponse bornée à la mission (pas de PII beyond) ; audit_logs écrits |
| TC-004 | Page mobile `/m/[token]` : fiche mission, checklist, upload photos (capture), brouillon local, soumission | S4 | DEV FRONTEND | 3G/mobile OK ; états loading/error/empty mutualisés (FE-005) ; photos obligatoires ≥ 1 ; draft conservé au refresh ; page expirée explicite |
| TC-005 | Branchement statuts : ouverture → `IN_PROGRESS`, soumission → `COMPLETED` + `photo_urls` + notification TC (+ draft `inventory_reports` pour INVENTORY_REPORT, validé ensuite par le TC dans son écran) | S4 | DEV BACKEND | Statuts transitionnels corrects ; notification in-app TC reçue ; draft rapport visible dans file TC ; mission déjà COMPLETED → idempotent |
| TC-006 | UI TC : statut du lien (envoyé/ouvert/rendu/expiré) + bouton (re)envoyer dans écrans `agents`/`missions` | S4 | DEV FRONTEND | Badge fidèle à `mission_access_tokens` ; relance régénère le token (ancien révoqué) ; realtime à jour |
| TC-007 | QA E2E parcours mission token + tests sécurité (expiration, révocation, rejeu, rate-limit) | S4 | QA (AGENT 2) | Playwright : create→link→open→submit→validate ; 6 tests négatifs passent ; 0 token en clair en DB ; checklist finale TC-001 §9 cochée |

**Dépendances** : SEC-006 (buckets privés) souhaitée avant TC-004 ; DOC-002 (pepper env) avant TC-002 ; aucune dépendance à ADR-0002.

---

## 9. Checklist QA finale (parcours TC-001)

- [ ] Un TC crée un agent → reçoit missions ; l'agent NE possède AUCUN compte users (vérifier DB).
- [ ] Création mission → SMS + email envoyés avec lien unique ; token stocké hashé en DB.
- [ ] Ouverture du lien sur mobile → mission passe IN_PROGRESS ; TC notifié.
- [ ] L'agent soumet photos + grille → mission COMPLETED ; photos accessibles UNIQUEMENT au TC concerné (URL signée) et pas en lecture publique.
- [ ] Token expiré (TTL dépassé) → page d'état explicite, aucune donnée affichée ; relance TC fonctionne.
- [ ] Token révoqué puis rejeu de l'URL → 410, audit log.
- [ ] Soumission double (double-tap) → idempotence, pas de doublon photo/rapport.
- [ ] Un token d'une mission du TC X ne peut pas muter une mission du TC Y (vérif serveur par jointure).
- [ ] Rate-limit sur /api/missions-token/* (brute-force token) : 429 après seuil.
- [ ] Écrans TC (agents/missions) affichent le statut du lien à jour (realtime).
- [ ] L'agent ne peut atteindre aucune route /api/tc/*, aucun écran dashboard (page standalone).
- [ ] audit_logs : MISSION_TOKEN_SENT / OPENED / SUBMITTED tracés avec mission_id.
- [ ] Réévaluation Option A documentée si seuils §6 atteints.

---

*Fin de la spec TC-001 — Agent 2 (QA/PO), Task 4-h. Décision à arbitrer par l'orchestrateur avant lancement wave 2.*
