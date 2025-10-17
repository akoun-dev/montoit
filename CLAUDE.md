# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mon Toit** is a certified real estate platform in Côte d'Ivoire, built as a modern Progressive Web App (PWA) with native mobile capabilities. It's a comprehensive property rental platform connecting landlords, tenants, and agencies with ANSUT certification features.

## Commands

### Development
```bash
npm run dev              # Start development server (port 8080)
npm run build           # Production build
npm run build:dev       # Development build
npm run preview         # Preview production build
npm run lint            # Run ESLint
```

### Mobile App (Capacitor)
```bash
npx cap sync            # Sync web assets to native platforms
npx cap open android    # Open Android Studio
npx cap open ios        # Open Xcode
npx cap run android     # Run on Android device/emulator
npx cap run ios         # Run on iOS device/simulator
```

### Environment Setup
1. Copy environment variables: `.env.local`
2. Required vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAPBOX_PUBLIC_TOKEN`
3. Supabase is pre-configured with hardcoded fallbacks for development

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite 5
- **UI Framework**: Tailwind CSS 3 + shadcn/ui components
- **State Management**: TanStack Query (React Query) + React Context
- **Database**: Supabase (PostgreSQL) with real-time features
- **Maps**: Mapbox GL JS with Supercluster for clustering
- **Mobile**: Vite PWA + Capacitor 7 for native apps
- **Authentication**: Supabase Auth with MFA support
- **Forms**: React Hook Form + Zod validation
- **Animations**: Framer Motion
- **Monitoring**: Sentry (disabled temporarily)

### Key Architecture Patterns

**Route-based Code Splitting**: App.tsx uses lazy loading for heavy pages while eager-loading critical routes (Index, Auth, Search). The router includes role-based protection with `ProtectedRoute` components.

**Multi-tenant User System**: Four distinct user types with dedicated dashboards:
- `proprietaire` (landlord) - OwnerDashboard
- `locataire` (tenant) - TenantDashboard
- `agence` (agency) - AgencyDashboard
- `tiers_de_confiance` (trusted third party) - TiersDeConfianceDashboard

**Permission System**: Role-based access control implemented through:
- `ProtectedRoute` components for route protection
- `useRequireRole` and `useRequireRoles` hooks for component-level protection
- Database-level RLS policies in Supabase

**Smart Caching Strategy**:
- TanStack Query for server state with 5-minute stale time
- Workbox runtime caching for PWA offline support
- Image optimization with WebP conversion
- API caching for Supabase requests

**Performance Optimizations**:
- Manual chunk splitting in vite.config.ts by feature (maps, charts, forms, etc.)
- Route-based prefetching with `usePrefetchRoutes` hook
- Lazy loading of heavy components and pages
- Image compression and WebP conversion

### Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific components
│   ├── agency/         # Agency management components
│   ├── application/    # Rental application components
│   ├── auth/           # Authentication components
│   ├── dashboard/      # Dashboard widgets and charts
│   └── navigation/     # Navigation components
├── hooks/              # Custom React hooks (50+ hooks)
├── lib/                # Utility libraries and configurations
├── pages/              # Route components (30+ pages)
└── data/               # Static data and constants
```

### Key Files to Understand

**Core Configuration**:
- `vite.config.ts` - Build config with PWA, chunking, and optimization
- `capacitor.config.ts` - Native app configuration
- `src/lib/supabase.ts` - Database client setup
- `src/App.tsx` - Main router and component architecture

**Authentication & Permissions**:
- `src/hooks/useAuth.tsx` - Global auth state management
- `src/components/ProtectedRoute.tsx` - Route protection wrapper
- `src/hooks/useRequireRole.tsx` - Role-based component protection

**State Management**:
- `src/lib/queryClient.ts` - TanStack Query configuration
- `src/hooks/useProperties.ts` - Property data management
- `src/hooks/usePropertyFilters.ts` - Search and filter logic

## Development Notes

### Environment Variables
The app uses hardcoded Supabase credentials as fallbacks since Vite env vars may not load properly. Always check `src/lib/supabase.ts` for current configuration.

### Mobile Development
- Set `CAPACITOR=true` environment variable for Capacitor builds
- Base URL automatically adjusts (`./` for Capacitor, `/` for Vercel)
- Native plugins configured for geolocation, notifications, etc.

### PWA Features
- Offline support with service worker caching
- Install prompt functionality
- Splash screen and app icons
- Push notifications (when permissions granted)

### Map Features
- Mapbox integration requires public token
- Supercluster clustering for performance with many properties
- 28 POI categories across Abidjan neighborhoods
- Real-time property filtering on map

### Security Considerations
- Row Level Security (RLS) enabled on Supabase tables
- MFA authentication available for admin users
- Rate limiting protection hooks
- CORS and security headers configured in vercel.json

### Common Development Tasks

**Adding New Property Features**:
1. Update database schema in Supabase
2. Modify `src/hooks/useProperties.ts` for data fetching
3. Update `src/components/PropertyFilters.tsx` for filtering
4. Add UI components in `src/components/property/`

**Adding New Admin Features**:
1. Create components in `src/components/admin/`
2. Add routes in `App.tsx` with `ProtectedRoute requiredRoles={['admin']}`
3. Update `src/pages/AdminDashboard.tsx` navigation

**Mobile Testing**:
```bash
# Test PWA in browser
npm run dev

# Test native app
npx cap run android  # or ios
```

### Build Process

**Development**: Fast rebuild with HMR, component tagger enabled
**Production**: Optimized chunks, image compression, Sentry monitoring
**Capacitor**: Creates native packages with adjusted base paths

The build process creates separate chunks for different feature areas to optimize loading performance and caching strategies.