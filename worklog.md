---
Task ID: 1
Agent: main
Task: Fix registration form - terms checkbox not visible and 400 Bad Request error

Work Log:
- Replaced raw `<input type="checkbox">` with shadcn `Checkbox` component for better visibility and styling
- Added a bordered background container around the terms section for better visual prominence
- Updated the register API (`/api/auth/register/route.ts`) to handle re-registration for unverified accounts
  - When an unverified user tries to register again, update their info and re-send OTP instead of returning 400 error
  - Differentiate between verified accounts (error) and unverified accounts (allow re-registration)
- Cleaned up test users from the database
- Verified re-registration works for `aboa.akoun40@gmail.com` (existing unverified user) - returns 200 with devCode

Stage Summary:
- Terms checkbox now uses shadcn Checkbox component with brand-500 styling
- Re-registration for unverified accounts works (200 with new OTP instead of 400 error)
- Server is stable and responding correctly

---
Task ID: 2
Agent: main
Task: Fix session persistence - session lost on page refresh

Work Log:
- Diagnosed root cause: Zustand store was purely in-memory, so on page refresh all state (user, isAuthenticated, currentView) reset to defaults
- Although `checkAuth()` was called in useEffect to restore from cookie, there was a race condition where the home page rendered first before checkAuth completed
- Added `zustand/persist` middleware to persist key auth state to localStorage (`montoit-auth` key)
  - Persisted fields: user, isAuthenticated, currentView, previousView, dashboardSection, selectedPropertyId
  - Transient fields (not persisted): isLoading, isInitialized, pendingPhone, pendingEmail, authMethod, devCode, otpPurpose
- Added `isInitialized` flag to prevent rendering before first auth check completes
  - On first load, `isInitialized: false` → shows loading spinner
  - After `checkAuth()` completes, `isInitialized: true` → shows correct view
- Added `LoadingScreen` component with brand-colored spinner
- Updated `checkAuth()` to:
  - Set `isInitialized: true` in all cases (success, fail, network error)
  - On server 401: clear persisted auth state and redirect to home if on dashboard
  - On network error: don't clear persisted state (might still be valid)
  - On success: update user data from server (keeps data fresh)
- Verified cookie-based session works correctly:
  - Login sets `montoit-user-id` cookie (7 days, httpOnly, sameSite: lax)
  - `/api/auth/me` correctly reads cookie and returns user data
  - Logout correctly clears cookie
- No lint errors

Stage Summary:
- Session now persists across page refreshes using localStorage + server cookie
- No more flash of wrong view on refresh (loading spinner shown during auth check)
- Server-validated session ensures persisted state stays in sync

---
Task ID: 3
Agent: main
Task: Redesign header user dropdown with avatar icon + role-specific menu

Work Log:
- Analyzed user's screenshot showing a mobile-style profile dropdown with user info, role badge, and menu items
- Completely redesigned `src/components/home/header.tsx` for logged-in users on public views
- Desktop: Replaced text name + "Tableau de bord" + "Déconnexion" buttons with a single avatar icon dropdown
  - Avatar button shows user initials with brand-100 background and border
  - Dropdown opens on click with rich content:
    - Profile header: name, email/phone, role badge (color-coded per role)
    - Role-specific menu items with icons (e.g., "Mes favoris", "Mes visites" for locataire)
    - Déconnexion item in red at the bottom
  - Each menu item navigates to the corresponding dashboard section
- Mobile (Sheet menu): Updated with same profile info and role badge at top
  - Shows first 5 menu items as quick-access buttons
  - Déconnexion in red at bottom
- Added `getUserMenuItems()` function returning role-specific items:
  - LOCATAIRE: Mon Espace, Mes favoris, Mes visites, Mes contrats, Messages, Mon profil
  - PROPRIETAIRE: Mon Espace, Mes biens, Ajouter un bien, Demandes de visite, Dossiers locatifs, Mes baux, Messages, Mon profil
  - AGENCE: Mon Espace, Nos biens, Ajouter un bien, Demandes de visite, Dossiers locatifs, Nos baux, Messages, Profil agence
  - TIERS_CONFIANCE: Mon Espace, Dossiers à valider, Validations, Suivi SLA, Mon profil
  - ADMIN: Mon Espace, Utilisateurs, Modération biens, Gestion TC, Litiges, Rapports, Paramètres
