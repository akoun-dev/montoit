# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mon Toit** is a certified real estate platform for Côte d'Ivoire with multi-tenant architecture supporting 4 user types: locataire (tenant), proprietaire (owner), agence (agency), and admin_ansut (ANSUT certifier). The platform features property listings, ANSUT certification, secure applications, and lease management.

## Essential Development Commands

### Core Development
```bash
npm run dev              # Development server (port 8080)
npm run build            # Production build with optimizations
npm run build:dev        # Development build (faster, less optimized)
npm run lint             # ESLint code quality check
npm run preview          # Preview production build locally
```

### Mobile Development (Capacitor)
```bash
npx cap sync             # Sync web assets to native platforms
npx cap open android     # Open Android Studio
npx cap open ios         # Open Xcode
npx cap run android      # Run on Android device/emulator
npx cap run ios          # Run on iOS device/simulator
```

### Production Mobile Build
```bash
npm run build            # Build for web first
CAPACITOR=true npm run build  # Build with Capacitor base path
npx cap sync             # Sync to native platforms
```

## Architecture Overview

### Multi-Tenant User System
The application uses role-based architecture with 4 distinct user types:
- **locataire**: Property search, applications, lease management
- **proprietaire**: Property management, application review, lease creation
- **agence**: Portfolio management, mandates, client relationships
- **admin_ansut**: Certification, verification, platform administration

### Database Architecture (Supabase)
- **RLS (Row Level Security)**: All tables have granular access policies by user type
- **Core Tables**: properties, profiles, applications, leases, user_verifications
- **Media Storage**: Supabase Storage for images/documents with WebP optimization
- **Real-time**: Subscriptions for notifications and messaging

### Key Technical Patterns

#### Authentication Flow
- Uses `useAuth.tsx` and `useAuthEnhanced.tsx` hooks
- MFA (Multi-Factor Authentication) required for admin_ansut users
- Secure storage via `secureStorage` for session persistence
- Role-based UI rendering with `useRequireRole` hooks

#### Data Fetching Patterns
- **TanStack Query**: All data operations through custom hooks (50+ hooks)
- **Prefetching**: Strategic route and data prefetching in `usePrefetchRoutes`
- **Offline Support**: Caching strategies with Workbox PWA
- **Error Handling**: Centralized error boundaries and retry logic

#### Property Management System
- **Property Types**: Defined in `src/types/index.ts` with comprehensive metadata
- **Media Pipeline**: WebP conversion, compression, CDN caching
- **Geospatial**: Mapbox GL JS with Supercluster clustering
- **Search**: Real-time filtering with location-based queries

#### Security Implementation
- **Console Security**: All 116 console.log statements replaced with secure logging
- **Input Validation**: Zod schemas for all form inputs
- **CORS & Headers**: Configured in vite.config.ts and vercel.json
- **Audit Logging**: Complete tracking of sensitive operations

### State Management Architecture

#### Global State
- **TanStack Query**: Server state management with caching/sync
- **React Context**: User authentication and theme management
- **Local State**: Component state with useState/useReducer

#### Key Custom Hooks
- `useProperties.ts`: Property CRUD operations with filtering
- `useAuth.tsx`: Authentication state with role management
- `useNotifications.ts`: Push notifications and in-app messaging
- `useMobileGestures.ts`: Touch interactions for PWA
- `useOfflineSync.ts`: Offline data synchronization

### Performance Optimizations

#### Build Configuration (vite.config.ts)
- **Code Splitting**: Automatic route-based chunking
- **Image Optimization**: WebP conversion with viteImagemin
- **PWA Configuration**: Workbox caching strategies for API/assets
- **Bundle Analysis**: Chunk size warnings and optimization

#### Caching Strategy
- **API Caching**: 5-minute cache for Supabase REST calls
- **Image Caching**: 30-day cache for static assets
- **Offline Support**: Service worker with background sync

### Mobile-First Architecture

#### PWA Features
- **Installable**: Android/iOS native installation
- **Offline Mode**: Cached critical assets and API responses
- **Push Notifications**: Via Capacitor push-notifications plugin
- **Native Integration**: Camera, geolocation, file system access

#### Capacitor Integration
- **7 Native Plugins**: Geolocation, camera, notifications, haptics, etc.
- **Platform Detection**: Automatic base path adjustment for mobile builds
- **Native Builds**: APK/IPA generation through standard Capacitor workflow

## Development Guidelines

### File Organization
- **Components**: Organized by domain (auth, dashboard, maps, mobile, ui)
- **Hooks**: 50+ custom hooks in `/src/hooks/` for reusable logic
- **Pages**: Route components in `/src/pages/` with role-based access
- **Types**: Centralized TypeScript definitions in `/src/types/index.ts`

### Security Requirements
- **No Console Logs**: Use secure logging utilities instead
- **RLS Compliance**: All database operations must respect Row Level Security
- **Input Validation**: All user inputs must be validated with Zod schemas
- **Role Verification**: Use `useRequireRole` hooks for protected components

### Environment Variables
```bash
VITE_SUPABASE_URL=           # Supabase project URL
VITE_SUPABASE_PUBLISHABLE_KEY=  # Supabase anonymous key
VITE_MAPBOX_PUBLIC_TOKEN=    # Mapbox GL JS access token
CAPACITOR=true               # Set for mobile builds
```

### Testing Strategy
- **Security Tests**: Automated RLS policy testing (11 tests)
- **Build Validation**: Production build verification
- **Mobile Testing**: Capacitor device testing

## Common Development Tasks

### Adding New User Roles
1. Update `UserType` in `/src/types/index.ts`
2. Modify RLS policies in Supabase
3. Update `useRequireRole` hooks
4. Add dashboard components in `/src/components/dashboard/`

### Property Feature Development
1. Extend `Property` interface in types
2. Update property form hooks (`usePropertyForm.ts`)
3. Modify Supabase table schema
4. Update property detail components

### Mobile Feature Integration
1. Implement web PWA functionality first
2. Add Capacitor plugin in `capacitor.config.ts`
3. Create native bridge hooks in `/src/hooks/`
4. Test with `npx cap run` commands

## Production Deployment

### Vercel Configuration
- **Automatic Builds**: Git integration with preview/production branches
- **Security Headers**: CORS, CSP, and security headers configured
- **Edge Functions**: API routes for sensitive operations

### Mobile Distribution
- **Android**: APK via Capacitor build, distribute through Play Store
- **iOS**: IPA via Xcode build, distribute through App Store
- **PWA**: Automatic installation from web browser

The platform is enterprise-ready with comprehensive security, performance optimization, and mobile support. All critical security vulnerabilities have been addressed (100% completion rate).