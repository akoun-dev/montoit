# ADR-0002 — Autorisation : 100 % applicatif (service_role) vs hybride RLS + JWT

| | |
|---|---|
| **Task ID** | 4-g (Sprint 3) |
| **Agent décideur** | TECH LEAD & ARCHITECTE (Agent 1) |
| **Date** | 2026-10-26 |
| **Statut** | ✅ **DÉCIDÉ** (arbitré par le Tech Lead — recommandation ferme ; conditionne S1–S4) |
| **Tags** | sécurité, autorisation, rls, jwt, supabase, service_role |
| **Supersede** | Choix structurant A2/A3 (`.ai/ARCHITECTURE.md` §2), dette S2/S4, vulnérabilités V2/V4/V5/V19 (analyse 1-c) |

---

## 1. Contexte

### 1.1 Constat chiffré (métriques vérifiées sur la branche 4.0.0, commit `d206a4b`)

| Métrique | Valeur mesurée | Commande de vérification |
|---|---|---|
| Fichiers `route.ts` | **162** | `rg --files src/app/api -g 'route.ts' \| wc -l` |
| Fichiers utilisant le client `service_role` | **147** (387 occurrences de `getSupabaseAdminClient`) → **RLS bypassée par design** | `rg -c getSupabaseAdminClient src/app/api` |
| Fichiers passant par `resolveRequestUser` | **146** (les 16 restants : 11 `/api/auth/*` publiques + `/api/stats` + `properties/[id]/inventory-reports` + `payments/callback` + `signature/auth` + route racine) | `rg -l resolveRequestUser src/app/api \| wc -l` |
| Fichiers de routes touchant `users` | **119** | `rg -l "from\('users'\)" src/app/api` |
| Fichiers touchant `leases` | **45** | idem |
| Fichiers touchant `payments` | **18** | idem |
| Fichiers touchant `otp_codes` | **13** | idem |
| Fichiers touchant `sessions` | **3** | idem |
| Policies RLS existantes | 247 policies sur ~49 tables, **mais jamais évaluées** pour les appels applicatifs (service_role bypass) | 1-e |
| Vérification JWT réelle | `resolveRequestUser` → `supabase.auth.getUser()` ✔ **MAIS fallback `getSession()` non vérifié** (🔴 V2/S2 : cookies forgesables → usurpation, y compris ADMIN, sur 146 routes) | 1-c §2 |

### 1.2 Pourquoi le statu quo n'est pas défendable

1. **La clé `anon` est publique** (embarquée dans le client). Avec les policies actuelles (`users_insert_anon with check (true)`, `users_update_own` sans restriction de colonnes), quiconque parle directement à l'API REST Supabase peut insérer un profil `role='ADMIN'` ou s'auto-promouvoir (🔴 V4/S4) — **sans jamais toucher l'app**.
2. **La sécurité 100 % applicative** repose sur 387 points d'appel scoppés à la main : une seule omission = fuite inter-tenants (baux, paiements, pièces KYC).
3. **Le fallback `getSession()`** rend la vérification d'identité forgeable (V2) — correctif SEC-002 Sprint 0.

---

## 2. Options considérées

| Option | Description | Verdict |
|---|---|---|
| **A — Statu quo 100 % applicatif** | Rester en service_role partout ; durcir uniquement le code (whitelists, scoping). | ❌ Rejeté : la surface d'attaque par la clé anon reste ouverte (V4), 387 points à auditer à chaque revue, aucune défense en profondeur. |
| **B — RLS totale (tout en JWT + policies, zéro service_role)** | Réécrire 247 policies + basculer 147 routes sur le client SSR. | ❌ Rejeté : effort massif (~3–5 semaines), régression quasi certaine sur les flux admin/webhook/cron qui **ont besoin** du service_role, inopportun pendant le Sprint 0. |
| **C — Hybride par phases** | RLS **réelle et testée** sur les tables sensibles (Phase 1 : identité/auth ; Phase 2 : argent/baux) + JWT vérifié partout + service_role strictement réservé aux flux système (webhooks, crons, Edge Functions, opérations ADMIN). | ✅ **Retenu.** |