- Added `getRoleBadgeStyle()` with role-specific color coding (amber, emerald, teal, orange, rose)
- Lint clean, no errors

Stage Summary:
- Header now shows user avatar icon that opens a rich dropdown menu
- Dropdown includes profile info, role badge, and role-specific navigation items
- Mobile menu also updated with profile info and quick-access items
- All 5 roles have tailored menu items matching the dashboard sidebar

---
Task ID: 4
Agent: main
Task: Fix 401 Unauthorized error on /api/dashboard/locataire and all dashboard API calls

Work Log:
- Analyzed the root cause: dashboard overview components made fetch() calls without `credentials: 'include'`, and handled 401 by calling logout() but still logged errors to console
- Created shared `authFetch` utility (`/src/lib/auth-fetch.ts`) that:
  - Always includes `credentials: 'include'` to ensure cookies are sent
  - On 401, attempts to re-validate session via `checkAuth()` before logging out
  - If re-auth succeeds, retries the original request once
  - If still 401 after retry, calls `logout()` gracefully and throws `AuthError`
  - Handles 403 (access denied) and other errors with `AuthError` class
- Updated all 4 dashboard overview components:
  - `locataire/overview.tsx` - Added `isAuthenticated` guard, uses `authFetch`, silent 401 handling
  - `proprietaire/overview.tsx` - Same pattern
  - `tc/overview.tsx` - Same pattern
  - `admin/overview.tsx` - Same pattern
- Updated all 13 remaining dashboard sub-components:
  - proprietaire/: messages, my-leases, my-properties, rental-files, visit-requests
  - tc/: rental-files-queue, sla-monitoring, owner-validations
  - admin/: users, disputes
  - locataire/: my-visits, my-leases, messages
- Pattern used in all components:
  - `useCallback` for `fetchData` function depending on `[isAuthenticated]`
  - `isAuthenticated` guard before making API calls
  - `authFetch<T>()` instead of raw `fetch()`
  - Silent 401 handling: just set default data, no console.error
  - Other errors: show error state in UI
  - Also fixed pre-existing type bug in 3 files where arrays were double-nested
- Lint: 0 errors, 0 warnings

Stage Summary:
- Created `authFetch` utility with automatic credential handling and 401 retry logic
- Updated all 17 dashboard components to use `authFetch` with `isAuthenticated` guards
- 401 errors no longer appear in console (handled gracefully)
- Components don't make API calls when not authenticated (prevents unnecessary 401s)

---
Task ID: 5
Agent: main
Task: Fix favorites system - "le systeme de favories ne fonctionne pas"

Work Log:
- Investigated the favorites system: API routes, Prisma schema, useFavorites hook, and UI components
- Identified 4 critical bugs in the `useFavorites` hook:
  1. **Infinite re-render loop**: `useEffect` depended on `propertyIds` array, which creates new reference every render → triggers effect → sets state → re-render → loop
  2. **`toggleFavorite` had `favoritesMap` as dependency**: caused callback to recreate on every state change, leading to stale closures and re-renders
  3. **Each PropertyCard in `properties.tsx` created its own `useFavorites([property.id])` instance**: isolated state per card, N API calls instead of 1, toggling didn't sync across cards
  4. **No error revert on server failure in toggleFavorite**: if the API returned an error, the optimistic update wasn't reverted
- Fixed `src/lib/use-favorites.ts`:
  - Used `JSON.stringify(propertyIds)` as stable key for useEffect dependency instead of the array reference
  - Used `propertyIdsRef` to pass latest IDs to effect without adding them as dependency
  - Used `favoritesMapRef` in `toggleFavorite` to access current state without adding it as dependency
  - Added server error revert in `toggleFavorite` (previously only reverted on catch)
  - Lint clean (0 errors, 0 warnings)
- Fixed `src/components/home/properties.tsx`:
  - Changed `PropertyCard` to receive `isFavorite` and `onToggleFavorite` as props instead of creating its own `useFavorites` instance
  - Moved `useFavorites` to parent `NosBiens` component with `useMemo` for stable propertyIds
  - Single shared hook = single API call, consistent state across all cards
  - Added `useMemo` import
