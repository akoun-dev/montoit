# ADR-0004 — Capacitor : URL distante vs export statique

| | |
|---|---|
| **Task ID** | 4-g (Sprint 3) |
| **Agent décideur** | TECH LEAD & ARCHITECTE (Agent 1) — **décision finale : PRODUIT (propriétaire du projet)** |
| **Date** | 2026-10-26 |
| **Statut** | ⚠️ **PROPOSÉ — DÉCISION PRODUIT REQUISE (propriétaire)**. Reco Tech Lead : Option A court terme, Option B conditionnée. |
| **Tags** | mobile, capacitor, android, ios, build, auth-hybrid, stores |
| **Supersede** | Choix structurant A5 (`.ai/ARCHITECTURE.md` §2), dette T3 |

---

## 1. Contexte — l'état réel (constaté, commit `d206a4b`)

| Fait | Preuve mesurée |
|---|---|
| L'app mobile charge en réalité **le site distant** | `capacitor.config.ts` → `server.url: 'https://mon-toit.ansut.ci'` + `allowNavigation: ['mon-toit.ansut.ci', '*.aineo.ai']` |
| L'export statique est **cassé / jamais produit** | `webDir: 'out'` mais **aucun dossier `out/`** dans le repo (`ls out` → inexistant) |
| `BUILD_TARGET=capacitor` est un **no-op** | `next.config.ts` ligne 3 : `const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor'` — variable **jamais utilisée** ; `output` reste `'standalone'` |
| Les scripts `cap:build` / `cap:build:apk` produiraient un résultat inutilisable | `package.json` : `BUILD_TARGET=capacitor next build && npx cap copy …` → `cap copy` copie `out/` inexistant ; le build produit du standalone, pas du statique |
| Le plumbing hybride est **à moitié écrit** | `src/lib/capacitor.ts` : `isCapacitor()`, `getApiBaseUrl()` (env `NEXT_PUBLIC_CAPACITOR_API_URL`), `getAuthToken()`, `apiFetch()` ; `auth-fetch.ts` préfixe déjà les URLs + Bearer en mode Capacitor — mais l'env **n'est pas documentée** dans `.env.local.example` (1-a §7) |
| Double auth à gérer côté WebView | Supabase JWT (cookie `sb-*-auth-token`) **+** session SMS custom (`montoit-session`, httpOnly, SameSite=Lax, 30 j) — la session custom n'a **pas de token transportable** : `resolveRequestUser` lit un cookie posé par le serveur |
| 9 hooks natifs déjà câblés | `src/hooks/capacitor/` : Network, StatusBar, LocalNotifications, Push, Geolocation, Browser, InAppBrowser, AppLauncher, App (retour Android) |

**Conclusion du constat** : l'APK actuel est un *shell* qui affiche le site web. Le pipeline « build statique » documenté dans les scripts est un vestige qui ne fonctionne pas.

---

## 2. Les deux options

### Option A — URL distante (statu quo consolidé)

L'APK continue de charger `https://mon-toit.ansut.ci` dans la WebView.

| Coûts | Bénéfices |
|---|---|
| **~0,5–1 j** : réparer ou retirer les scripts `cap:build*` trompeurs (ou les rebrancher sur un build « shell » propre) ; documenter `NEXT_PUBLIC_CAPACITOR_API_URL` (sans effet en mode URL distante) ; guide « publier un APK » | Zéro refonte auth (cookies de première partie, SameSite inchangés) |
| Monitoring réseau + page offline (`offline.html` déjà branchée via `errorPath`) | Mises à jour immédiates sans passage en store (le code vit sur le serveur) |
| | 9 plugins natifs fonctionnent (canal Capacitor injecté par allowNavigation) |

**Risques réels** :
- **Dépendance réseau totale** : sans réseau, l'utilisateur ne voit que `offline.html`.
- **Politiques des stores** : Apple guideline **4.2 (minimum functionality)** et les règles Google Play « spam/minimum functionality » peuvent **rejeter une app qui n'est qu'un site web empaqueté**. Pour une distribution TestFlight interne / Play internal testing : OK. Pour une **publication publique** : risque élevé, surtout iOS.
- Splash → white screen selon la latence (atténué par le splash natif custom déjà présent).