---

## 3. Décision

**Modèle hybride en 3 phases**, aligné sur le Sprint 0 en cours (7 agents en parallèle) :

### Phase 1 — Tables identité/auth (⚠️ en cours, Sprint 0)
Couverture : **`users`, `otp_codes`, `sessions`** (+ tables PII KYC : `facial_verifications`, `oneci_verifications`, `signature_aliases`).
- **`users` : c'est exactement la migration SEC-004 écrite en parallèle par l'agent 4-b** (policies `users` durcies : suppression de `insert anon with check (true)`, `update own` restreint colonne par colonne, trigger `prevent_role_self_escalation`). **ADR-0002 endosse et verrouille le périmètre de SEC-004** : l'agent 4-b est propriétaire de la migration SQL, aucun autre agent n'y touche.
- Étendre le même traitement à `otp_codes` (select/update own uniquement, pas de list cross-user) et `sessions` (select/delete own par `user_id`).
- **Coût de migration côté routes : ZÉRO.** Les 147 routes continuent d'appeler `getSupabaseAdminClient()` : le service_role reste légitime côté serveur. Le gain est que **la clé anon et l'API REST directe deviennent inoffensives** (défense en profondeur), et qu'une régression de scoping applicatif ne se traduit plus par une escalade de rôle.

### Phase 2 — Tables argent/habitat (Sprint 2–3)
Couverture : **`payments` (18 fichiers de routes), `leases` (45 fichiers)**, puis `mandats`/`deposit_refunds`/`payment_attempts`.
- Introduction d'un **client SSR par route** (`createRouteHandlerSupabaseClient` — JWT/cookie Supabase résolu, RLS évaluée) pour les handlers **user-scoped en lecture/écriture de leur propre périmètre**.
- Estimation : parmi 18 + 45 = 63 fichiers, **~35–45 handlers** sont user-scoped (le reste = ADMIN, webhooks, crons → restent service_role) ; effort ~0,5–1 j/handler (policies + test de non-fuite), soit **~20–30 j étalés**, à tronçonner par domaine via les PR de ADR-0003.
- **Garde-fou obligatoire par handler migré** : test de fuite inter-tenants (2 fixtures users, requête croisée doit renvoyer 403/404) avant merge.
- Prérequis : SEC-002 (suppression du fallback `getSession()`) — sinon le client SSR hérite du même contournement.

### Phase 3 — Généralisation (optionnelle, hors périmètre de cette décision)
Étendre le modèle domaine par domaine, piloté par la migration du data-layer (ADR-0003). Non planifiée à date.

### Règle de gouvernance (immédiate, coût ~0)
- **`getSupabaseAdminClient()` n'est autorisé que pour** : webhooks signés (`payments/callback`), crons/Edge Functions, opérations ADMIN (backups, modération), écritures cross-tenant légitimes,Seed/admin-outillage. Tout autre usage doit être justifié en review.
- Nouvelle route API ⇒ reviewer systématiquement la question « quel client, quel scoping, quelle policy l'encadre ? » (ajout au checklist de l'AGENT REVIEWER).

---

## 4. Impacts chiffrés

| Poste | Valeur |
|---|---|
| Routes à modifier en Phase 1 | **0** (défense en profondeur au niveau DB uniquement) |
| Migration SQL Phase 1 | **SEC-004 (agent 4-b, en cours)** : policies `users` durcies + trigger anti-escalade ; à étendre à `otp_codes` + `sessions` (~2 migrations supplémentaires, ~0,5 j) |
| Routes candidates Phase 2 | 63 fichiers (`payments` 18 + `leases` 45) → ~**35–45 handlers** user-scoped à basculer sur client SSR |
| Effort Phase 2 | ~**0,5–1 j/handler** (policies + tests de non-fuite) → 20–30 j étalés, par domaines |
| Vérification JWT | Déjà en place via `resolveRequestUser` (146 routes) ; coût marginal = SEC-002 (suppression fallback `getSession()`, ~0,5 j, Sprint 0) |
| Sessions SMS custom | **Non couvertes par JWT Supabase** : en Phase 2, les handlers migrés reçoivent soit le JWT (users email), soit — pour les sessions SMS — un **repli explicite** : le handler doit résoudre la session custom et exécuter la requête avec un client authentifié équivalent (ou garder service_role avec scoping code + policy de secours). Ce point est le principal coût caché de la Phase 2. |

