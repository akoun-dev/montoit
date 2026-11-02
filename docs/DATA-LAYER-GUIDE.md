# Guide Data-Layer — React Query + services par acteur

> Référence normative : **ADR-0003** (`.ai/ADRs/ADR-0003-data-layer.md`) — décision React Query + `src/services/<acteur>/`, adoption progressive depuis FE-003. En cas de divergence, l'ADR prime ; ce guide est le mode opératoire pratique.

## 1. Architecture cible (3 couches)

```
composant (UI, rendu seul)
   └→ hook React Query typé        src/hooks/<acteur>/use-<domaine>.ts
        queryKey  : issue du registre src/lib/query-keys.ts (jamais inline)
        queryFn   : fonction du service
   └→ service par acteur           src/services/<acteur>/<domaine>.ts
        fonctions pures typées (in/out), seules à appeler authFetch
        skipCache: true sur les GET (R4 — React Query = unique cache)
   └→ API routes /api/**           (inchangées — cf. ADR-0002 pour le client DB)
```

Exemple de référence (domaine pilote FE-003) :
- `src/services/proprietaire/finances.ts`
- `src/hooks/proprietaire/use-owner-finances.ts` / `use-owner-analytics.ts`
- `src/components/dashboard/proprietaire/finances.tsx` (écran migré)

## 2. Règles (résumé ADR-0003 §3.2)

| Règle | Contenu |
|---|---|
| **R1 — Nouveau code** | Tout nouvel écran branche ses données via service + hook React Query. **Interdit** d'appeler `authFetch` directement dans un composant. |
| **R2 — Boy-scout** | Un écran touché par une évolution est migré dans le même PR (créer le service du domaine au besoin). |
| **R3 — Migration par domaine** | Ordre : Locataire → Propriétaire → TC → Agence → Admin → shared/. |
| **R4 — Cache unique** | Écrans migrés : `skipCache: true` (désactive response-cache.ts pour ces URLs). |
| **R5 — Formulaires** | Les gros formulaires migrent vers react-hook-form + zod dans le même mouvement. |

## 3. Créer un service (`src/services/<acteur>/<domaine>.ts`)

1. Un fichier par domaine métier (`payments.ts`, `leases.ts`, `rental-files.ts`…).
2. Le service **n'importe aucun composant, ne connaît pas React**.
3. Types in/out : DTO reflétant le contrat de la route `/api/**` + types du schéma depuis `@/lib/supabase/types` (ex. `Database['public']['Enums']['payment_status']`). Ne redéclare pas les types de table.
4. Réutilise l'utilitaire existant `authFetch` (`@/lib/auth-fetch`) — ne réinvente jamais le wrapper (401/5xx/timeout/Capacitor déjà gérés).
5. GET → `{ skipCache: true }` (R4). Les erreurs sont levées (`AuthError`) : le service ne les avale pas.

```ts
import { authFetch } from '@/lib/auth-fetch'

export interface MyDomainData { /* contrat de /api/... */ }

export async function getMyDomain(filters?: MyFilters): Promise<MyDomainData> {
  const qs = filters ? `?${new URLSearchParams(...)}` : ''
  return authFetch<MyDomainData>(`/api/...${qs}`, { skipCache: true })
}
```

## 4. Créer un hook (`src/hooks/<acteur>/use-<domaine>.ts`)

1. `'use client'` en tête.
2. queryKey **exclusivement** depuis `src/lib/query-keys.ts`.
3. `staleTime` adapté au domaine (30 s défaut global, `src/components/providers/query-provider.tsx` ; 5 min pour agrégats stables…).
4. `enabled` pour différer tant que la session n'est pas prête.
5. Expose le résultat `useQuery` tel quel + un sélecteur d'erreur `xxxErrorMessage(error)`.

```ts
'use client'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getMyDomain } from '@/services/<acteur>/<domaine>'

export function useMyDomain(filters?: MyFilters, options?: { enabled?: boolean }) {
  return useQuery<MyDomainData, Error>({
    queryKey: queryKeys.<domaine>.<scope>(filters),
    queryFn: () => getMyDomain(filters),
    staleTime: 30_000,
    enabled: options?.enabled,
  })
}
```

Dans l'écran :

```ts
const myQuery = useMyDomain(filters, { enabled: isAuthenticated })
const { data, isLoading, error } = myQuery
const errorMessage = myDomainErrorMessage(error)

if (isLoading) return <LoadingState variant="detail" />
if (error || !isAuthenticated || !data) {
  return <ErrorState description={errorMessage ?? undefined} retry={() => myQuery.refetch()} />
}
```

## 5. Query keys (`src/lib/query-keys.ts`)

Format normalisé : `['<domaine>', scope, id?, filtres?]`.

- Toute nouvelle clé DOIT être enregistrée dans le registre (aucune clé inline).
- `queryKeys.<domaine>.all` sert aux invalidations larges ; les clés hiérarchiques (`list`, `detail(id)`, `owner(filters)`) permettent l'invalidation partielle.

## 6. Realtime = invalidation, plus de setState manuel

Chaque `use-realtime-<table>` reste le canal (pattern sain), mais son callback se réduit à :

```ts
const queryClient = useQueryClient()
useRealtimePayments({
  userId: user?.id,
  onPaymentChange: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.finances.all })
  },
})
```

Interdit dans un callback realtime : refetch manuel, `setState` métier. Prérequis data (backend, T7) : publication `supabase_realtime` complétée pour les 15 tables manquantes.

## 7. Migration boy-scout d'un écran (checklist)

1. Créer/compléter le service du domaine + DTOs typés.
2. Enregistrer les queryKeys du domaine.
3. Créer le(s) hook(s) `use-*.ts`.
4. Dans l'écran : supprimer `authFetch`/`useState`/`useEffect` de données → hook ; remplacer le spinner/squelette ad-hoc par `LoadingState`, le bloc d'erreur inline par `ErrorState` avec `retry` (`src/components/shared/states/`) ; brancher le realtime sur `invalidateQueries`.
5. Rendu visuel des données **identique** (pas de régression UI) — seuls le chargement/l'erreur/l'approvisionnement changent.
6. `bunx tsc --noEmit` sans nouvelle erreur avant de livrer.

## 8. État d'avancement

- **Migré (React Query)** : locataire `overview`, `my-visits`, `visit-detail`, `applications` (Sprint 1) ; propriétaire `finances` (FE-003, pilote ADR-0003).
- **Hooks prêts, écran à brancher** : propriétaire `analytics` (`use-owner-analytics.ts`).
- **Mesures de progression** (à reporter au worklog de chaque sprint) :
  `rg -l authFetch src/components | wc -l` (objectif 0) et nombre de services créés par acteur.
