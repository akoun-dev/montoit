# AGENTS.md - MonToit Platform

## Commands

- `npm run dev` — Vite dev server on **port 8080** (not default 5173)
- `npm run build` — uses `vite.config.optimized.ts`, not default vite.config.ts
- `npm run typecheck` — runs `tsc --noEmit -p tsconfig.app.json`
- `npm run ci` — runs in order: lint → typecheck → test → build
- `npm run functions:serve` — serve Supabase edge functions with `supabase/.env`

## Testing

- `npm run test` — Vitest unit tests
- `npm run test:security` — uses separate config: `vitest.security.config.ts`
- `npm run test:security:all` — security:run + integration + penetration tests
- Security tests co-located; config at `vitest.security.config.ts`

## Supabase Local Dev

- `npx supabase start` — starts local stack
- **Gotcha**: Edge Runtime (Deno) can block startup if edge functions fail to load. Disable in `supabase/config.toml` with `enabled = false` under `[edge_runtime]` to unblock.
- DB types auto-generated at `src/integrations/supabase/types.ts`
- Supabase client exported from `src/integrations/supabase/client.ts`
- Edge functions served separately: `npm run functions:serve`

## Architecture

- **Entry**: `src/app/App.tsx` → `src/app/routes.tsx` (main routing)
- **Layout**: `src/app/layout/Header.tsx` re-exports `HeaderPremium.tsx` (non-standard naming, see `project-summary.md` line 105)
- **Routes**: modular files in `src/app/routes/` (public, auth, tenant, owner, agency, admin, trust-agent)
- **Features**: domain modules in `src/features/` (auth, property, tenant, owner, agency, admin, messaging, verification, contract, mandates, dispute, onboarding, dashboard, trust-agent, agent)
- **State**: Zustand (global stores) + TanStack Query (server state)
- **Auth**: `AuthProvider` at `src/app/providers/AuthProvider.tsx`, hook: `useAuth()`

## Path Aliases (verify in import statements)

`@` → `src/`, `@config` → `src/config/`, `@components` → `src/components/`, `@pages` → `src/pages/`, `@services` → `src/services/`, `@hooks` → `src/hooks/`, `@lib` → `src/lib/`, `@types` → `src/types/`, `@contexts` → `src/contexts/`, `@stores` → `src/stores/`

## Roles & Access

- **Business types** (profiles.user_type): `locataire`, `proprietaire`, `agence`
- **System roles** (user_roles table): `administrateur`, `tiers de confiance`
- Note: Code still contains `moderator` routes and `trust_agent` constants (src/shared/constants/roles.ts), but actual roles in use are only: locataire, proprietaire, agence, tiers de confiance, administrateur
- Guard routes with `<ProtectedRoute>` component; check `requireAdmin` and `requireTrustAgent` props

## Config Files

- `src/config/api-keys.config.ts` — external API keys; check `apiKeysConfig.azure.openai.isConfigured` before use
- `src/config/env.config.ts` — environment variable validation
- `.env` — required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `supabase/.env` — edge function environment variables

## Pre-commit

- Husky + lint-staged: ESLint auto-fix on `*.{ts,tsx,js,jsx}`, Prettier on `*.{json,css,md}`
- Node >= 18 required (`engines` in package.json)
