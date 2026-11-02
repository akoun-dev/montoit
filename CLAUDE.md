# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MonToit Platform

A comprehensive real estate platform for property rentals in France, connecting tenants, property owners, and real estate agencies. Built as a React SPA with mobile app support via Capacitor.

## Development Commands

### Core Commands
- `npm run dev` - Start development server (runs on port 8080)
- `npm run build` - Production build (uses optimized config)
- `npm run build:analyze` - Build and open bundle analyzer
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix lint issues
- `npm run typecheck` - TypeScript type checking

### Testing
- `npm run test` - Run unit tests (Vitest)
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate coverage report
- `npm run test:security` - Run security tests
- `npm run test:security:all` - Full security test suite (unit + integration + penetration)
- `npm run memory-audit` - Memory leak checks

### Mobile (Capacitor)
- `npx cap sync` - Sync web assets to native projects
- `npx cap open ios` - Open iOS project
- `npx cap open android` - Open Android project

## Architecture Overview

### Path Aliases
The project uses these import aliases (configured in both Vite and TypeScript):
- `@` → `src/`
- `@config` → `src/config/`
- `@components` → `src/components/`
- `@pages` → `src/pages/`
- `@services` → `src/services/`
- `@hooks` → `src/hooks/`
- `@lib` → `src/lib/`
- `@types` → `src/types/`
- `@contexts` → `src/contexts/`
- `@stores` → `src/stores/`

### Tech Stack
- **Frontend**: React 18.3 + TypeScript, Vite 7.3
- **Styling**: Tailwind CSS with custom design tokens
- **State**: Zustand (global) + TanStack Query (server state)
- **Routing**: React Router 7 with lazy loading
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Mobile**: Capacitor for iOS/Android apps

### Directory Structure

```
src/
├── app/                    # Application entry point
│   ├── routes/            # Route definitions by domain (tenant, owner, agency, etc.)
│   ├── layout/            # Layout components (Header, Footer, AdminLayout)
│   ├── providers/         # React context providers (AuthProvider)
│   ├── App.tsx            # Root component
│   └── routes.tsx         # Main route configuration
├── features/              # Domain-driven feature modules
│   ├── auth/             # Authentication
│   ├── property/         # Property management
│   ├── tenant/           # Tenant-specific features
│   ├── owner/            # Owner-specific features
│   ├── agency/           # Agency features
│   ├── admin/            # Admin panel
│   ├── messaging/        # Real-time messaging
│   ├── verification/     # Identity verification
│   └── contract/         # Lease contracts
├── components/            # Shared UI components
├── services/              # API services and business logic
│   ├── supabase/         # Supabase client
│   ├── contracts/        # Contract/PDF generation
│   ├── payments/         # Payment processing
│   └── azure/            # AI services
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and helpers
│   ├── constants/        # App constants
│   └── helpers/          # Utility functions
├── contexts/              # React contexts
├── types/                 # TypeScript type definitions
└── shared/                # Shared utilities and UI
```

### Routing Architecture

Routes are organized by domain with lazy loading:
- `/` - Public routes (home, search, property details)
- `/dashboard` - Smart redirect based on user role
- `/locataire/*` - Tenant routes
- `/proprietaire/*` - Owner routes
- `/agences/*` - Agency routes
- `/admin/*` - Admin panel (nested layout)
- `/moderator/*` - Moderator routes
- `/auth/callback` - OAuth callback

Route definitions are modular in `src/app/routes/`:
- `publicRoutes.tsx` - Public pages
- `authRoutes.tsx` - Login/signup
- `tenantRoutes.tsx`, `ownerRoutes.tsx`, `agencyRoutes.tsx` - Role-specific routes

### User Roles & Access Control

The platform supports 6 user types with different permissions:

**Business Types** (stored in `profiles.user_type`):
- `tenant`/`locataire` - Property seekers
- `owner`/`proprietaire` - Property landlords
- `agent`/`agence` - Real estate agencies

**System Roles** (stored in `user_roles` table):
- `admin` - Platform administrators
- `moderator` - Content moderators
- `trust_agent` - Verification specialists
- `user` - Default role

Use `ProtectedRoute` component to guard routes by role. Constants are in `src/shared/constants/roles.ts`.

### State Management

- **Global State**: Zustand stores (auth, UI state, preferences)
- **Server State**: TanStack Query for API data fetching and caching
- **Local State**: React context for theme and app-wide settings

### Authentication

Auth is managed by `AuthProvider` in `src/app/providers/AuthProvider.tsx`:
- Uses Supabase Auth
- Session auto-refresh
- Profile loading with retry logic (max 3 retries)
- Profile recovery attempts if profile is missing
- Auth errors are typed with `ProfileError` structure

The `useAuth()` hook provides access to auth state and methods.

### Database

Supabase PostgreSQL with Row Level Security (RLS). The `supabase` client is exported from `src/integrations/supabase/client.ts`.

Database types are auto-generated in `src/integrations/supabase/types.ts` - use these for type safety.

### Design System

Custom design tokens with WCAG AA compliance:
- Colors: `neutral-900`, `neutral-700`, `primary-500` (orange #ff6c2f)
- Minimum card padding: 32px
- Touch targets: 44px minimum
- Spacing: 4pt grid system

UI components in `src/shared/ui/` include Button, Input, Card with proper accessibility.

### Configuration

Centralized configuration in `src/config/`:
- `api-keys.config.ts` - External service API keys with validation
- `app.config.ts` - App-wide settings
- `env.config.ts` - Environment variable validation
- `routes.config.ts` - Route constants

Check if a service is configured before using it: `apiKeysConfig.azure.openai.isConfigured`

### Environment Variables

Required in `.env`:
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

Optional services include Azure OpenAI, Mapbox, Google Maps, Brevo (SMS), etc.

## Common Patterns

### Adding a New Feature

1. Create feature directory: `src/features/feature-name/`
2. Add components in `components/` subdirectory
3. Add pages in `pages/` subdirectory
4. Export from `index.ts`
5. Add routes in appropriate route file (e.g., `tenantRoutes.tsx`)

### Lazy Loading

Use the `lazyWithRetry` utility for lazy-loaded components:
```tsx
const Page = lazyWithRetry(() => import('@/pages/...'));
```

### Error Handling

- Use `ErrorBoundary` component for route-level error handling
- Profile errors are handled in AuthProvider with typed error objects
- Service errors should be logged and user-friendly messages shown

### Testing

- Unit tests use Vitest + React Testing Library
- Security tests have dedicated config: `vitest.security.config.ts`
- Memory leak tests validate component cleanup
- Tests are co-located with code or in `src/test/`

## Mobile Development

- Capacitor wraps the web app for native iOS/Android
- Native features: camera, geolocation, push notifications, haptics
- Responsive design is required (mobile-first approach)
- Touch targets must be 44px minimum

## Security Considerations

- All API calls protected by RLS on database
- JWT-based auth with automatic refresh
- Role-based access control enforced at route and component level
- Security tests run before deployment
- Never commit API keys - use environment variables
