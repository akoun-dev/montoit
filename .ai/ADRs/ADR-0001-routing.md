# ADR-0001 — Routing : SPA mono-route vs App Router par acteur

| | |
|---|---|
| **Task ID** | 4-g (Sprint 3) |
| **Agent décideur** | TECH LEAD & ARCHITECTE (Agent 1) |
| **Date** | 2026-10-26 |
| **Statut** | ✅ **DÉCIDÉ** (arbitré par le Tech Lead — recommandation ferme) |
| **Tags** | routing, seo, performance, frontend, architecture |
| **Supersede** | Choix structurant A1 (`.ai/ARCHITECTURE.md` §2), dette T1 |

---

## 1. Contexte

### 1.1 Constat chiffré (métriques vérifiées sur la branche 4.0.0, commit `d206a4b`)

| Métrique | Valeur mesurée | Source |
|---|---|---|
| Routes Next.js applicatives | **1 seule** : `src/app/page.tsx` (`'use client'`, 210 l., 27 imports directs) | lecture `page.tsx` |
| Vues top-level | **16** switchées par `useAuthStore.currentView` (home, 4 vues bien, 5 vues auth, 6 légaux, dashboard) | `src/lib/auth-store.ts` |
| Sections dashboard (sous-navigation) | **103** dans `dashboard/index.tsx` (327 l.) : **TC 27 · Propriétaire 23 · Locataire 22 · Agence 16 · Admin 15** | `awk` sur les `case '` de `index.tsx` |
| Point de couplage central | 1 fichier routeur (103 `case`) + `sidebar.tsx` (427 l., nav des 5 rôles) | 1-d |
| Code-splitting par route/composant | **0 usage de `next/dynamic`** ; 9 `import()` dynamiques seulement, tous dans `src/lib` (hors vues) | `rg next/dynamic src` → 0 fichier |
| Poids source de la fermeture d'imports client | **≈ 4,7 Mo TS/TSX** : `src/components` 4,06 Mo (dont 3,98 Mo `.tsx`) + `src/lib` 0,38 Mo + `src/hooks` 0,24 Mo + page/layout 12 Ko | `du -ck` |
| Dépendances lourdes réellement importées côté client | framer-motion (**129 fichiers**), leaflet + react-leaflet (8), recharts (1), 24 packages Radix, lucide-react. @mdxeditor : 0 import | rg |
| SEO | Metadata FR complète dans `layout.tsx` mais **aucun contenu SSR** (tout est `'use client'`) → SEO ≈ 0 sur le catalogue de biens | 1-a |
| Maturité fonctionnelle SPA | **~90 %** des parcours cœur (5 acteurs, 103 sections cartographées, aucune section orpheline dans la nav) | 1-b / 1-d |
| Historique navigateur / mobile | Géré manuellement : 2 listeners `popstate` (global + dashboard) coordonnés par convention + `useBackHandler` Capacitor | 1-d §2.3 |

### 1.2 Estimation bundle (méthode et limite)

