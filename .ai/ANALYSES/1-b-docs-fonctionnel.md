# 1-b — Analyse DOCUMENTAIRE & FONCTIONNELLE — Mon Toit CI (branche 4.0.0)

**Task ID** : 1-b · **Agent** : AGENT DOCUMENTATION (Tech Writer, Explore) · **Date** : 2026-10-26
**Périmètre** : analyse uniquement — aucun code modifié.
**Sources** : README.md, worklog.md (~28 KB, 25 entrées), agent-ctx/ (29 fichiers), analyse-acteurs/ (5 fichiers), .kilo/plans/, .zcode/plans/, .ai/ (TEAM_STATUS, LESSONS_LEARNED), git log (349 commits, HEAD d206a4b), arborescence supabase/ (25 Edge Functions, 85 migrations), src/ (162 routes API, 101 composants dashboard, 25 hooks Realtime).

---

## 1. Résumé exécutif

Mon Toit CI est une plateforme de gestion locative ivoirienne à 5 rôles (Locataire, Propriétaire, Agence, Tiers de Confiance, Admin) reposant sur Next.js 16 (App Router, un seul `src/app/page.tsx` + store Zustand), Supabase (Postgres + Auth + Realtime + Storage + Edge Functions) et Capacitor (iOS/Android). Le projet a vécu **deux générations** : une génération Vite + Prisma/SQLite (branche main, ~mars→juin 2026, documentée dans worklog.md et agent-ctx/) puis la **branche 4.0.0** actuelle (Next.js + Supabase, 349 commits). La documentation de référence (README.md) est **partiellement divergente du code** : liens morts (AUDIT.md, AGENTS.md), 14 Edge Functions annoncées pour 25 réelles, écrans annoncés non exposés en sidebar, variables d'environnement obsolètes, chatbot SUTA et messagerie ANSUT non documentés. L'analyse par acteur (`analyse-acteurs/`) reste globalement exacte sur la méthode mais **partiellement obsolète** : ~25 commits de correction (de338ca → d206a4b) ont traité la majorité des P0/P1 qu'elle listait. La maturité fonctionnelle est **élevée sur les parcours cœur** (recherche → dossier → bail signé → paiement → fin de bail) et **moyenne sur la délégation agence et l'opérationnel terrain** (agents sans comptes utilisateurs).

---

## 2. Architecture annoncée vs constatée

### 2.1 Ce que le README annonce
```
Frontend (Next.js) → API Routes (Next.js) → Edge Functions (Supabase) → APIs externes
                                                      ↓
                                              Supabase (Postgres + Realtime)
```
- Auth : Supabase Auth + `resolveRequestUser` / `applyCookies` · Realtime : 26 hooks · Intouch (OM, MoMo, Moov, Wave) · CRYPTONEO · ONECI + NeoFace · Capacitor · Tailwind + shadcn/ui + Framer Motion.
- Sections par rôle : Locataire 10, Propriétaire 13, Agence 12, TC 16.
- Renvoie vers `AUDIT.md` et `AGENTS.md`.

### 2.2 Ce que le code montre (compteurs réels)
| Élément | Annoncé (README) | Constaté (code) |
|---|---|---|
| Routes API Next.js | ~20 familles | **162 fichiers `route.ts`** |
| Edge Functions | 14 | **25** (+ `_shared/`, `_test/`) |
| Migrations SQL | non chiffré | **85** |
| Hooks Realtime | 26 | **25** `use-realtime-*.ts` |
| Composants dashboard | ~90 | **101** (locataire 21, propriétaire 21, agence 14, TC 28, admin 15, shared 2) |
| Tests | — | 11 fichiers vitest + 2 specs Playwright (4 comptes de test) |
| Middleware | — | `middleware.ts` : garde par rôle (`ROLE_ROUTES`), préfixes publics/protégés |
| Edge Functions planifiées | 0 listées | **11** (reminders J-1/J-3, relance signatures, expiration baux/annonces/dossiers, paiements mensuels, impayés) — **aucun cron configuré dans `supabase/config.toml`** |
| Chatbot SUTA | absent | **présent** (`suta-chatbot.tsx`, `/api/suta`, Azure OpenAI `gpt-5.6-luna`) |
| Messagerie ANSUT (SMS/Email OTP) | absente | **présente** (`ansut-messaging.ts`, vars `ANSUT_API_*`) |
| `AUDIT.md` / `AGENTS.md` | référencés | **inexistants** (liens morts) |
| `supabase/README.md` | annoncé par le Sprint 5 du worklog | **inexistant** |

