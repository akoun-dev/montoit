# ADR-0003 — Data-layer : React Query + services par acteur

| | |
|---|---|
| **Task ID** | 4-g (Sprint 3) |
| **Agent décideur** | TECH LEAD & ARCHITECTE (Agent 1) |
| **Date** | 2026-10-26 |
| **Statut** | ✅ **DÉCIDÉ** (arbitré par le Tech Lead — adoption progressive à partir de FE-003) |
| **Tags** | data-layer, react-query, services, realtime, frontend, types |
| **Supersede** | Choix structurant A1/règle 2 (`.ai/ARCHITECTURE.md` §3), écarts E10 (1-d), dette T7 (realtime), T6 (formulaires, hors périmètre) |

---

## 1. Contexte

### 1.1 Constat chiffré (métriques vérifiées sur la branche 4.0.0, commit `d206a4b`)

| Métrique | Valeur mesurée | Vérification |
|---|---|---|
| `authFetch` (fetch impératif + `useState` + cache maison `response-cache.ts`) | **553 occurrences / 114 fichiers** (audit 1-d : 103 fichiers composants ; recomptage inclut lib, hooks realtime, tests) | `rg -c authFetch src` |
| React Query (@tanstack/react-query ^5, installé) | **4 usages réels** (`useQuery`/`useMutation`) dans 4 écrans locataire : `overview`, `my-visits`, `visit-detail`, `applications` ; infra prête (`query-provider.tsx` staleTime 60 s / gcTime 5 min / retry 1, `use-query-helpers.ts`, `use-cached-fetch.ts`) → 6 fichiers importent le package | `rg -l @tanstack/react-query src` |
| Realtime Supabase | **25 hooks `use-realtime-*.ts`** + 2 canaux dans `lib` (`notification-store`, `notification-toast-provider`) = **27 canaux `supabase.channel()`** ; les callbacks font refetch/setState **manuel**, jamais d'invalidation de cache | `ls src/hooks/use-realtime-*.ts` ; `rg -l "supabase\.channel\(" src` |
| Publication realtime DB | **13 tables** dans `supabase_realtime` vs **26 écoutées** → **15 hooks inopérants en production** (fraud_alerts, ratings, disputes, users, properties…) — T7 | 1-e §5 |
| Cache doublonné | `response-cache.ts` (SWR in-memory maison) **ET** React Query coexistent | `src/lib/response-cache.ts` |
| Types | `types.ts` hand-written **20/51 tables**, 841 `as any` → prérequis bloquant pour des hooks typés | 1-e §1.1 (S9) |
| Séparation par acteur | Respectée ~90 % (`dashboard/{locataire,proprietaire,agence,tc,admin}`) → le découpage services par acteur s'aligne naturellement | 1-d §10.5 |

### 1.2 Problème