Le bundle d'entrée embarque **toute** la fermeture d'imports (aucun dynamic import sur les vues) :
- Poids source ≈ 4,7 Mo TS/TSX → estimation après minification (~×0,30) ≈ **1,2–1,4 Mo JS**, soit ≈ **300–400 Ko gzip**, **hors** node_modules (Radix ×24, framer-motion, leaflet, recharts s'ajoutent au shared chunk).
- ⚠️ Estimation déduite du poids source, **pas d'un build production** (`bun run build` interdit dans ce sprint — discipline multi-agents). **Prochaine action : capturer la métrique `First Load JS` du prochain `next build` autorisé** et la reporter dans ce document (section 6).

---

## 2. Options considérées

| Option | Description | Verdict |
|---|---|---|
| **A — Statu quo SPA** | Rien ne change ; le dashboard reste un switch client. | Simple, mais bundle/SEO/couplage ne peuvent qu'empirer (103 → N sections). |
| **B — Migration totale immédiate vers App Router** | Chaque vue/section devient une route Server Component. | ❌ Rejeté : 103 sections + 16 vues à rebrancher, auth-état Zustand à refondre, risque de régression majeur sur un produit à ~90 % de maturité, incompatible avec le Sprint 0 sécurité en cours (7 agents en parallèle). |
| **C — SPA consolidée + migration progressive conditionnelle** | Garder la SPA pour l'application authentifiée (dashboard) ; migrer **en App Router uniquement le périmètre public** (SEO) dès que des critères mesurables se déclenchent ; migration dashboard par lots de 10 sections, jamais en big-bang. | ✅ **Retenu.** |

---

## 3. Décision

1. **Court terme (Sprints 0–3) : la SPA est conservée.** Maturité ~90 %, risque de régression inacceptable pendant la vague sécurité, aucun écran nouveau critique prévu en App Router.
2. **Le périmètre public (SEO) est le premier candidat réel de migration** : 9 vues publiques (`home`, `nos-biens`, `a-propos`, `faq`, `nous-contacter`, `cgu`, `confidentialite`, `mentions-legales`, `cookies`) + `property-detail` = **Lot 0** (~2 j d'effort). C'est là que le SEO a de la valeur (catalogue de biens indexable, URLs partageables `/properties/[id]`).
3. **Le dashboard (103 sections) ne migre que si les critères déclencheurs (§4) s'activent**, par lots de 10 sections (11 lots), dans l'ordre : Locataire (piloté par les 4 usages React Query existants) → Propriétaire → Agence → TC → Admin.
4. **Règle transitoire immédiate** : toute **nouvelle vue de type « page »** (landing campagne, blog, aide publique) est créée **directement en App Router** (cohabitation naturelle, zéro coût rétroactif).

---

## 4. Critères déclencheurs de la migration (métriques observables)

| # | Déclencheur | Seuil mesurable | Action déclenchée |
|---|---|---|---|
| **T1** | Besoin produit SEO confirmé | Trafic organique visé (objectif inscriptions via recherche locale Côte d'Ivoire) validé par le propriétaire produit | **Lot 0** — pages publiques + `/properties/[id]` en SSR/ISR |
| **T2** | Performance dégradée | `First Load JS` > **400 Ko gzip** **ou** TTI > **4 s** sur Android milieu de gamme / 3G throttlée (Lighthouse mobile) | Lot 0 + dynamic imports sur les sections dashboard les plus lourdes (recharts, leaflet) |
| **T3** | Douleur de maintenance | ≥ **2 collisions git/semaine** sur `dashboard/index.tsx` ou `sidebar.tsx` pendant 2 sprints consécutifs | Éclatement routeur/nav par acteur (`sidebar/locataire.tsx`…), préalable léger avant toute migration de routes |
| **T4** | Nouvel acteur ou refonte UX majeure | Décision produit d'un nouvel écran « page » non-dashboard | Création directe en App Router (règle permanente, pas un déclencheur) |

**Mesure T1/T2 à instrumenter dès que possible** : script CI léger qui journalise `First Load JS` à chaque build (conditionné à INF-001 — mise en place CI).

---

## 5. Impacts chiffrés

### Effort de migration par lot de 10 sections

| Lot | Contenu | Effort estimé | Contenu technique |
|---|---|---|---|
| **Lot 0** | 9 vues publiques + property-detail | **~2 j** | Création `src/app/(public)/…` (SSR/ISR), réutilisation des composants `home/*` tels quels, URLs canoniques, sitemap, suppression des vues du store |
| **Lots 1–11** | 103 sections dashboard par tranches de 10 | **~1,5–2 j / lot** (soit 17–22 j au total, jamais consentis d'un bloc) | `src/app/(dashboard)/[role]/[section]/page.tsx` + client components réutilisés ; `dashboardSection` → param de route ; unification des 2 `popstate` ; `generateStaticParams` inutile (tout authentifié) ; e2e Playwright par lot |
| **Total si T1–T3 tous déclenchés** | | **~19–24 j** | Étalés sur 3–4 sprints, un lot = une PR reviewée |

### Ce qui ne bouge PAS en option C
- Les **162 routes API** (aucun impact).
- Les 5 switches restent fonctionnels pendant toute la cohabitation (les sections migrées sont retirées du switch au fil de l'eau).
- Zustand conserve l'état d'auth et les données transverses (notifications, payment-alerts).

---

## 6. Plan de migration (si déclenchée)

1. **J+0 (mesure)** : `next build` autorisé (hors sprint multi-agents) → consigner `First Load JS` réel ici. Sans cette mesure, T2 n'est pas activable.
2. **Lot 0** : `src/app/(public)/page.tsx`, `/nos-biens`, `/a-propos`, `/faq`, `/nous-contacter`, `/cgu`, `/confidentialite`, `/mentions-legales`, `/cookies`, `/properties/[id]` (ISR 5 min). Les vues correspondantes sont retirées de `AppView` au fil de l'eau ; redirect client des anciens états persistés (`zustand persist` → `currentView` orphelins) vers les nouvelles URLs.
3. **Lots 1–11** : un lot = 10 sections du même acteur ; conversion `case → route` ; header/sidebar conservés (layout `(dashboard)/layout.tsx`) ; tests e2e `roles.spec.ts` étendus à chaque lot.
4. **Cleanup final** : suppression de `dashboard/index.tsx` et de la partie dashboard de `page.tsx` ; store d'auth réduit à la session.

---

## 7. Conséquences

**Positives** :
- Zéro risque régression immédiat (rien ne bouge tant que T1–T3 ne se déclenchent pas).
- Décision réversible à faible coût : la migration par lots n'impose aucun engagement initial.
- SEO débloqué à la demande avec ~2 j d'effort (Lot 0).

**Négatives / risques acceptés** :
- Le bundle client reste gros tant que la SPA couvre le dashboard (dette T1 maintenue, **acceptée**).
- Cohabitation de deux paradigmes de navigation (AppView vs routes) pendant la transition → documenter la règle « nouvelle page = App Router » dans le guide contrib.
- `popstate` : les 2 listeners restent fragiles jusqu'à unification (noté T-risque dans 1-d §2.3).

---

## 8. Alternatives écartées

- **B (migration totale immédiate)** : coût 19–24 j concentrés + régressions probables sur 103 sections testées à ~0 (couverture vitest exclut `src/hooks` et les API ; e2e = 2 specs seulement).
- **Auto-hébergement d'un framework alternatif / rewrite Remix-SSR** : hors de proportion, aucun gain face à l'option C.
- **Pré-rendu statique des pages publiques via revalidation on-demand uniquement** : sous-ensemble de l'option C (ISR du Lot 0), conservé comme détail d'implémentation.

---

## 9. Références

- `.ai/ANALYSES/1-a-structure-stack.md` §1 (SPA mono-page), §9.1 (friction majeure #1)
- `.ai/ANALYSES/1-d-frontend-ux-acteurs.md` §2 (modèle de navigation), §9 (103 sections), E9/E10
- `.ai/ARCHITECTURE.md` §2 (A1), §4 (T1)
- `.ai/TEAM_STATUS.md` — Décisions en attente d'arbitrage (ADR-0001)