---

## 5. Conséquences

**Positives** :
- Ferme V4/S4 (escalade ADMIN par la clé anon) dès la Phase 1, sans toucher les routes.
- Défense en profondeur : une régression de scoping applicatif est rattrapée par la policy.
- Surface d'audit réduite : les revues se concentrent sur les flux système (webhooks/crons/admin), seuls consommateurs légitimes du service_role.
- Cohérence avec 1-e reco #2 (« réduire la surface service_role ») et avec SEC-004.

**Négatives / risques acceptés** :
- **Double modèle** (policies + code) à documenter : risque de confusion « où est la vérité ? ». Réponse : la policy est la 2ᵉ ligne de défense, le code reste responsable du scoping métier fin (ex. `canMessageParticipant`).
- Phase 2 : le traitement des **sessions SMS** (sans JWT) complexifie les bascules → chaque handler migré doit choisir explicitement son chemin d'identité ; à traiter handler par handler, jamais en masse.
- Risque de régression fonctionnelle si une policy est plus stricte que le scoping code → d'où le test de non-fuite **et** un test fonctionnel par handler migré.

---

## 6. Alternatives écartées (détail)

- **A (statu quo)** : rejeté — la chaîne d'exploitation complète V4 est documentée (insert anon → `role='ADMIN'` → session SMS → 30 j d'accès ADMIN sur 146 routes).
- **B (RLS totale)** : rejeté — réécriture de 247 policies + 147 routes en pleine période de features ; les Edge Functions (26) et les 6 crons ANSUT consomment de toute façon le service_role (`_shared/supabase-admin.ts`), l'option B ne les supprime pas.
- **JWT-only custom (émettre nos propres JWT pour les sessions SMS)** : intéressant à terme mais incompatible avec la durée 30 j des sessions custom sans refonte refresh ; rejeté pour cette itération (à réévaluer si le produit exige une session unifiée).

---

## 7. Plan de migration (résumé exécutif)

1. **Sprint 0 (en cours)** : SEC-002 (kill fallback `getSession`) + **SEC-004 (agent 4-b : policies `users` durcies + trigger)** — ADR-0002 les endosse.
2. **Semaine suivante** : migration d'extension Phase 1 — policies `otp_codes`, `sessions`, PII KYC (0.5 j, agent backend, hors périmètre 4-b).
3. **Sprint 2–3** : Phase 2 par domaines — commencer par `payments` (18 fichiers, surface la plus sensible), un PR = un handler + son test de non-fuite ; synchronisé avec la migration React Query (ADR-0003) qui restructure déjà ces appels.
4. **Continu** : checklist reviewer « client × scoping × policy » ; registre des handlers restés en service_role (tableau dans ce fichier, maintenu à jour).

---

## 8. Références

- `.ai/ANALYSES/1-c-backend-api-securite.md` — V1/V2/V4/V5/V19, §2 (architecture auth), §5 (plan)
- `.ai/ANALYSES/1-e-donnees-supabase.md` §0/§8 (risque #2 service_role), §9 reco 2
- `.ai/ARCHITECTURE.md` §2 (A2/A3), §4 (S2, S4)
- Sprint 0 : SEC-002, SEC-004 (TASKS.xlsx ; agent 4-b en cours d'écriture de la migration `users`)
- `.ai/ADRs/ADR-0003-data-layer.md` (couches services — vecteur d'application de la Phase 2)