Trois vitesses de data-layer cohabitent (E10) : chaque écran réimplémente fetch + loading + error + refresh + realtime (239 spinners vs 36 skeletons, 57 empty strings inline — 1-d §6), le cache maison est invisible pour React Query (risque d'états divergents entre acteurs), et la moitié du temps réel est morte sans que personne ne s'en aperçoive.

---

## 2. Options considérées

| Option | Description | Verdict |
|---|---|---|
| **A — Statu quo authFetch + cache maison** | Continuer à fetcher impérativement dans les composants. | ❌ Rejeté : duplication systématique (114 fichiers), realtime mort, aucun cache partagé cohérent. |
| **B — Migration totale immédiate vers React Query** | Convertir les 114 fichiers d'un coup. | ❌ Rejeté : ~15 j concentrés + risque régression sur 103 sections pendant le Sprint 0 ; dépend du travail de l'agent 4-c (types régénérés) pas encore livré. |
| **C — Adoption progressive, nouveaux écrans en React Query, migration par domaine** | Infra déjà en place (provider + helpers) ; coexistence encadrée ; hooks realtime convertis en invalidation au fil de l'eau. | ✅ **Retenu.** |

---

## 3. Décision

Adopter **React Query + services par acteur** comme cible du data-layer, avec coexistence planifiée. À partir de **FE-003**, tout nouveau développement de données suit l'architecture cible ci-dessous.

### 3.1 Architecture cible

```
composant (UI) 
   └→ hook React Query typé        src/hooks/<acteur>/use-<domaine>.ts
        queryKey: ['<domaine>', id?, filtres?]
        queryFn : fonction du service
   └→ service par acteur           src/services/<acteur>/<domaine>.ts
        fonctions pures typées (in/out), seules à appeler authFetch
   └→ API routes /api/**           (inchangées — cf. ADR-0002 pour le client DB)
```

- **`src/services/<acteur>/`** : 1 fichier par domaine métier (`payments.ts`, `leases.ts`, `rental-files.ts`…). Un service n'importe aucun composant, ne connaît pas React ; il renvoie des types issus de `src/lib/supabase/types.ts` **régénéré par l'agent 4-c** (prérequis : `supabase gen types typescript --linked`, S9).
- **`src/hooks/<acteur>/use-*.ts`** : enveloppes `useQuery`/`useMutation` typées ; mutantes renvoyant les codes d'erreur métier normalisés (fin des 57 strings inline côté erreurs).
- **`queryKeys` normalisées** : `['<domaine>', scope, id?, filtres?]` — domaine = table/ressource (ex. `['payments', 'lease', leaseId]`). Registre des queryKeys tenu dans `src/lib/query-keys.ts`.
- **Realtime = invalidation, plus de setState manuel** : chaque `use-realtime-<table>` devient `useQueryClient().invalidateQueries(['<domaine>'])` dans le callback `postgres_changes`. Les 25 hooks existants sont conservés comme canaux (pattern sain, 1-d §8) mais leur callback se réduit à l'invalidation.
- **Prérequis data (agent backend, T7)** : compléter la publication `supabase_realtime` avec les **15 tables manquantes** — sinon l'invalidation realtime des domaines ratings/disputes/users/properties restera morte même après migration.

### 3.2 Stratégie de coexistence (règles applicables dès maintenant)

| Règle | Contenu |
|---|---|
| **R1 — Nouveau code** | Toute nouvelle section/écran branche ses données via un service + hook React Query. Interdiction d'appeler `authFetch` directement depuis un composant. |
| **R2 — Boy-scout** | Un écran touché par une évolution fonctionnelle est migré vers l'architecture cible **dans le même PR** (si son domaine a un service ; sinon créer le service du domaine en même temps). |
| **R3 — Migration par domaine** | Ordre : **Locataire** (4/22 sections déjà en React Query — le reste de l'acteur sert de socle) → **Propriétaire** (23 sections, surface paiements/leases = aussi le terrain de la Phase 2 de ADR-0002, synergies) → **TC** (27) → **Agence** (16) → **Admin** (15) → `shared/`. |
| **R4 — Un seul cache à la fois par écran** | Les écrans migrés désactivent `response-cache.ts` pour leurs URLs (React Query est l'unique cache) ; `response-cache.ts`/`use-cached-fetch.ts` sont supprimés quand le dernier consommateur disparaît. |
| **R5 — Formulaires** | Les gros formulaires migrés adoptent react-hook-form + zod dans le même mouvement (déjà installés, 0 usage — T6) ; schémas zod partagés avec les API routes quand la validation serveur (Zod, 1-c §5.4) arrive. |

---

## 4. Impacts chiffrés

| Poste | Valeur |
|---|---|
| Périmètre total de migration | 103 sections + ~30 fichiers `lib`/hooks consommateurs de `authFetch` |
| Effort par acteur de dashboard | **~2–4 j** (22–27 sections : création services + hooks + invalidation realtime) → **~10–15 j au total**, étalés par domaines via R2/R3 |
| Écrans déjà conformes | 4 (locataire overview, my-visits, visit-detail, applications) |
| Hooks realtime à convertir | 25 + 2 canaux lib |
| Prérequis bloquant | types.ts régénéré (**agent 4-c**, en cours) — sans lui, les hooks « typés » ne sont que cosmétiques (841 `as any`) |
| Prérequis data | publication realtime +15 tables (T7) pour que l'invalidation fonctionne en prod |

---

## 5. Critère de complétude (definition of done)

La migration est déclarée **complète** quand les 4 conditions sont mesurables :

1. **0 appel `authFetch` direct dans `src/components`** (réservé à `src/services/**`) — mesurable par grep : `rg -l authFetch src/components` → 0 fichier.
2. **Chaque domaine métier des 5 acteurs a** un service dans `src/services/<acteur>/` + hooks React Query typés + queryKeys enregistrées.
3. **Les 27 canaux realtime** n'émettent plus que des `invalidateQueries` (0 `setState` métier dans un callback realtime) et la publication DB couvre 26/26 tables.
4. **`response-cache.ts` et `use-cached-fetch.ts` supprimés** (cache unique = React Query).

Métrique de progression à ajouter au worklog de chaque sprint : `rg -c "authFetch" src/components | wc -l` (114 → objectif 0) et nombre de services créés par acteur.

---

## 6. Conséquences

**Positives** :
- Fin du clonage fetch/useState/realtime par écran ; états loading/error/empty unifiables (base des composants `EmptyState`/`ErrorState` recommandés en 1-d §12.3).
- Cache cohérent, refetch contrôlés, déduplication — prérequis à la dégradation gracieuse obligatoire (règle architecture #4).
- La couche `services/` est le vecteur naturel de la Phase 2 de ADR-0002 (client SSR + RLS) : un seul chantier de réécriture au lieu de deux.
- Réduit le coût de la future migration App Router (ADR-0001) : les composants deviennent transportables.

**Négatives / risques acceptés** :
- **Double cache pendant la transition** (response-cache + React Query) — mitigé par R4.
- Types drift (S9) rend les premiers hooks « typés » partiellement fake tant que l'agent 4-c n'a pas livré → ne pas migrer `payments`/`leases` avant la livraison types.
- Effort long (10–15 j) étalé : risque d'abandon en route — mitigé par la règle R2 (migration embarquée dans les évolutions produit, pas un chantier dédié).

---

## 7. Plan de migration (résumé)

1. **Prérequis** : agent 4-c livre `types.ts` régénéré + publication realtime complétée (agent backend, T7).
2. **FE-003 (déclencheur)** : création des squelettes `src/services/{locataire,proprietaire,agence,tc,admin,shared}/` + `src/lib/query-keys.ts` + guide 1 page dans `.ai/SPECS/`.
3. **Lot Locataire** : services `properties`, `rental-files`, `payments`, `visits`, `messages` ; conversion des 18 sections restantes + 7 hooks realtime consommés par l'acteur.
4. **Lots suivants** : Propriétaire (avec bascule client SSR des handlers payments/leases — Phase 2 ADR-0002 dans le même mouvement), TC, Agence, Admin, `shared/` (E1–E4 déplacés d'abord en `dashboard/shared/`).
5. **Cleanup** : suppression `response-cache.ts`, `use-cached-fetch.ts`, `use-query-helpers.ts` (absorbé), fermeture du registre queryKeys.

---

## 8. Alternatives écartées (détail)

- **SWR au lieu de React Query** : React Query est déjà installé + provider branché + 4 usages ; ajouter une 4ᵉ lib de data serait une régression.
- **Services sans React Query (juste couche services + authFetch)** : résout la duplication d'accès mais pas le cache/invalidation/realtime, cœur du problème E10.
- **Supabase client direct dans les hooks** (bypass des API routes) : casse l'API-first (règle architecture #3), contournerait la validation serveur à introduire (Zod) et referait courir le risque service_role côté client (anon key + policies actuelles, cf. ADR-0002 Phase 1 seulement partielle). Écarté sauf exceptions documentées (temps réel uniquement).

---

## 9. Références

- `.ai/ANALYSES/1-d-frontend-ux-acteurs.md` §8 (realtime), §10.4 (E10), §12 (recos 4/5)
- `.ai/ANALYSES/1-e-donnees-supabase.md` §5 (publication realtime, 15 tables), §1.1 (types drift S9)
- `.ai/ARCHITECTURE.md` §3 (règle 2 couches), §4 (S9, T6, T7)
- `.ai/ADRs/ADR-0002-autorisation.md` (Phase 2 — vecteur services)
- Tâche FE-003 (TASKS.xlsx) ; livrable types agent 4-c (Task 4-c, en cours)