- Fixed `src/components/home/nos-biens-view.tsx`:
  - Changed `propertyIds = properties.map(p => p.id)` to `useMemo(() => properties.map(p => p.id), [properties])`
  - Prevents new array reference on every render

Stage Summary:
- Favorites system now works without infinite re-render loops
- Single shared `useFavorites` instance per view (instead of N instances per N cards)
- Optimistic updates properly revert on server error
- All lint checks pass

---
Task ID: 6
Agent: main
Task: Add Trust Score / Scoring system to locataire profile

Work Log:
- Analyzed user's screenshots showing the Trust Score UI with scoring rules
- Scoring rules identified:
  - Profil complet (5%): Required fields = Nom complet, Téléphone, Ville, Adresse, Genre
  - NEOFACE (20%): Biometric verification
  - ONECI (25%): National ID card verification (CNI authentifiée)
  - Dossier locataire (50%): Rental file approved by TC
  - Status thresholds: 70+ = Approuvé, 50-69 = Sous conditions, <50 = Non recommandé
- Updated Prisma schema (`prisma/schema.prisma`):
  - Added `gender`, `city`, `address` fields to User model
  - Added `neofaceVerified` (Boolean, default false) and `oneciVerified` (Boolean, default false)
  - Ran `bun run db:push` successfully
- Created API route (`/api/scoring/route.ts`):
  - Computes Trust Score based on 4 components with weighted percentages
  - Profile completeness: calculates based on 5 required fields (fullName, phone, city, address, gender)
  - NEOFACE: 20 points if verified
  - ONECI: 25 points if verified
  - Rental file: 50 points if any APPROVED rental file exists
  - Returns score, status, breakdown, and recommendations
- Created Trust Score UI component (`src/components/dashboard/locataire/trust-score.tsx`):
  - Animated circular score display (SVG with progress animation)
  - Status badge (Approuvé/Sous conditions/Non recommandé) with color coding
  - Score bars for each category with animated progress
  - Recommendations section with action buttons
  - Expandable detail sections: profile fields, verification status, how it works explanation
  - Matches the design from user's screenshots
- Added "Trust Score" sidebar entry for LOCATAIRE role
- Updated Settings page to show mini Trust Score badge and clickable card
- Wired up in dashboard index (case 'trust-score': return <TrustScore />)
- All lint checks pass (0 errors, 0 warnings)

Stage Summary:
- Trust Score system fully implemented with same rules as screenshots
- API computes score from profile completeness + NEOFACE + ONECI + rental file status
- Beautiful UI with animated score circle, progress bars, and recommendations
- Accessible from sidebar (Trust Score) and Settings page (mini badge + card)
- Status thresholds: 70+ Approuvé, 50-69 Sous conditions, <50 Non recommandé

---
Task ID: 7
Agent: main
Task: Resume session - Verify scoring system, fix Trust Score navigation, restart server

Work Log:
- Resumed from previous session that ran out of context
- Verified dev server was down (502 Bad Gateway from sandbox killing background processes)
- Restarted dev server multiple times (sandbox kills it after ~30s of inactivity)
- Verified scoring API works correctly with demo locataire account:
  - Score: 52/100 — "Sous conditions" (amber)
  - Profile: 2/5 (fullName ✅, phone ✅, city ❌, address ❌, gender ❌)
  - NEOFACE: 0/20 ❌
  - ONECI: 0/25 ❌
  - Dossier locataire: 50/50 ✅ (VALIDATED)
- Verified profile API (GET /api/profile) works
- Verified scoring API bug fix (APPROVED → VALIDATED) is in place
- Fixed UX issue: Trust Score mini card in locataire overview now navigates to dedicated 'trust-score' section instead of 'settings' section
- All lint checks pass (0 errors, 0 warnings)
- All scoring system files verified present and correct:
  - /api/scoring/route.ts — Scoring API
  - /api/profile/route.ts — Profile GET/PUT API
  - trust-score.tsx — Dedicated Trust Score page
  - overview.tsx — Trust Score mini card in dashboard overview
  - settings.tsx — 4-tab settings with Mon Score tab

Stage Summary:
- Scoring system fully functional (API verified working with real data)
- Trust Score mini card now correctly links to dedicated Trust Score page
- Server stability remains an issue (sandbox kills background processes) — no code fix possible