### Option B — Export statique réel (APK autonome)

`BUILD_TARGET=capacitor` produit réellement `out/` (export statique du frontend), l'APK embarque le JS et appelle l'API déployée.

**Prérequis techniques (tous identifiés sur le code réel)** :
1. **Build séparé** : `output: 'export'` est **incompatible** avec les 162 `route.ts` du même projet → il faut une config de build Capacitor dédiée (ex. `next.config.capacitor.ts` : export + désactivation des routes API) ou un repo/branch de build frontend. La SPA mono-route (ADR-0001) rend l'export simple (1 page client-only), c'est un point en faveur du maintien de la SPA.
2. **API base URL dynamique** : `NEXT_PUBLIC_CAPACITOR_API_URL` (le mécanisme existe dans `auth-fetch.ts`/`apiFetch` — il « suffit » de le brancher partout et de renseigner l'env, absente de `.env.local.example`) + **CORS** sur l'API pour les origines `capacitor://localhost` (iOS) et `https://localhost` (Android, scheme https configuré).
3. **Refonte auth hybride — le vrai chantier** :
   - Le cookie `montoit-session` (SameSite=Lax, première partie) **ne sera pas envoyé** en cross-origin depuis la WebView (`https://localhost` → `mon-toit.ansut.ci`). Deux sous-options : (a) cookie `SameSite=None; Secure` + CORS `credentials: 'include'` (fragile, rejeté par certains WebViews/Safari ITP), ou **(b) token de session custom transportable** : renvoyer le token `sessions.token` au client + `Authorization: Bearer <token>` (le code d'injection Bearer existe dans `auth-fetch.ts`/`apiFetch`) + étendre `resolveRequestUser` pour lire un Bearer custom (aujourd'hui : JWT Supabase, fallback getSession, fallback cookie).
   - Les users email (JWT Supabase) passent via le Bearer déjà implémenté ; **les users SMS (majorité du marché cible CI) exigent le sous-point (b)**.
   - Supabase realtime/storage/auth fonctionnent depuis la WebView (APIs Supabase CORS ouvertes) ✔.
4. **Coût estimé : 5–10 j dev + 2–3 j de tests APK/e2e mobile** + dette continue (CORS + Bearer à penser pour chaque nouvelle route).

| Coûts | Bénéfices |
|---|---|
| 7–13 j + risque auth SMS (double chemin d'identité, cf. ADR-0002 Phase 2) | Distribution stores publique défendable (fonctionnalité native réelle) |
| Dette CORS continue | Lancement offline partiel (shell + cache), UX de lancement plus rapide |
| Gestion de versions en store (chaque fix UI = release) | Expérience « vraie app » (deep links, splash natif, notifications sans redirect) |

---

## 3. Recommandation Tech Lead (la décision finale appartient au produit)

> **Option A (URL distante) est retenue par défaut tant que la distribution publique en store n'est pas exigée.**
> Option B n'est à lancer **que si** le produit répond oui à au moins une des questions ci-dessous — dans ce cas, elle démarre **après** le Sprint 0 sécurité et en s'appuyant sur les couches `services/` de ADR-0003 (single point de branchement de l'API base URL).

### Questions à trancher par le propriétaire produit
1. **Distribution publique App Store / Play Store obligatoire** (vs partage d'APK direct / TestFlight / Play internal testing) ?
2. **iOS requis dès la v1 publique** ? (le risque de rejet 4.2 est surtout Apple ; Android tolère davantage la distribution directe — marché CI : Android majoritaire).
3. **Usage offline réellement requis** par les parcours cibles (locataires sans réseau stable) ou l'`offline.html` suffit-il ?
4. Accepte-t-on le **délai de publication store** (releases) pour chaque correction UI ?

### Matrice de décision
| Réponses produit | Décision |
|---|---|
| Distribution directe/interne suffisante (Q1 non) | **Option A** définitive pour 4.0 |
| Publication publique obligatoire, Android d'abord (Q1 oui, Q2 non) | Option B Android en premier (~5 j), Option A maintenue pour iOS en attendant |
| Publication publique + iOS v1 (Q1 oui, Q2 oui) | Option B complète (~7–13 j), plan §5, priorité après Sprint 0 |

---

## 4. Impacts chiffrés

| Poste | Option A | Option B |
|---|---|---|
| Effort immédiat | **0,5–1 j** (cleanup scripts + doc + monitoring) | **5–10 j dev + 2–3 j tests** |
| Refonte auth | Aucune | Session SMS token transportable + `resolveRequestUser` Bearer custom + CORS (~60 % de l'effort) |
| Risque store | Rejet possible (Apple 4.2) en public | Faible |
| Routes API impactées | 0 | Config CORS middleware + auth des routes (aucune logique métier changée) |
| Dépendance à d'autres ADRs | Aucune | Bénéficie de ADR-0003 (services = point unique `getApiBaseUrl`) ; doit s'aligner sur ADR-0002 Phase 2 (identité) |

---

## 5. Plan d'action minimal par branche

### Branche A (URL distante) — à faire dès maintenant
1. `package.json` : renommer/neutraliser `cap:build`/`cap:build:apk` (ou les faire produire un vrai shell) pour que personne ne « build un APK cassé » en croyant livrer un export statique.
2. `next.config.ts` : supprimer la variable morte `isCapacitorBuild` (ou implémenter le basculement si Option B retenue plus tard).
3. Documenter dans `.env.local.example` la variable `NEXT_PUBLIC_CAPACITOR_API_URL` (« sans effet tant que server.url est défini »).
4. Rédiger la procédure de release APK (signing, versionCode, distribution directe) dans `.ai/SPECS/`.
5. Décision produit enregistrée dans ce fichier (section 3) → statut passe à DÉCIDÉ.

### Branche B (export statique) — si la décision produit l'exige
1. **Spike 1 j** : config `next.config.capacitor.ts` (export) + build de `out/` + APK smoke test (page d'accueil rendue hors serveur).
2. **Auth hybride** : (a) Bearer token session custom côté client (store zustand) ; (b) `resolveRequestUser` accepte `Authorization: Bearer <sessions.token>` ; (c) cookie fallback conservé pour le web.
3. **CORS** : middleware ou `next.config` headers pour `capacitor://localhost` / `https://localhost` sur `/api/*`.
4. Migrer les appels via la couche `services/` (ADR-0003) pour un point unique de branchement.
5. Tests : e2e APK (login SMS, login email, paiement initiate, signature, offline), publication TestFlight/internal testing.

---

## 6. Conséquences (reco A)

**Positives** : aucun chantier lourd engagé sur hypothèse non validée ; le risque auth SMS n'est pas doublé pendant que la Phase 2 de ADR-0002 est en cours ; updates instantanées.

**Négatives / risques acceptés** : dépendance réseau (atténuée par `offline.html` + splash natif) ; rejet store possible le jour d'une publication publique — c'est précisément le scénario qui déclencherait la bascule B ; le plugin code reste à moitié câblé (`NEXT_PUBLIC_CAPACITOR_API_URL` inutilisé) jusqu'à décision.

---

## 7. Références

- `.ai/ANALYSES/1-a-structure-stack.md` §2 (Mobile Capacitor), §9.2 (friction #2), §7 (env manquante)
- `.ai/ANALYSES/1-c-backend-api-securite.md` §2 (double session, `resolveRequestUser`)
- `.ai/ARCHITECTURE.md` §2 (A5), §4 (T3)
- `.ai/ADRs/ADR-0002-autorisation.md` (identité sessions SMS), `.ai/ADRs/ADR-0003-data-layer.md` (couche services)
- `capacitor.config.ts`, `next.config.ts`, `src/lib/capacitor.ts`, `src/lib/auth-fetch.ts`, `package.json` (scripts cap:*)
