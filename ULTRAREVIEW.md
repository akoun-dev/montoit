# Ultra Review: MonToit Platform

**Date**: 2026-04-28
**Repository**: /home/akoun-dev/Documents/PROJETS/ANSUT/Apps/montoit
**Branch**: 3.3.1

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Total Files** | 804+ TypeScript/TSX files | |
| **Test Coverage** | < 1% (6 test files only) | 🔴 Critical |
| **Type Safety** | 50+ `any` type usages | 🔴 Critical |
| **Console Logs** | 322+ files with console statements | 🟡 Medium |
| **Critical Security Issues** | 4 | 🔴 Critical |
| **Performance Issues** | 12+ | 🟡 Medium |
| **Code Quality Score** | 6.5/10 | ⚠️ Needs Improvement |

---

## 1. Critical Issues (Fix Immediately)

### 1.1 Silent Mock Mode Fallback - CRITICAL
**File**: `src/services/mandates/cryptoneoSignatureService.ts:215-218`

```typescript
if (!CRYPTONEO_CONFIG.appKey || !CRYPTONEO_CONFIG.appSecret) {
  // Mode simulation - NO ERROR THROWN
  const mockAlias = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('CryptoNeo API: Simulation mode - generateCertificate', { mockAlias, data });
  return { success: true, aliasCertificat: mockAlias };
}
```

**Risk**: Production signature operations could silently use mock data if env vars are missing.

**Fix**: Fail explicitly on missing configuration:
```typescript
if (!CRYPTONEO_CONFIG.appKey || !CRYPTONEO_CONFIG.appSecret) {
  throw new Error('CryptoNeo configuration missing. Cannot generate certificate in production.');
}
```

---

### 1.2 Exposed API Keys - CRITICAL
**File**: `src/app/providers/AuthProvider.tsx:314-320`

```typescript
const profileResponse = await fetch(`${supabaseUrl}/functions/v1/create-user-profile`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${supabaseAnonKey}`,  // EXPOSED
    apikey: supabaseAnonKey,  // DUPLICATE EXPOSURE