### 2.3 Variables d'environnement (divergences README vs `.env.local.example`)
- README : `CRYPTONEO_API_KEY` → réel : `CRYPTONEO_APP_KEY` + `CRYPTONEO_APP_SECRET` (URL `https://signature.ansut.ci`).
- README : `NEOFACE_API_KEY`/`NEOFACE_API_URL` → réel : `NEOFACE_BEARER_TOKEN` + `NEOFACE_API_BASE` (`https://neoface.aineo.ai`).
- Absents du README : `RNPP_API_BASE`/`RNPP_API_KEY` (KYC RNPP Connect), `ANSUT_*` (SMS/email), `AZURE_OPENAI_*` (SUTA), `ONECI_*` mentionnés dans l'ancien worklog ( remplacés par RNPP sur 4.0.0).
- ⚠️ **Fuite de secret historique** : l'entrée "Task 3 ONECI KYC Agent" du worklog contient une clé API ONECI en clair → rotation recommandée + nettoyage du worklog.

### 2.4 Authentification & rôles
- Rôles : `LOCATAIRE | PROPRIETAIRE | AGENCE | TIERS_CONFIANCE | ADMIN` (`src/lib/auth-store.ts`, 837 lignes, Zustand).
- **Switch de rôle restreint à LOCATAIRE ↔ PROPRIETAIRE** (`onboarding-modal.tsx` : `canSwitchRole`), via `/api/user/switch-role` + `activeRole`.
- Inscription avec choix de rôle parmi 4 (ADMIN jamais proposé à l'inscription) ; vérification email/téléphone par OTP (hashé en SHA-256 via `src/lib/otp-hash.ts` — correctif sécurité du plan .zcode appliqué).
- Middleware : routes API protégées par rôle ; propriétés publiques en lecture (`/api/properties`, `/api/auth/*`, `/api/properties/reviews`).
- Pattern serveur unique : `resolveRequestUser(request)` + `getSupabaseAdminClient()` + `applyCookies` — **0 import Prisma restant dans `src/`** (vérifié par grep).

---

## 3. Cartographie fonctionnelle COMPLÈTE par acteur

> Méthode : croissement `sidebar.tsx` (écrans exposés), `index.tsx` (écrans routés), `src/app/api/**` (backend), migrations (données). Statuts : ✅ existant · 🟡 partiel/à confirmer · ❌ manquant.

### 3.1 👤 LOCATAIRE — 21 composants, 12 items sidebar
**Mission** : chercher un bien, se qualifier (dossier locatif validé par le TC), visiter, signer, payer, habiter, sortir.

**Écrans sidebar** : overview · chercher un bien (redirige vers la vue publique « Nos biens ») · favoris · candidatures · visites · locations (baux) · **états des lieux** · paiements · messages · litiges · notifications · paramètres.
**Écrans routés hors sidebar** (accessibles par navigation interne) : dossier locatif (formulaire), liste dossiers, avis, **maintenance**, activité, trust-score, 4 écrans de détail (paiement/candidature/visite/bail).
**Divergence README** : « Maintenance » annoncée comme section mais **absente de la sidebar** (composant et route existent, atteints via le dashboard) ; « Mes contrats » s'appelle « Mes locations ».

| Domaine | État | Détail |
|---|---|---|
| Recherche biens | ✅ | Filtres ville/type/prix, carte Leaflet, détail public, vues comptées |
| Favoris + alertes de recherche | ✅/🟡 | Favoris complets ; alertes : CRUD API + fonction SQL de matching (migration `create_search_alerts`) mais **déclenchement périodique non démontré** |
| Dossier locatif | ✅ | Brouillon → soumission → validation TC ; documents obligatoires **par catégorie d'emploi** (salarié/entrepreneur/étudiant) ; unicité DRAFT (migration `unique_rental_file_applications`) ; retrait branché (c68982e) ; expiration (f17e270) |
| Candidatures | ✅ | Statut synchronisé avec validation TC (55f77a6) ; timeline + progression documents ; ❌ pas de versions de dossier (config familiale/garant) |
| Visites | ✅ | Demande (physique/virtuelle via modal), acceptation/refus/contre-proposition, rappels J-1/J-3 (EF `remind-upcoming-visits`) |
| Bail + signature | ✅ | Création après dossier VALIDÉ ; signature **OTP des deux parties** → ACTIVE ; signature manuscrite `SignaturePad` + CRYPTONEO (alias, OTP, certificat) ; PDF (LibreOffice headless côté route, fallback DOCX) ; relance auto signatures (f66a708) ; annulation propre `CANCELLED` (906a954) ; modification avant signature |
| Paiements | ✅ | 4 opérateurs mobile money (Intouch), paiement immédiat & anticipé, **paiement PARTIAL avec montant payé/restant** (1c2dc34), callback HMAC idempotent (6792c0d), impayés badge rouge sidebar, détail + reçu |
| États des lieux | ✅/🟡 | Parcours locataire direct ajouté (c5a562e : consulter + signer) ; signature bilatérale TC↔locataire à confirmer en bout en bout |
| Maintenance | ✅ | Création, priorités, commentaires, suivi ; écran non sidebar |
| Litiges | ✅ | `my-disputes` partagé ; ouverture/suivi |
| Avis & notation | ✅/🟡 | Donnés/reçus, réponse propriétaire ; invitation auto à la résiliation (00e7f6e) |
| KYC / confiance | ✅ | ONECI (match NNI, face, empreinte RNPP) → NeoFace face ; trust-score ; **partage de profil branché** (44298e8) |
| ❌ Manquant | — | Quittance de loyer mensuelle formelle ; historique de tentatives de paiement ; dossiers multiples ; renouvellement = avenant signé (route + reminder existent, l'avenant signé reste 🟡) |

### 3.2 🏠 PROPRIÉTAIRE — 21 composants, 13 items sidebar
**Mission** : publier des biens vérifiés, sélectionner des candidats, contractualiser, encaisser, gérer la sortie.

**Écrans sidebar** : overview · mes biens · mes locataires · demandes de visite · candidatures · baux · mandats · maintenance · paiements (= écran Finances) · messages · litiges · notifications · paramètres.
**Écrans routés hors sidebar** : **finances, analytics** (README les présente comme sections), renouvellements, dossier propriétaire (owner-file), détail locataire, états des lieux (formulaire TC), avis, activité, trust-score.
**Divergence README** : « Mes finances » et « Analytics » listés comme sections de navigation — ce sont des composants réels mais **non exposés en sidebar**.

| Domaine | État | Détail |
|---|---|---|
| Biens | ✅ | CRUD + photos/vidéos (Storage), commodités, modalités (caution/avance/frais agence dans `rental_terms`), statuts DRAFT→PENDING_VERIFICATION→ACTIVE→RENTED/SUSPENDED/CLOSED ; **expiration auto des annonces** (af76fbe + EF `expire-stale-listings`) |
| Dossier propriétaire | ✅ | `owner_files` + documents ; **titres fonciers rattachés au bien** (`ownership_documents.property_id`, 95b5418) |
| Candidatures / locataires | ✅ | Acceptation/refus, détail locataire, historique |
| Baux | ✅ | Assistant 4 étapes, signature OTP bilatérale, modification pré-signature, résiliation, renouvellement **réellement déclenché** (ff20d6d + reminder échéance), **restitution de caution modélisée** (9b7f867 + migration `deposit_refunds`) |
| Mandats | ✅/🟡 | Création/signature/PDF ; **schéma de signature aligné** (6a69c68 + migration `add_mandat_signature_columns`) |
| Paiements & finances | ✅/🟡 | Suivi PARTIAL géré (1c2dc34) ; rapprochement bancaire complet ❌ ; commissions/abonnement plateforme 🟡 |
| Maintenance | ✅ | Suivi + assignation |
| Avis | ✅ | Réponses aux avis ; invitation auto à la clôture (00e7f6e) |
| ❌ Manquant | — | Impayés : Edge Function `check-overdue-payments` **et** route `/api/payments/check-overdue` coexistent (idempotence corrigée 6792c0d, mais double point d'entrée à centraliser) ; facturation commissions ; vue financière auditée |

### 3.3 🏢 AGENCE — 14 composants, 15 items sidebar
**Mission** : gérer un portefeuille sous mandat pour des propriétaires, coordonner des agents, traiter candidatures/visites/contrats, suivre commissions.

**Écrans** : overview (pipeline) · nos biens (portfolio) · mandats · candidatures · visites · contrats · équipe · finances · analytics · communication · litiges · marketing · dossiers clients · paramètres (+ notifications routées).

| Domaine | État | Détail |
|---|---|---|
| Mandats | ✅/🟡 | Cycle complet ; signature alignée (6a69c68) ; **le mandat n'est pas encore la condition d'accès stricte au portefeuille** — `secure_agency_agent_properties` (20260910000002) renforce, contrôle mandat actif côté serveur à confirmer |
| Candidatures / visites | ✅ | Kanban, assignation d'agent à une visite (FK réparée 5d9a062), **rappels de visite fonctionnels** (b74455b) |
| Contrats | ✅/🟡 | Création de baux pour le compte des propriétaires ; responsabilité de signature 🟡 |
| Équipe | 🟡 | `agency_agents` (rôles AGENT/manager, statut) — **sans `user_id`** : un agent ne peut pas se connecter individuellement (P1 non résolu) |
| Commissions | ✅/🟡 | **Génération à l'activation d'un bail sous mandat** (17be6c4) ; paiement/rapprochement de commission 🟡 |
| Documents légaux | ✅ | Dépôt agrément/RCCM (b47efde) → dossier agence TC |
| Exports | ✅ | **Export réel** contrats/analytics (0af98c8, plus de toast « à venir ») |
| Marketing | 🟡 | Section sans pipeline campagne/métriques (P2) |
| ❌ Manquant | — | Authentification individuelle des agents agence ; cloisonnement fin « dossier exposé seulement après validation TC » à confirmer en RLS |

### 3.4 🔍 TIERS DE CONFIANCE — 28 composants, 19 items sidebar
**Mission** : garantir la confiance — valider biens, dossiers locataires/propriétaires/agences, identités (KYC), réaliser états des lieux et missions terrain, émettre certifications, traquer fraude et litiges, respecter les SLA.

**Écrans** : overview (files + SLA) · tous les biens · vérification biens (+détail) · dossiers de validation (locataires) · dossiers propriétaires · dossiers agences (+détail) · vérification ONECI · utilisateurs · certifications · rapports d'états des lieux (+formulaire 9×5 BON/MAUVAIS/clés) · agents · missions · centre de documentation · alertes fraude · messagerie · suivi SLA · litiges · notifications · paramètres (settings TC allégés : pas de scoring/KYC/switch de rôle).

| Domaine | État | Détail |
|---|---|---|
| Validation dossiers locataires | ✅ | Kanban, documents, décisions, **demande de complément + resoumission débloquées** (0af98c8), **expiration fiable** (f17e270) ; validité datée à confirmer en production |
| Validation propriétaires/agences | ✅ | Files dédiées ; **découvrabilité corrigée** (999491c) ; cibles certifications **PROPERTY/AGENCY validées et contraintes** (de338ca + migration `validate_certification_target`) |
| Biens | ✅ | PENDING_VERIFICATION → approbation/rejet ; création d'états des lieux / mission depuis le détail |
| KYC ONECI/NeoFace | ✅/🟡 | Match NNI, face, empreinte RNPP ; **historisation ONECI créée** (`oneci_verifications`, 20260911000002) ; statuts encore textuels libres 🟡 |
| Missions & agents terrain | 🟡 | CRUD missions/agents ; **l'agent terrain est notifié par email/SMS ANSUT** (f196e71) car **`verification_agents` n'a toujours pas de `user_id`** → l'agent ne peut PAS se connecter ni exécuter une mission dans la plateforme (P0 structurel non résolu, contourné) |
| SLA | ✅ | `validation_slas` **alimentée et contrainte** (0c28f5f) ; relation polymorphe entity_type/entity_id sans FK forte (risque orphelins résiduel) |
| Fraude & litiges | ✅ | Realtime fraud alerts ; litiges OPEN→IN_REVIEW→RESOLVED avec assignation/réouverture ; signalement de bien |
| Documentation | ✅ | Statique **assumée et documentée** (ffc4f9a : contenu embarqué volontairement non administrable) |
| ❌ Manquant | — | Compte agent terrain ; uniformisation complète des preuves KYC ; versionnage guides (choix assumé) |

### 3.5 🛡️ ADMIN — 15 composants, 13 items sidebar
**Mission** : supervise la plateforme : comptes, TC, modération (biens, avis, contenu), signalements, litiges, sécurité/audit, système, configuration, sauvegardes.

**Écrans** : overview · utilisateurs · modération contenu · **modération des avis** · tiers de confiance (trust-agents) · signalements · litiges · notifications · système · sécurité · rapports · configuration · sauvegardes.

| Domaine | État | Détail |
|---|---|---|
| Rapports | ✅ | **Branchés sur de vraies données** (be8fd40, fin des valeurs codées en dur) |
| Gestion TC | ✅ | **Branchée sur de vraies données** (54cff5d) ; cycle de vie/révocation à auditer |
| Modération avis | ✅ | Écran + route + migration `review_moderation` (b74455b) |
| Modération biens | ✅ | Approve (ACTIVE + isVerified) / reject (SUSPENDED + motif) + audit + notification |
| Configuration | ✅ | **Doublon config/settings supprimé** (61c93a4) ; `admin/config.tsx` n'existe plus |
| Sauvegardes | ✅/🟡 | Contrat UI/API fiabilisé (61c93a4) ; tests de restore à faire |
| Sécurité/audit | ✅/🟡 | Audit logs, connection logs, sessions ; export CSV utilisateurs + audit des actions sensibles (34556ea) ; **RLS logs KYC + documents de bien corrigés** (e3e44ad) |
| ❌ Manquant | — | Export Excel/rapports planifiés ; couverture audit de toutes les actions sensibles ; protection explicite des déclencheurs système (impayés/paiements mensuels) contre double exécution (idempotence faite, autorisation à durcir) |

---

## 4. Règles métier identifiées (synthèse transverse)

1. **Qualification locataire** : dossier locatif (identité, revenus selon catégorie d'emploi) → validation TC (SLA, compléments, expiration) → seule une candidature sur dossier validé débouche sur un bail. Unicité : 1 dossier DRAFT, 1 candidature par bien (migrations).
2. **Cycle bien** : DRAFT → PENDING_VERIFICATION (TC ou mission agent terrain) → ACTIVE (publié) → RENTED (sync verrouillée avec bail, b3e19c6) ; expiration auto des annonces ; modération admin en parallèle ; documents de bien à visibilité contrôlée (`is_published` + RLS).
3. **KYC en chaîne** : ONECI (match NNI → face → empreinte RNPP) **puis** NeoFace (face) ; statuts `oneciVerified`/`neofaceVerified` + historisation (`facial_verifications`, `oneci_verifications`) ; authentification biométrique conditionnelle.
4. **Signature** : baux et mandats signés via OTP interne (type `BAIL_SIGNATURE`) et/ou CRYPTONEO (certificat + alias + OTP + batch + vérification + fichier signé) ; image de signature manuscrite stockée (base64 PNG) ; ACTIVE seulement quand les 2 parties ont signé ; relances automatiques ; PDF généré (LibreOffice) ; résiliation vs annulation `CANCELLED` distinctes.
5. **Paiements** : initiation Intouch cashin (4 opérateurs), callback webhook HMAC (fail-closed si secret absent — correctif .zcode), idempotence (migration `payments_idempotency`), statuts incluant PARTIAL (payé/restant), paiement immédiat & anticipé, impayés détectés (EF + route), **restitution de caution** (`deposit_refunds`).
6. **Mandats & commissions** : mandat propriétaire↔agence signé (schéma aligné) ; commissions générées à l'activation d'un bail sous mandat ; affectation agent↔bien sécurisée (migration `secure_agency_agent_properties`).
7. **Notation croisée** : ratings locataire↔propriétaire sur biens, réponse du propriétaire, invitation automatique à la résiliation, modération admin.
8. **Litiges & fraude** : workflow TC (assignation, résolution motivée, réouverture), signalements (biens + admin), alertes fraude temps réel.
9. **Notifications** : helper central `notify()/notifyMany()` (DB + Realtime), préférences par utilisateur, rappels planifiés J-1/J-3 visites/paiements, relance signatures, rappels expiration bail/dossier, canaux in-app + SMS/email ANSUT.
10. **Audit & conformité** : `audit_logs`, `connection_logs`, CGU/cookies/privacy (vues légales présentes), OTP hashés, secrets retirés du code (fallbacks vidés), RLS par table avec policies colocated.

---

## 5. Historique de développement & dettes

### 5.1 Chronologie reconstituée
| Période | Phase | Preuves |
|---|---|---|
| mars–juin 2026 (branche main, Vite+Prisma+SQLite) | Fondation : sessions serveur, schéma 16 modèles, API routes, messagerie, paiements Intouch, KYC ONECI/NeoFace, mini-service WebSocket notifications (port 3003), dashboards 5 rôles, signature CRYPTONEO, OTP bail, états des lieux, dark mode, caching (authFetch SWR + TanStack), FAQ, modération admin | worklog.md entrées 1→Sprint 5, agent-ctx/ (29 fichiers) |
| Sprint 4–5 (avant bascule) | Migration ~95 routes API Prisma→Supabase ; 12 Edge Functions signature/KYC/paiement + proxy de 12 routes Next ; nettoyage secrets | worklog.md |
| Bascule codespace | Wipe complet + récupération branche **4.0.0** (HEAD d206a4b) ; correctif défensif `hero.tsx` ; port 3000 ; `.env.local` à remplir | worklog.md dernière entrée + LESSONS_LEARNED (sync sandbox : lots ≤ 7 fichiers) |
| Branche 4.0.0 (349 commits) | Audit par acteur (`analyse-acteurs/` + plan `.kilo/`) → **vague de correctifs P0/P1** (de338ca→d206a4b) traitant ~25 lacunes listées section 3 ; plan sécurité `.zcode/` (OTP hashé, webhook fail-closed, logs, vitest setup) appliqué ; RNPP Connect, SUTA chatbot, pagination généralisée | git log, migrations 20260910*/20260911* |

### 5.2 Bugs corrigés notables (historique)
Infinite loading TC (loading jamais remis à false) · 409 sur création d'agent (unicité email scopée par TC + réactivation soft-delete) · 502 OOM du dev server (Turbopack 4.9 GB) · FK cassée agent visite · crash hero sans backend · popstate/back-handler Android · réponses non-JSON dans authFetch · doublons de soumission de profil · auto-soumission intempestive du dossier à la candidature · inférence `never` sur select Supabase (annulation bail) · imports manquants pagination TC.

### 5.3 Dette technique & problèmes connus (état courant)
| # | Dette | Priorité |
|---|---|---|
| 1 | `verification_agents` et `agency_agents` **sans lien `users`** : agents non connectables (contournement TC pour missions ; audit limité pour agence) | P0 |
| 2 | `src/lib/supabase/types.ts` incomplet (703 lignes vs 85 migrations, `Relationships: []`) → ~841 `as any`, fiabilité compile-time faible | P1 |
| 3 | 11 Edge Functions planifiées **sans cron défini dans le repo** (config.toml vierge de schedule) — dépendance déploiement externe non documentée | P0 |
| 4 | Double point d'entrée impayés (EF `check-overdue-payments` + route `/api/payments/check-overdue`) et déclencheurs système à centraliser/protéger | P1 |
| 5 | Déclenchement des alertes de recherche (fonction SQL présente, scheduler non démontré) | P1 |
| 6 | RLS/SGT à auditer : `service_usage_logs.user_id` typé différemment de `users.id` ; statuts de vérification faciale textuels libres | P1 |
| 7 | Divergences documentaires (voir §6) ; `worklog.md` mélange 2 générations techniques (Prisma vs Supabase) | P1 |
| 8 | Secret ONECI historique en clair dans worklog.md (rotation recommandée) ; résidus ancien stack (`db/custom.db`, `prisma` dans agent-ctx) | P1/P2 |
| 9 | Validation zod sur 147+ routes et réduction des `as any` : explicitement hors périmètre (plan .zcode) | P2 |
| 10 | Warnings ESLint React 19 (`set-state-in-effect`, ~160) reportés | P2 |

### 5.4 Couverture de tests
- **Unit/integration (vitest, 11 fichiers)** : auth-store, middleware, dashboard, flux auth complet, flux core (paiements mockés), owner-mandat-lease, resoumission TC (flow + UI), lifecycle manager, setup créé par le plan .zcode.
- **E2E (Playwright, 2 specs)** : auth-flow, roles (4 comptes `*@montoit.ci`, mot de passe de test).
- **Seed** : `scripts/seed-complete.ts` (Supabase) — scénario complet locataire/propriétaire/agence + `create-test-users`, `cleanup-*`.
- Non couvert : TC et Admin en E2E, callbacks Intouch réels, Edge Functions, RLS.

---

## 6. Divergences documentation ↔ code (récapitulatif)

| # | Divergence | Gravité |
|---|---|---|
| D1 | README pointe vers `AUDIT.md` et `AGENTS.md` inexistants | Moyenne |
| D2 | README liste 14 Edge Functions ; 25 existent (11 planifiées omises : reminders, expirations, monthly-payments, transfer, certificates…) | Moyenne |
| D3 | README : sections propriétaire « Mes finances »/« Analytics » et locataire « Maintenance » absentes de la sidebar réelle (composants existent, accès via navigation interne) | Moyenne |
| D4 | README : variables d'env obsolètes (CRYPTONEO_API_KEY, NEOFACE_API_KEY/URL) ; omet RNPP, ANSUT, Azure OpenAI | Moyenne |
| D5 | README : chatbot SUTA, paiement immédiat/anticipé, caution, renouvellements, litiges non documentés ; « 26 hooks » vs 25 | Faible |
| D6 | `analyse-acteurs/*` : ~25 constats P0/P1 **déjà corrigés** depuis (signature mandat, candidature/TC, idempotence paiements, sync bien/bail, titres→bien, rapport/config/backups admin, notif mission, expiration dossiers/annonces, rappels, caution, PARTIAL, commissions, exports, RLS KYC, découvrabilité TC, retrait dossier, partage profil, états des lieux locataire, modération avis, gestion TC admin) → documents à dater/versionner | Haute (perte de confiance doc) |
| D7 | Worklog : entrées Sprint 4/5 décrivent des fichiers (Prisma, mini-services) disparus de 4.0.0 sans marqueur de génération | Moyenne |
| D8 | `supabase/README.md` annoncé par le Sprint 5 jamais présent sur 4.0.0 ; aucun ADR formel (les décisions vivent dans commits + `.kilo/.zcode` plans) | Faible |

---

## 7. Conclusion & recommandations documentaires

1. **Mettre à jour le README** (Edge Functions réelles, sections réelles par rôle, env vars actuelles, SUTA/ANSUT, supprimer liens morts) et **dater/marquer** `analyse-acteurs/` comme « snapshot avant la vague de correctifs ».
2. **Décider le modèle des agents** (terrain TC + agence) : comptes utilisateurs ou explicitement « hors plateforme » — c'est le dernier P0 structurel.
3. **Documenter l'orchestration des crons** (qui appelle les 11 EF planifiées : pg_cron, GitHub Actions, scheduler externe ?) — indispensable pour garantir rappels/expirations en production.
4. **Régénérer `src/lib/supabase/types.ts`** depuis les 85 migrations (supabase gen types) pour réduire `as any`.
5. **Séparer le worklog par génération** ou y ajouter un en-tête « historique pré-4.0.0 », et purger/roter le secret ONECI.
6. Créer un **ADR** par décision structurante (migration Supabase, SUTA, documentation statique TC, modèle agents, idempotence paiements).

**Maturité fonctionnelle globale** : parcours cœur Locataire/Propriétaire ~90 % complets et éprouvés ; TC très riche (28 écrans) mais amputé de l'exécution terrain connectée ; Agence fonctionnelle sur le papier, fragilisée par l'absence d'identité des agents et le contrôle mandat actif à confirmer ; Admin désormais branché sur données réelles. Les zones d'ombre principales : exécution réelle des jobs planifiés, RLS de production, contrats externes (Intouch/CRYPTONEO/RNPP) invérifiables localement.
