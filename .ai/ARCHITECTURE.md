# 🏗️ ARCHITECTURE — Mon Toit CI (branche 4.0.0)

**Document tenu par** : AGENT 1 (Tech Lead) · **Dernière MAJ** : 2026-10-26 (post-analyse Phase 1)

## 1. Vue d'ensemble (constatée)

```
Capacitor (iOS/Android) ─┐
Visiteurs web ───────────┼→ Next.js 16 (port 3000, output standalone)
                         │   ├─ page.tsx unique 'use client' → SPA 16 vues (Zustand persisté)
                         │   │    └─ 103 sections dashboard dispatchées par activeRole
                         │   └─ 162 routes API (/api/**, 39 domaines, ~215 handlers)
                         │         └─ resolveRequestUser() + getSupabaseAdminClient() (service_role)
                         ├─ middleware.ts : gating par préfixes + rôles (JWT uniquement)
                         ↓
Supabase (monorepo supabase/)
├─ Postgres : 51 tables, 36 enums, 247 policies RLS, 85 migrations
├─ Auth : double système (Supabase Auth JWT + sessions SMS custom cookie `montoit-session`)
├─ Realtime : 15+ tables (⚠️ publication supabase_realtime à confirmer) → 25 hooks use-realtime-*
├─ Storage : buckets photos biens / KYC / documents (⚠️ plusieurs publics)
└─ 26 Edge Functions (Deno) : Intouch (5), CRYPTONEO (8), KYC RNPP/NeoFace (6), crons ANSUT (6), _shared
         ↓
APIs externes : Intouch (Orange/MTN/Moov/Wave) · CRYPTONEO (signature certifiée) · RNPP Connect
(remplace ONECI) · NeoFace (KYC facial) · ANSUT (SMS/Email OTP) · Azure OpenAI (chatbot SUTA)
```

## 2. Choix structurants & contraintes

| # | Décision constatée | Implication |
|---|---|---|
| A1 | **SPA mono-route** (`page.tsx` + Zustand `currentView`) | Bundle unique, SEO faible, 1 point de couplage central (`dashboard/index.tsx`) |
| A2 | **Accès DB 100% service_role** (147 routes / 387 usages) | RLS contournée systématiquement → sécurité 100% applicative |
| A3 | **Double auth** (Supabase JWT + session SMS custom) | Le middleware ne vérifie que la présence du cookie ; la vraie autorisation est dans chaque handler |
| A4 | **Métier dupliqué** lib/ ↔ Edge Functions `_shared/` (cryptoneo, intouch, oneci/rnpp) | Risque de divergence des règles |
| A5 | **Capacitor** charge l'URL distante (`mon-toit.ansut.ci`) ; `BUILD_TARGET=capacitor` no-op | Build APK statique cassé (webDir `out` jamais produit) |
| A6 | **Types TS hand-written** couvrant 20/51 tables, aucun `supabase gen types` | Drift TS/DB critique, 841 `as any` |
| A7 | Design system **shadcn/ui + Tailwind v4** (@theme globals.css) ; `tailwind.config.ts` v3 legacy résiduel | Vérité du thème dans globals.css |

## 3. Règles d'architecture cibles (rappels du protocole)

1. **Séparation par acteur** (composants/hooks/services/types) : `shared/` vs dossiers acteurs — respectée à ~90% ; 4 imports croisés à mutualiser (E1), composants morts à purger (E3).
2. **Séparation des couches CRUD** : UI → hooks → services → API routes → (Edge Functions externes si besoin) → Supabase. ⚠️ Constat : data-layer à 3 vitesses (`authFetch` 103 fichiers, React Query 4 usages, callbacks realtime) → à unifier progressivement vers React Query + services.
3. **API-first** : aucune logique métier dans les composants ; Zod à introduire sur les routes mutantes (actuellement ~0).
4. **Dégradation gracieuse** obligatoire (états loading/error/empty mutualisés — actuellement 239 spinners vs 36 skeletons, 57 strings inline).

## 4. Registre de dette technique (issu des analyses 1-a → 1-e)

| ID | Dette / Risque | Criticité | Source |
|---|---|---|---|
| S1 | Escalade ADMIN à l'inscription (role non whitelisté serveur) | 🔴 P0 | 1-c |
| S2 | Fallback `getSession()` non vérifié dans resolveRequestUser | 🔴 P0 | 1-c |
| S3 | Webhook paiement fail-open (HMAC optionnel, GET non signé) | 🔴 P0 | 1-c |
| S4 | Policies RLS `users` permissives (insert anon check(true)) | 🔴 P0 | 1-c/1-e |
| S5 | Secret ONECI en clair dans worklog.md tracké git → rotation + purge | 🔴 P0 | 1-b |
| S6 | Buckets Storage publics sensibles (baux signés, KYC) | 🟠 P1 | 1-e |
| S7 | OTP non hashés dans leases (otp-hash.ts non branché partout) + rate-limit absent | 🟠 P1 | 1-c |
| S8 | Edge Functions sans verify_jwt (retrieve-certificates, signature-auth, crons) | 🟠 P1 | 1-e |
| S9 | types.ts drift (20/51 tables) + 841 `as any` | 🔴 P0 | 1-e |
| T1 | SPA mono-page : SEO 0 + bundle géant + point de couplage unique | 🔴 P1 (stratégique) | 1-a |
| T2 | Métier dupliqué lib/ ↔ EF _shared/ | 🟠 P1 | 1-a |
| T3 | Build Capacitor cassé (BUILD_TARGET no-op, webDir out absent) | 🟠 P1 | 1-a |
| T4 | Dead deps next-intl / next-auth ; tailwind.config v3 résiduel ; double lockfile ; 12 dossiers vides | 🟡 P2 | 1-a/1-d |
| T5 | 11 Edge Functions planifiées sans cron documenté | 🟠 P1 | 1-b |
| T6 | Formulaires useState manuels (rhf+zod installés et inutilisés) | 🟡 P2 | 1-d |
| T7 | Realtime : 15 tables écoutées hors publication supabase_realtime | 🟠 P1 | 1-e |
| T8 | Ports incohérents (dev 3000 / Playwright+PM2 5000) — e2e cassé en sandbox | 🟡 P2 | 1-a |
| T9 | Aucune CI (lint/tsc/tests/secrets) | 🟠 P1 | 1-a |
| T10 | Transferts d'argent sans plafond ; uploads sans validation magic bytes | 🟠 P1 | 1-c |

## 5. ADRs à formaliser (dossier .ai/ADRs/)
- **ADR-0001** : stratégie de routing — pérenniser la SPA mono-route vs migration progressive App Router par acteur (impact SEO/perf/complexité). *Statut : PROPOSÉ — arbitrage requis avant tout nouveau gros écran.*
- **ADR-0002** : modèle d'autorisation — rester 100% applicatif (service_role) vs reintroduire RLS sur les sensibles + JWT vérifié. *Statut : PROPOSÉ — conditionne S1-S4.*
- **ADR-0003** : unification du data-layer frontend (React Query + services par acteur). *Statut : PROPOSÉ.*
- **ADR-0004** : stratégie mobile Capacitor (URL distante vs export statique réel). *Statut : PROPOSÉ.*