```

**Risk**: API keys visible in browser DevTools, potential abuse.

**Fix**: Use Supabase client with RLS policies instead of direct fetch with exposed keys.

---

### 1.3 Silent Error Catching - CRITICAL
**File**: `src/features/onboarding/OnboardingWrapper.tsx:77-79`

```typescript
} catch (error) {
  // Silently catch error - NO LOGGING
}
```

**Risk**: Errors swallowed, impossible to debug.

**Fix**: Always log errors at minimum:
```typescript
} catch (error) {
  console.error('[OnboardingWrapper] Error:', error);
  // Handle error appropriately
}
```

---

### 1.4 Console Override - HIGH
**File**: `src/utils/error-interceptor.ts:9`

```typescript
console.error = function (...args) {
  // Intercepts ALL error logging
}
```

**Risk**: Breaks debugging, hides security-critical errors.

**Fix**: Remove console override or use proper error logging service.

---

### 1.5 Direct localStorage Access to Auth Data - HIGH
**Files**:
- `src/integrations/supabase/client.ts:24-32`
- `src/utils/auth-cleanup.ts:13-26`

```typescript
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('supabase') || key.includes('auth'))) {
    localStorage.removeItem(key);
  }
}
```

**Risk**: XSS vulnerabilities can steal auth tokens.

**Fix**: Let Supabase handle auth storage. Never directly access auth data in localStorage.

---

## 2. Code Quality Issues

### 2.1 Widespread `any` Type Usage

Found 50+ instances of `any` type:

| File | Line | Issue |
|------|------|-------|
| `src/components/mandates/CreateMandateForm.tsx` | 128 | `profile: any` |
| `src/services/mandates/cryptoneoSignatureService.ts` | 164, 479, 482, 595 | Multiple `any` params |
| `src/shared/ui/DataTable.tsx` | 7, 17, 27 | Generic defaults to `any` |
| `src/pages/account/AccountSettingsPage.tsx` | 129, 189 | `error: any` |
| `src/pages/agency/AddPropertyPage.tsx` | 199 | `error: any` |
| `src/lib/database.types.ts` | 414, 422 | `Record<string, any>` |
| `src/shared/utils/lazyLoad.tsx` | 45 | `any` type |

**Impact**: Loss of type safety, runtime errors, poor IDE support.

**Fix**: Replace with proper interfaces or use `unknown` with type guards.

---

### 2.2 Console Logging in Production

322 files contain console statements that execute in production:

```
console.log    - 287 occurrences
console.error  - 31 occurrences
console.warn   - 4 occurrences
```

**Impact**: Performance degradation, information leakage.

**Fix**: Implement production logging strip:
```typescript
// utils/logger.ts
const logger = import.meta.env.DEV ? console : { log: () => {}, error: () => {}, warn: () => {} };
export default logger;
```

---

### 2.3 Duplicate Code Patterns

**Three Separate RoleSwitcher Components**:
- `src/app/layout/RoleSwitcher.tsx`
- `src/app/layout/ContextualRoleSwitcher.tsx`
- `src/components/role/RoleSwitcher.tsx`

**Multiple Property Card Variants**:
- `src/shared/components/PropertyCard.tsx`
- `src/shared/components/PropertyCardMobile.tsx`
- `src/features/property/components/PropertyCard.tsx`

**Three Duplicate Dashboard Patterns**:
- `src/pages/tenant/DashboardPage.tsx`
- `src/pages/owner/DashboardPage.tsx`
- `src/pages/agency/DashboardPage.tsx`

**Three Duplicate Sidebar Components**:
- `src/features/tenant/components/TenantSidebar.tsx`
- `src/features/owner/components/OwnerSidebar.tsx`
- `src/features/agency/components/AgencySidebar.tsx`

**Fix**: Extract common patterns into reusable components with role-specific data.

---

### 2.4 Large Component Files

| File | Lines | Issue |
|------|-------|-------|
| `src/pages/account/AccountSettingsPage.tsx` | 715 | Needs splitting |
| `src/services/mandates/cryptoneoSignatureService.ts` | 755 | Too large, needs refactoring |
| `src/app/providers/AuthProvider.tsx` | ~400 | Complex auth logic tangled |

---

### 2.5 Unused/Dead Code

**File**: `src/shared/ui/MapboxMap.tsx:78-86`
```typescript
function MapSearchControl({ onLocationSelect, mapRef }: MapSearchControlProps) {
  // Hook manquant, on retourne null
  return null;
}
```

Component exists but does nothing.

**File**: `src/shared/ui/MapboxMap.tsx:5`
```typescript
// import { usePlacesAutocomplete, PlaceSuggestion } from '@/shared/hooks/usePlacesAutocomplete';
```
Import commented out but search UI references still exist.

---

## 3. Security Issues

### 3.1 TODO Comments for Critical Security

**File**: `src/shared/middleware/security.middleware.ts`

```typescript
Line 250: // TODO: Implémenter l'envoi vers Sentry, LogRocket, etc.
Line 259: // TODO: Implémenter une alerte admin
```

**Risk**: Security events not monitored or alerted.

---

### 3.2 Missing Content Security Policy Enforcement

CSP is defined but not enforced at server level. Client-side headers won't prevent XSS from compromised external resources.

**File**: `src/shared/middleware/security.middleware.ts:29-39`

---

### 3.3 Insecure Password Patterns

Password strength validation may be insufficient - need to verify minimum entropy requirements.

---

### 3.4 console.log with Sensitive Data - MEDIUM

**File**: `src/utils/auth-cleanup.ts:68`

```typescript
console.log('Auth data cleanup:', {
  keys: keysToRemove,
  count: keysToRemove.length
});
```

---

## 4. Performance Issues

### 4.1 Missing React Performance Optimizations

| Component | Issue | Impact |
|-----------|-------|--------|
| `DataTable` | No memoization | Re-renders entire table |
| `DashboardPage` (all 3) | No memoization | Unnecessary re-renders |
| `MapboxMap` | Large prop interface | Re-renders on any change |
| `PropertyForm` | No optimization | Slow form updates |

**Fix**: Add `React.memo`, `useMemo`, and `useCallback` strategically.

---

### 4.2 Inefficient useEffect Dependencies

**File**: `src/shared/components/ProtectedRoute.tsx:46-63`

```typescript
React.useEffect(() => {
  const checkRole = async () => {
    // ... logic
  };
  checkRole();
}, [user]); // Missing role dependency
```

**File**: `src/app/providers/AuthProvider.tsx:87`

```typescript
useEffect(() => {
  // ... logic
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

**Fix**: Review all useEffect dependencies, add missing ones or document intentional omission.

---

### 4.3 Sequential API Calls Instead of Parallel - HIGH

**File**: `src/pages/agency/DashboardPage.tsx:78-116`

```typescript
const { data: propertiesData } = await supabase.from('properties')...
const { data: leasesData } = await supabase.from('lease_contracts')...
const { data: applicationsData } = await supabase.from('rental_applications')...
```

**Fix**: Use `Promise.all()` for independent fetches:
```typescript
const [propertiesData, leasesData, applicationsData] = await Promise.all([
  supabase.from('properties')...,
  supabase.from('lease_contracts')...,
  supabase.from('rental_applications')...
]);
```

---

### 4.4 Lazy Image Loading Not Optimized - MEDIUM

**File**: `src/shared/ui/LazyImage.tsx:24-50`

The IntersectionObserver implementation creates a new Image object on every render intersection.

---

### 4.5 Large Components Without Code Splitting - MEDIUM

Large routes without proper code splitting:
- `src/pages/account/AccountSettingsPage.tsx` (715 lines)
- `src/pages/agency/DashboardPage.tsx` (Complex logic)
- `src/features/property/components/PropertyForm.tsx`

---

## 5. Type Safety Issues

### 5.1 Missing Type Guards

**File**: `src/pages/account/AccountSettingsPage.tsx:129`

```typescript
} catch (error: any) {  // Unsafe type assertion
  console.error('Error initiating email change:', error);
  if (error.message?.includes('already registered')) {  // Unsafe access
```

**Fix**: Use proper error handling:
```typescript
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  if (message.includes('already registered')) {
```

---

### 5.2 Inconsistent Component Props Typing

**File**: `src/features/property/components/PropertyForm.tsx:28`

```typescript
const PropertyForm: React.FC = () => {  // Missing props interface
```

---

## 6. Error Handling Issues

### 6.1 Generic Error Messages - MEDIUM

**File**: `src/services/mandates/cryptoneoSignatureService.ts`

```typescript
Line 246: return { success: false, error: 'Erreur de connexion avec CryptoNeo' };
Line 266: return { success: false, error: 'Erreur de connexion avec CryptoNeo' };
Line 368: return { success: false, error: 'Erreur de connexion avec CryptoNeo' };
```

All errors return same generic message - impossible to debug.

**Fix**: Include error details from original exception.

---

### 6.2 Inconsistent Error Response Formats - MEDIUM

| Service | Format |
|---------|--------|
| Cryptoneo | `{ success: boolean, error?: string }` |
| Contract Service | Throws errors |
| Auth Provider | `{ error: AuthError \| null }` |
| Upload Service | `{ url: string, path: string, error?: string }` |

**Fix**: Standardize on consistent response type.

---

### 6.3 Missing Error Boundaries - MEDIUM

ErrorBoundary components exist but not consistently applied around all major routes.

**Files**:
- `src/shared/components/ErrorBoundary.tsx`
- `src/app/components/ui/AuthErrorBoundary.tsx`

---

### 6.4 Inconsistent Error Throwing - LOW

**File**: `src/shared/services/secureUpload.service.ts:312`

```typescript
return {
  url: '',
  path: '',
  error: error.message || "Erreur lors de l'upload sécurisé",
};
```

Mix of throwing errors vs returning error objects creates inconsistent handling.

---

## 7. Testing Gaps

### 7.1 Extremely Low Test Coverage - CRITICAL

| Metric | Value |
|--------|-------|
| Total TS/TSX files | 804+ |
| Test files | 6 |
| Coverage | < 1% |
| Required | 70% (configured in vitest) |

**Test files found**:
1. `src/shared/constants/__tests__/roles.test.ts`
2. `src/test/hmac.test.ts`
3. `src/tests/security.test.ts`
4. `src/tests/security.integration.test.ts`
5. `src/features/property/services/__tests__/property.api.test.ts`
6. `src/shared/utils/__tests__/lazyLoad.test.tsx`

**Critical areas without tests**:
- Authentication flow
- Property CRUD operations
- Contract generation
- Payment processing
- Signature workflows
- All UI components
- All hooks

---

### 7.2 Test Quality Issues - MEDIUM

**File**: `src/tests/security.integration.test.ts:25-78`

```typescript
it.skip('should prevent brute force login attacks', async () => {
  // Test is SKIPPED - no implementation
```

**File**: `src/tests/security.test.ts:37-41`

```typescript
it('should reject unauthorized property creation', async () => {
  expect.fail('Should have thrown error');
```

---

### 7.3 Missing End-to-End Tests - CRITICAL

No E2E test framework configured (Playwright, Cypress, etc.).

**Critical flows untested**:
- User onboarding
- Property listing flow
- Contract signing
- Payment processing

---

### 7.4 No Accessibility Testing - MEDIUM

No automated accessibility tests for a platform that serves users with diverse needs.

---

## 8. Architecture Issues

### 8.1 Direct Fetch vs Supabase Client - HIGH

Inconsistent API call patterns:

**Direct fetch (less secure)**:
- `src/app/providers/AuthProvider.tsx:314` - Profile creation
- `src/app/providers/AuthProvider.tsx:354` - OTP sending
- `src/services/mandates/cryptoneoSignatureService.ts:71, 223, 275, 342`

**Supabase client (more secure)**:
- `src/services/contracts/contractService.ts:38-62`

**Fix**: Use Supabase client for all database operations, external APIs via Edge Functions.

---

### 8.2 No Centralized API Client - MEDIUM

Each service implements own fetch logic with different error handling.

**Examples**:
- `src/integrations/resend/client.ts`
- `src/services/payments/intouchPaymentService.ts`
- `src/services/cryptonoe/cryptonoe.service.ts`

**Fix**: Create centralized API client with consistent error handling, retries, logging.

---

### 8.3 Duplicate Configuration - LOW

Multiple config files with overlapping concerns:
- `vite.config.ts`
- `vite.config.optimized.ts` (referenced in package.json)
- `vitest.config.ts`
- `vitest.security.config.ts`

---

## 9. Configuration Issues

### 9.1 TypeScript Path Aliases - LOW

Good coverage but some inconsistencies:
- `vite.config.ts` has `@config` pointing to `./src/config`
- `tsconfig.app.json` has both `@config` (index) and `@config/*` (directory)

**TypeScript strict mode enabled**: ✅ Good
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitReturns: true`

---

### 9.2 Test Coverage Thresholds Mismatch - MEDIUM

**vitest.config.ts** sets thresholds to 70%, but actual coverage is < 1%.

This means CI passes only because tests are skipped or thresholds not enforced.

---

### 9.3 Stale Comment in Vite Config - LOW

**File**: `vite.config.ts:1`

```typescript
// Force complete rebuild - 2025-12-07T18:55:00Z
```

This timestamp is in the future (current date is 2026-04-28) and shouldn't be in the code.

---

### 9.4 Duplicate Git Ignore Entries - LOW

**File**: `.gitignore`

Duplicate entries at:
- Lines 33-38: `.env`, `.env.local`, `.env.*.local`, etc.
- Lines 84-86: Same entries repeated

---

## 10. React Performance Issues

### 10.1 Components Without Memoization - HIGH

**DataTable**: `src/shared/ui/DataTable.tsx:27`
- Used in multiple places
- Re-renders entire table on any parent change

**Agency Dashboard**: `src/pages/agency/DashboardPage.tsx:42`
- Complex state management
- No React.memo
- Multiple useEffect hooks

**ProtectedRoute**: `src/shared/components/ProtectedRoute.tsx:30`
- Wraps all protected routes
- No memoization of child components

---

### 10.2 Unnecessary useCallback/useMemo Usage - LOW

**File**: `src/shared/ui/MapboxMap.tsx:1`

```typescript
import { useRef, useEffect, useState, useCallback } from 'react';
```

Hook is imported but many functions don't actually use it.

---

## 11. Tech Stack Analysis

### 11.1 Dependencies Review - MEDIUM

**Potentially outdated packages**:
- `@supabase/supabase-js`: 2.94.0 (check if latest)
- `react`: ^18.3.1 (consider migration to React 19 when ready)

**Good practices observed**:
- Husky for git hooks
- Lint-staged for pre-commit checks
- Sentry for error tracking
- Security tests configured

---

## Prioritized Action Plan

### Priority 1 (This Week) - 🔴 Critical

1. **Remove mock mode fallback** - fail explicitly on missing config
   - File: `src/services/mandates/cryptoneoSignatureService.ts:215-218`

2. **Fix empty catch blocks** - log all errors
   - File: `src/features/onboarding/OnboardingWrapper.tsx:77-79`

3. **Remove console.error override**
   - File: `src/utils/error-interceptor.ts:9`

4. **Stop direct localStorage access** to auth data
   - Files: `src/integrations/supabase/client.ts`, `src/utils/auth-cleanup.ts`

5. **Disable console logging in production builds**

---

### Priority 2 (This Sprint) - 🟡 High

6. Replace 90% of `any` types with proper interfaces
7. Add `React.memo` to DataTable and dashboards
8. Consolidate duplicate components (RoleSwitcher, PropertyCard)
9. Fix sequential API calls to parallel
10. Add missing ErrorBoundaries to major routes
11. Implement centralized error logging service

---

### Priority 3 (Next Month) - 🟢 Medium

12. Increase test coverage to 30% for critical paths
13. Standardize error handling patterns
14. Remove console logging in production
15. Remove unused/dead code
16. Split large components (>300 lines)
17. Optimize useEffect dependencies

---

### Priority 4 (Ongoing) - 🔵 Long-term

18. Achieve 70% test coverage
19. Implement E2E testing framework
20. Add accessibility testing
21. Performance monitoring implementation
22. Complete security audit with external review
23. Implement TODOs in security middleware

---

## File Locations Reference

All file paths referenced in this report are relative to:
`/home/akoun-dev/Documents/PROJETS/ANSUT/Apps/montoit/`

---

## Final Assessment

### Strengths
- Clean domain-driven architecture
- Good TypeScript configuration with strict mode
- Modular routing with lazy loading
- Security awareness (RLS, middleware exists)
- Comprehensive feature modules organized by domain
- Good test configuration infrastructure
- Mobile support via Capacitor

### Weaknesses
- Critical test coverage (< 1%)
- Type safety compromised by `any` usage
- Security vulnerabilities in auth handling
- Performance issues from missing optimizations
- Inconsistent patterns across codebase
- Duplicate components and logic
- Silent error handling
- Console logging in production

### Recommendations Summary

1. **Immediate**: Address Priority 1 critical security and error handling issues
2. **Short-term**: Fix type safety, performance, and code duplication
3. **Medium-term**: Build test coverage and standardize patterns
4. **Long-term**: Continuous improvement in quality, security, and performance

---

**Generated**: 2026-04-28
**Review Type**: Ultra Code Review
**Severity Summary**: 4 Critical, 12 High, 18 Medium, 8 Low
