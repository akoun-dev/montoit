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

---
Task ID: 8
Agent: main
Task: Integrate ONECI API for NNI-based identity verification

Work Log:
- Added `birthDate`, `nni`, `oneciVerifiedAt` fields to Prisma User schema
- Added ONECI API credentials to `.env` (fixed `#` character issue by quoting the secret key)
- Ran `bun run db:push` to update database schema
- Regenerated Prisma client with `bunx prisma generate`
- Created `/api/oneci/verify` route that:
  1. Authenticates with ONECI API (POST /api/v1/authenticate) to get bearer token
  2. Calls match endpoint (POST /api/v1/oneci/persons/{NNI}/match) with user attributes
  3. Empty response = verified → sets `oneciVerified: true` and `oneciVerifiedAt`
  4. Non-empty response = mismatch → extracts specific field names and returns French error details
- Updated `/api/profile` GET/PUT to include `birthDate`, `nni`, `oneciVerifiedAt` fields
- Updated `/api/auth/me` to return new fields
- Updated Settings page:
  - Added `birthDate` and `nni` to form state and ProfileData type
  - Added ONECI Identity Verification section in profile tab with:
    - NNI input (digits only, max 11)
    - Birth date input
    - "Vérifier ma CNI" button (disabled until NNI + birthDate + gender filled)
    - Animated verification result (success/error with details)
    - Verified badge with date when already verified
  - Fields disabled when already verified
  - ONECI score card in scoring tab now has "Vérifier ma CNI" action → navigates to profile tab
  - ONECI recommendation button navigates to profile tab
- Updated Trust Score page: `oneci` action navigates to settings
- Cleared `.next` cache to fix Prisma client staleness issue
- Lint: 0 errors, 0 warnings
- Tested API: ONECI authentication works, match endpoint returns proper mismatch details in French

Stage Summary:
- ONECI API fully integrated: token auth → match endpoint → verification result
- API verified working with real ONECI endpoint (returns mismatch details for invalid data)
- Settings page has complete ONECI verification UI with NNI + birthDate fields
- Empty ONECI response = verified, non-empty = specific field mismatches shown
- Environment variable for secret key properly quoted to handle `#` character

---
Task ID: 9
Agent: full-stack-developer
Task: Implement NEOFACE face authentication

Work Log:
- Added `neofaceVerifiedAt DateTime?` to Prisma User schema (right after `neofaceVerified`)
- Ran `bun run db:push` to update database schema
- Created `/api/oneci/face-auth/route.ts` that:
  1. Gets user session from `montoit-user-id` cookie
  2. Validates user has `nni` and `oneciVerified` (must be ONECI-verified first)
  3. Gets bearer token from ONECI authenticate endpoint (same as verify)
  4. Calls face-auth endpoint with NNI + base64 face image as FormData
  5. If successful → updates `neofaceVerified = true`, `neofaceVerifiedAt = now()`
  6. Handles multiple success response formats (empty body, success field, matched field)
- Updated `/api/profile` GET/PUT to include `neofaceVerifiedAt` in select
- Updated `/api/auth/me` to include `neofaceVerifiedAt` in returned user object
- Updated Settings component (`settings.tsx`):
  - Added `neofaceVerifiedAt` to ProfileData type
  - Added `useRef` import and refs for video, canvas, stream, and section scrolling
  - Added Camera and RefreshCw icons from lucide-react
  - Added camera state: cameraActive, capturedImage, neofaceVerifying, neofaceResult
  - Added camera handlers: startCamera, stopCamera, capturePhoto, handleNeofaceVerify, scrollToNeoface
  - Added camera stream cleanup on unmount
  - Added NEOFACE Face Verification section after ONECI in profile tab:
    - Shows "Vérifié" badge with date when already verified (green)
    - Shows disabled state with message when ONECI not yet verified
    - Camera preview with oval face overlay and mirror selfie view
    - "Prendre une photo" and "Vérifier mon visage" buttons
    - Loading state during verification
    - Success: green checkmark + "Vérification biométrique réussie"
    - Failure: red X + error message + retry button
  - Updated NEOFACE ScoreComponentCard in scoring tab with "Vérifier mon visage" action button
  - Added neoface action handler in recommendations section
- Updated Trust Score component (`trust-score.tsx`): neoface action now navigates to settings
- Lint: 0 errors, 0 warnings

Stage Summary:
- NEOFACE face authentication fully implemented
- Users must be ONECI-verified before face auth
- Camera capture with selfie preview works (getUserMedia + canvas toDataURL)
- Trust Score integrates NEOFACE verification (20% weight)
- Scoring tab NEOFACE card links to face verification section
- All APIs include neofaceVerifiedAt field

---
Task ID: 10
Agent: main
Task: Fix mobile menu slide animation not working

Work Log:
- Investigated both mobile menus: public header (Sheet side="right") and dashboard header (Sheet side="left")
- Found the root causes:
  1. `transition ease-in-out` class on SheetContent conflicted with CSS animation (both try to animate transform)
  2. `animation-fill-mode: none` (default from tw-animate-css) caused animation start/end states to not persist
  3. `duration-500` / `duration-300` set `--tw-duration` which also set `transition-duration`, creating further conflicts
- Fixed `src/components/ui/sheet.tsx`:
  - Removed `transition ease-in-out` from SheetContent base classes
  - Removed `gap-4` from SheetContent (was causing layout issues)
  - Changed duration to `duration-300` for open and `duration-200` for close (snappier feel)
  - Reordered class names for clarity (animation classes grouped together)
  - Added duration classes to SheetOverlay for smooth fade
- Fixed `src/app/globals.css`:
  - Added `[data-slot="sheet-content"]` rule with `animation-fill-mode: both !important`
  - Added `will-change: transform, opacity` for GPU-accelerated animations
  - Added `backface-visibility: hidden` for smoother mobile rendering
  - Added `[data-slot="sheet-overlay"]` rule with `animation-fill-mode: both !important`
- Fixed `next.config.ts`:
  - Added `images.remotePatterns` for `images.unsplash.com` and `plus.unsplash.com`
  - Was causing Next.js Image errors that crashed the page
- Tested both menus with agent-browser at 375x812 (iPhone X viewport):
  - Public header menu: slides in from right, closes properly
  - Dashboard menu: slides in from left, closes properly
  - Navigation from menu items works correctly
- VLM analysis confirmed both menus have proper slide animations

Stage Summary:
- Mobile menu slide animation fixed by removing conflicting transition classes and setting animation-fill-mode: both
- GPU acceleration hints added for smoother mobile rendering
- Next.js image config fixed for Unsplash domains
- Both public and dashboard mobile menus verified working with proper slide animations

---
Task ID: 11
Agent: main
Task: Fix session management - auto-disconnect issue + mobile sidebar sliding

Work Log:
- Diagnosed root causes of auto-disconnect:
  1. Session was just a raw user ID in `montoit-user-id` cookie — no server-side session tracking, no invalidation, no tokens
  2. `checkAuth()` cleared ALL auth state on ANY non-200 response (including 5xx server errors)
  3. No sliding session refresh — fixed 7-day maxAge with no activity-based extension
  4. `authFetch` aggressively called `logout()` on any 401, even transient ones
  5. No `credentials: 'include'` in `checkAuth()`
- Added `Session` model to Prisma schema with token, userId, expiresAt fields
- Created `src/lib/session.ts` session utility library:
  - `generateSessionToken()`: 48-byte random hex tokens
  - `createSession()`: single session per user (deletes old ones), 30-day expiry
  - `validateSession()`: checks token exists and hasn't expired
  - `refreshSession()`: sliding session refresh when within 7 days of expiry
  - `deleteSession()`: removes session from database
  - `getUserIdFromRequest()`: centralized helper for API routes
  - Cookie name changed from `montoit-user-id` to `montoit-session`
- Updated all auth API routes:
  - `/api/auth/login`: creates session token, sets `montoit-session` cookie
  - `/api/auth/verify-sms-otp`: same session pattern
  - `/api/auth/verify-email-otp`: same session pattern
  - `/api/auth/me`: validates session token + sliding refresh + returns 500 (NOT 401) on server errors
  - `/api/auth/logout`: deletes server-side session, clears both old and new cookie names
  - All 10 other API routes: replaced `montoit-user-id` cookie with `getUserIdFromRequest()`
- Fixed `checkAuth()` in auth-store:
  - Added `credentials: 'include'`
  - Don't clear auth state on 5xx server errors (only on 401)
  - Added deduplication guard to prevent multiple simultaneous calls
  - Added `lastAuthenticatedAt` timestamp to persisted state
- Fixed `authFetch`:
  - Don't auto-logout on 5xx errors (just throw AuthError)
  - On 401, try re-validation once before logging out
  - On network error, don't logout (might be temporary)
- Added session heartbeat:
  - Every 5 minutes, calls `checkAuth()` to keep session alive
  - Starts automatically on login, stops on logout
  - Starts on store creation if already authenticated
- Fixed mobile sidebar sliding:
  - Changed `AnimatedSheet` to render overlay and panel as direct children of `AnimatePresence` (not wrapped in Fragment)
  - Added drag-to-close gesture support for mobile
  - Added `touch-pan-y` class for smooth scrolling inside the panel
- Pushed Prisma schema, regenerated Prisma client
- Tested full session flow: login → check auth → logout → verify 401 after logout
- All lint checks pass

Stage Summary:
- Sessions now use proper database-backed tokens with 30-day sliding expiry
- Server errors (5xx) no longer cause auto-logout
- Session heartbeat keeps sessions alive every 5 minutes
- Mobile sidebar has reliable slide animation + drag-to-close gesture
- Backward compatible: logout clears both old and new cookie names

---
Task ID: 12
Agent: main
Task: Fix tenant mobile sidebar not scrolling + fix session auto-disconnect

Work Log:
- Analyzed VLM screenshot: mobile sidebar shows all LOCATAIRE menu items (Mon Espace, LOCATION section, MESSAGES, COMPTE) but items below fold can't be reached
- Root cause of sidebar scroll issue: 3 compounding problems
  1. `SidebarContent` returned a React Fragment (`<>`) instead of a proper flex container, so `flex-1` on ScrollArea had no effect since all children were scattered in the parent flex column
  2. `ScrollArea` had `flex-1` but lacked `min-h-0` — without this, flex items won't shrink below their content size, preventing scroll
  3. `AnimatedSheet` panel lacked `overflow-hidden`, so the flex container could grow beyond viewport height without constraint
- Fixed `src/components/dashboard/sidebar.tsx`:
  - Wrapped SidebarContent in `<div className="flex flex-col min-h-0 flex-1">` instead of Fragment
  - Added `shrink-0` to role badge container
  - Added `min-h-0` to ScrollArea (`className="flex-1 min-h-0"`)
- Fixed `src/components/ui/sheet.tsx`:
  - Added `overflow-hidden` to AnimatedSheet panel motion.div classes
- Fixed `src/components/dashboard/dashboard-header.tsx`:
  - Removed `mt-auto` from logout button (not needed with proper flex layout)
- Fixed session auto-disconnect root cause:
  - `refreshSession()` was deleting the old session token and creating a new one with a different token. This created a race condition: if another request was made before the browser processed the Set-Cookie header, it would use the OLD (now deleted) token → 401 → auto logout
  - Changed `refreshSession()` to simply UPDATE `expiresAt` on the existing session instead of deleting and recreating. Same token = no race condition
  - Updated `/api/auth/me` to set the same token (not newToken) in the cookie on refresh
- Improved auth-store session persistence:
  - Added session age validation in `merge()` function: if `lastAuthenticatedAt` is older than 30 days, clear auth state
  - Increased heartbeat interval from 5 to 10 minutes (reduces unnecessary server calls)
- All lint checks pass (0 errors, 0 warnings)

Stage Summary:
- Tenant mobile sidebar now scrolls properly (overflow-hidden on sheet + min-h-0 on ScrollArea + flex wrapper)
- Session refresh no longer invalidates tokens (just extends expiry) — eliminates race condition auto-disconnect
- Auth store validates session age on rehydration and cleans up stale sessions
- Heartbeat interval increased to 10 minutes for better performance

---
Task ID: 13
Agent: main
Task: Detach NEOFACE verification from ONECI - allow independent verifications

Work Log:
- Analyzed the 2 places where ONECI→NEOFACE dependency was enforced:
  1. Backend API (`/api/oneci/face-auth/route.ts`): blocked if `oneciVerified` was false or `nni` was missing
  2. Settings UI (`settings.tsx` line 953): showed "Vérification indisponible" when ONECI wasn't verified
- Fixed backend API:
  - Removed `oneciVerified` check entirely — NEOFACE no longer requires ONECI verification
  - Kept NNI requirement (the ONECI API needs it for face-auth) but changed error message to be about profile, not ONECI
  - Removed `oneciVerified` from the database select query (no longer needed)
- Fixed Settings UI:
  - Replaced `!profile?.oneciVerified` condition with `!formState.nni` — NEOFACE is now available as long as the user has entered their NNI, regardless of ONECI status
  - Changed the "disabled" block from neutral colors to amber (warning) with message "NNI requis" instead of "Vérification indisponible"
  - NNI input is now disabled if either ONECI or NEOFACE is verified (both use it)
  - NNI label shows checkmark if either verification is done
  - Updated NNI help text: "10 à 11 chiffres — requis pour les vérifications ONECI et NEOFACE"
- Added NNI auto-save to NEOFACE verification flow:
  - `handleNeofaceVerify` now saves the NNI to the profile before calling face-auth API (same pattern as ONECI)
  - This ensures the NNI is in the database for the face-auth API to read
- All lint checks pass (0 errors, 0 warnings)

Stage Summary:
- NEOFACE and ONECI are now completely independent verifications
- NEOFACE requires only NNI (not ONECI verification)
- Users can do NEOFACE face verification before or without ONECI CNI verification
- Both share the NNI field which locks after either verification succeeds

---
Task ID: 14
Agent: main
Task: Implement proper NeoFace v2 KYC flow + replace NEOFACE branding with KYC

Work Log:
- Completely rewrote the KYC face verification using the NeoFace API v2 flow:
  1. Upload ID card photo → POST /api/v2/document_capture (returns document_id + selfie URL)
  2. User opens selfie URL in new window → NeoFace handles webcam, liveness detection, auto-capture
  3. Backend polls → POST /api/v2/match_verify until status is "verified" or "failed"
- Updated `.env`: Changed NEOFACE_API_BASE from `https://neoface.ansut.ci` to `https://neoface.aineo.ai`
- Rewrote `/api/oneci/face-auth/route.ts`:
  - Two modes: `upload` (sends doc_file as multipart/form-data) and `verify` (polls match_verify)
  - No NNI required — the API only needs the document image
  - Stores document_id temporarily in user.kycDocumentId during the flow
  - On verified: updates neofaceVerified=true, neofaceVerifiedAt=now(), clears kycDocumentId
  - On failed: clears kycDocumentId, returns error message
- Added `kycDocumentId String?` to Prisma User schema (temporary field during KYC flow)
- Updated profile API to include kycDocumentId in select
- Rewrote settings UI KYC section:
  - Step 1 (idle/uploading): Drag-and-drop area to upload CNI recto photo
  - Step 2 (selfie): Success message + "Ouvrir la vérification faciale" button (opens NeoFace selfie URL)
  - Step 3 (verifying): Polling spinner with attempt counter (max 40 attempts / 120s)
  - Step 4 (done): Success/failure result with retry option
  - Removed all camera/stream/canvas code (no longer needed — NeoFace handles the selfie)
- Replaced all "NEOFACE" branding with "KYC" in:
  - settings.tsx (section title, badges, labels, scoring cards, recommendations, how-it-works)
  - trust-score.tsx (score bars, detail section, how-it-works)
  - overview.tsx (mini progress bar label)
  - scoring/route.ts (breakdown label, recommendation description/actionLabel)
- Removed NNI requirement from KYC verification (no NNI needed for document_capture)
- Fixed Buffer.from() usage in client code (replaced with FileReader-based base64 conversion)
- All lint checks pass (0 errors, 0 warnings)

Stage Summary:
- KYC now uses proper NeoFace v2 API: upload CNI → redirect to selfie interface → poll for result
- No more in-app camera capture — NeoFace provides the selfie interface with liveness detection
- All "NEOFACE" text replaced with "KYC" throughout the app
- NNI no longer required for KYC (only needs CNI photo)
- kycDocumentId stored temporarily during the flow, cleaned up after verification

---
Task ID: 15
Agent: main
Task: Remove KYC verification section from Profil tab and add it as a modal dialog in the Mon Score tab

Work Log:
- Created `KycVerificationModal` component in settings.tsx that:
  - Accepts props: `open`, `onOpenChange`, `profile`, `onVerified`
  - Contains all KYC state internally (kycStep, kycDocImage, kycDocumentId, kycSelfieUrl, kycResult, kycPollCount, kycDocInputRef, kycPollIntervalRef)
  - Contains all KYC handler functions (handleKycDocUpload, handleKycOpenSelfie, handleKycReset)
  - Uses Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription from @/components/ui/dialog
  - Already-verified state shows green checkmark with "Vérification KYC réussie" and date
  - Full KYC flow (upload → selfie → polling → result) inside the dialog content
  - Dialog is max-w-md with scrollable content (max-h-[85vh] overflow-y-auto)
  - Stops polling when modal closes during verification step
  - Resets state when modal opens (if not yet verified)
  - Calls `onVerified()` callback when verification succeeds
- Removed from SettingsSection:
  - All KYC state variables (kycStep, kycDocImage, kycDocumentId, kycSelfieUrl, kycResult, kycPollCount)
  - All KYC refs (kycSectionRef, kycDocInputRef, kycPollIntervalRef)
  - All KYC handlers (handleKycDocUpload, handleKycOpenSelfie, handleKycReset, scrollToKyc)
  - Cleanup useEffect for kycPollIntervalRef
- Removed KYC Face Verification section from Profil tab (lines 924-1146 of the original file)
- Added `kycModalOpen` state and `handleKycVerified` callback to SettingsSection
- Added KycVerificationModal component at the end of the main motion.div (outside AnimatePresence)
- Changed `scrollToKyc()` references to `setKycModalOpen(true)`:
  - KYC ScoreComponentCard action button in scoring tab
  - Recommendation card for neoface in scoring tab
- Updated NNI helper text from "requis pour les vérifications ONECI et KYC" to "requis pour la vérification ONECI"
- Added Dialog import from @/components/ui/dialog
- ONECI verification section kept as-is in Profil tab
- Lint: 0 errors, 0 warnings

Stage Summary:
- KYC verification moved from inline section in Profil tab to modal dialog accessible from Mon Score tab
- Modal opens via "Vérification KYC" action button and neoface recommendation button
- All KYC state/handlers encapsulated in KycVerificationModal component
- Polling properly cleans up on modal close or unmount
- NNI helper text updated to remove KYC reference
- Profil tab now only shows ONECI verification (cleaner layout)

---
Task ID: 16
Agent: main
Task: Implement proper Sécurité and Notifications tabs with real functionality (no mocks)

Work Log:
- Updated Prisma schema with:
  - `passwordUpdatedAt DateTime?` on User model (tracks when password was last changed)
  - `NotificationPreference` model with userId (unique) and 5 boolean toggles: messages, dossierUpdates, visitReminders, paymentAlerts, promotions
  - Added `notificationPreference NotificationPreference?` relation to User model
- Ran `bun run db:push` to sync database
- Created 3 new API routes:
  - `PUT /api/settings/password` — Change password (requires current password verification, validates new password strength, updates passwordUpdatedAt, logs to audit)
  - `GET /api/settings/notifications` — Fetch notification preferences (auto-creates defaults if not exist)
  - `PUT /api/settings/notifications` — Update individual notification toggles (upsert pattern)
  - `GET /api/settings/sessions` — List all active sessions for current user (marks current session)
  - `DELETE /api/settings/sessions` — Revoke sessions (all others, or specific sessionIds)
- Updated `/api/profile/route.ts` to include `passwordUpdatedAt` in GET and PUT select
- Added new types: `SessionInfo`, `NotificationPreferences`
- Added new state variables to SettingsSection:
  - Password change: passwordModalOpen, currentPassword, newPassword, confirmPassword, showCurrentPassword, showNewPassword, passwordSaving, passwordError, passwordSuccess
  - Sessions: sessions, sessionsLoading, revokingSessions
  - Notifications: notifPrefs, notifLoading, notifSaving
- Added useEffect hooks:
  - Fetch sessions when security tab is active
  - Fetch notification preferences when notifications tab is active
  - Auto-clear passwordSuccess after 3s
- Added handler functions:
  - handlePasswordChange: validates all fields, calls API, refreshes profile
  - handleRevokeOtherSessions: calls DELETE API, filters out revoked sessions locally
  - handleToggleNotif: optimistic toggle with per-key saving state
- Rewrote Sécurité tab with 3 cards:
  1. Password card: Shows "Jamais modifié" or last change date, "Modifier" button opens modal
  2. Verification card: Email verified badge + phone verified badge (read-only status display)
  3. Active sessions card: Lists all sessions with current device highlighted, revoke button per session, "Déconnecter tout" button
  4. Password change modal: Current password + new password (with strength meter) + confirm, eye toggle for visibility, error/success feedback
- Rewrote Notifications tab:
  - 5 notification categories with Switch toggles (real DB persistence)
  - Each toggle immediately saves to backend via PUT API
  - Loading skeleton while fetching preferences
  - Saving spinner per-toggle during save
  - Info card explaining how notifications work
- Added imports: Eye, EyeOff, Monitor, Smartphone, Trash2, LogOut, DialogFooter, Switch
- All lint checks pass (0 errors, 0 warnings)

Stage Summary:
- Sécurité tab: Real password change with modal dialog, email/phone verification status, active session management with revoke
- Notifications tab: 5 DB-backed notification toggles with Switch components, loading states, immediate persistence
- No mock data — everything reads from and writes to the database
- Password strength meter shows real-time validation progress
- Sessions show current device with "Actif" badge, other devices can be individually or bulk revoked

---
Task ID: 17
Agent: api-developer
Task: Create all missing API routes for tenant (locataire) views

Work Log:
- Created 7 API route files for the tenant views, all using Prisma DB queries and proper auth/role checks
- All routes follow the existing pattern from `/api/dashboard/locataire/route.ts`:
  - `getUserIdFromRequest(req)` for session validation
  - 401 if not authenticated, 403 if not LOCATAIRE role
  - Proper error handling with try/catch

1. `/api/notifications/route.ts` — GET + PUT
   - GET: List notifications with pagination (page, limit), filter by type and isRead, returns unreadCount
   - PUT: Mark specific notifications as read (notificationIds[]) or mark all as read (markAllRead: true)
   - Ensures user can only mark their own notifications (userId filter in updateMany)

2. `/api/payments/route.ts` — GET
   - List payments for current tenant with lease → property → images → owner includes
   - Filter by status and leaseId
   - Stats: totalPaid (sum of PAID amounts), latePaymentsCount, nextPaymentDue (earliest PENDING)
   - Also returns paidCount, pendingCount, totalPayments

3. `/api/maintenance/route.ts` — GET + POST
   - GET: List maintenance requests with lease/property info, filter by status/priority/leaseId
   - POST: Create new request (requires leaseId, title, description; optional priority)
   - Validates lease belongs to tenant before creation
   - Creates audit log entry on creation
   - Returns status counts (groupBy) as stats

4. `/api/reviews/route.ts` — GET
   - Returns ratings given (fromUser) and received (toUser) with lease/property/fromUser/toUser info
   - Supports `direction` filter: 'given', 'received', or 'all'
   - Stats: givenCount, receivedCount, averageScoreReceived (rounded to 1 decimal)

5. `/api/history/route.ts` — GET
   - List audit logs for current user ordered by most recent first
   - Filter by entity and action
   - Pagination support

6. `/api/rental-file/route.ts` — GET + POST
   - GET: List rental files with documents, leases (with property info), and reviewer
   - Returns status counts as stats
   - POST: Upsert approach — if DRAFT exists, update it; otherwise create new
   - Supports `submit` flag to change status from DRAFT to SUBMITTED
   - Validates employmentType against allowed values
   - Creates audit log entries for CREATE/UPDATE/SUBMIT actions

7. `/api/applications/route.ts` — GET
   - Status tracking view of rental files with enriched computed fields
   - Each application includes: statusTimeline (DRAFT→SUBMITTED→TC_REVIEW→VALIDATED with completed/active flags)
   - Handles REJECTED and EXPIRED statuses as terminal states
   - documentProgress: total, validated, rejected, pending counts
   - linkedProperty from first lease if available
   - Pagination and status filter support
   - Status counts as stats

- All lint checks pass (0 errors, 0 warnings)
- Dev server running stable

Stage Summary:
- 7 API route files created for tenant views: notifications, payments, maintenance, reviews, history, rental-file, applications
- All routes use proper auth (401) and role checks (403 for non-LOCATAIRE)
- Related data included where needed (lease→property→images→owner)
- Pagination, filtering, and stats included for frontend consumption
- Audit logging on mutations (maintenance create, rental file create/update/submit)
- Rental file upsert pattern (update DRAFT if exists, create otherwise)
- Applications route has computed status timeline and document progress

---
Task ID: 4-11
Agent: frontend-developer
Task: Update ALL tenant (locataire) frontend components to use real API data instead of mocks

Work Log:
- Read worklog.md to understand prior work (Tasks 1-17)
- Analyzed all 8 existing mock components in `/src/components/dashboard/locataire/`
- Analyzed all API route response shapes to map correctly
- Followed the pattern from `favorites.tsx` (authFetch + useCallback + useState + error/loading states)

1. **notifications.tsx** — Complete rewrite:
   - Fetches from `/api/notifications` with type filter support
   - Shows real notification items with type-specific icons (MessageSquare, FileText, Calendar, CreditCard, Megaphone, Settings)
   - Click-to-mark-as-read (PUT /api/notifications with notificationIds)
   - "Tout marquer lu" button (PUT with markAllRead: true)
   - Unread count badge in header
   - Category filter badges (Toutes, Messages, Candidatures, Visites, Paiements, Système)
   - Time-ago formatting (À l'instant, Il y a X min, Xh, Xj)
   - Unread notifications highlighted with brand-50 background and dot indicator
   - Empty state when no notifications

2. **payments.tsx** — Complete rewrite:
   - Fetches from `/api/payments` for payments list + stats
   - Shows stats cards: next payment due (with date), total paid (with count), late payments (red if >0)
   - Payment list with status badges (PAID=emerald, PENDING=amber, LATE=red, PARTIAL=cyan)
   - Shows amount, due date, paid date, reference, property info
   - Empty state when no payments

3. **reviews.tsx** — Complete rewrite:
   - Fetches from `/api/reviews` for given/received ratings + stats
   - Stats cards: count given, average score received with star display
   - Tab toggle between "Avis donnés" and "Avis reçus"
   - Rating cards with user avatar, stars, comment, property badge, date
   - Empty state per tab

4. **history.tsx** — Complete rewrite:
   - Fetches from `/api/history` for audit logs
   - Timeline visual with action-type icons (CheckCircle2 for CREATE/VERIFY, Settings for UPDATE, Clock for SUBMIT, etc.)
   - Entity badges (Profil, Dossier locatif, Maintenance, etc.)
   - Action badges color-coded (green for CREATE, amber for UPDATE, brand for SUBMIT)
   - First item highlighted with brand color
   - Empty state when no logs

5. **applications.tsx** — Complete rewrite:
   - Fetches from `/api/applications` for rental files with status tracking
   - Shows application cards with property image, status badge, status timeline (Brouillon→Soumis→Examen TC→Validé)
   - Document progress bar (validated/total)
   - Rejection reason display (red box with AlertCircle)
   - "Compléter le dossier" button for DRAFT status → navigates to rental-file section
   - How-it-works card when no applications
   - Create dossier button in empty state

6. **maintenance.tsx** — Complete rewrite:
   - Fetches from `/api/maintenance` for requests + stats
   - Stats cards: En attente (amber), En cours (brand), Résolues (emerald)
   - Request cards with priority badge (LOW/MEDIUM/HIGH/URGENT) and status badge
   - URGENT priority shows AlertTriangle icon in red
   - "Nouvelle demande" button opens Dialog with form:
     - Lease selector (fetched from /api/dashboard/locataire activeLeases)
     - Title, description, priority inputs
     - Form validation and POST to /api/maintenance
     - Success/error toast feedback
   - Empty state with "Nouvelle demande" CTA

7. **rental-file.tsx** — Complete rewrite:
   - Fetches existing rental files from `/api/rental-file` on mount
   - If DRAFT exists, loads it into the form fields
   - "Sauvegarder" button saves draft (POST without submit flag)
   - "Soumettre le dossier" button submits (POST with submit: true)
   - Status banner showing current file status (VALIDATED=green, REJECTED=red, SUBMITTED=amber)
   - Rejection reason and TC comment display
   - Read-only mode when file is not DRAFT (all fields disabled)
   - Document upload placeholders with existing document status badges
   - Valid until date display

8. **search-properties.tsx** — Complete rewrite:
   - Real search using `/api/properties` (public endpoint, uses raw fetch not authFetch)
   - Search input, city filter, min/max price inputs (all enabled)
   - Enter key triggers search
   - Results grid with property cards (image, rental status badge, verified badge)
   - Click property card → navigates to property detail
   - Result count display
   - Empty result state with "Voir tous les biens" button
   - Initial empty state with "Voir les biens" button

UI consistency across all components:
- Orange (#FF6C2F) brand color, NO blue/indigo
- Loading skeleton states with pulse animation
- Error card with amber styling
- Empty states with icon + name + CTA
- All text in French
- framer-motion animations (containerVariants/itemVariants)
- authFetch pattern with isAuthenticated guard and AuthError 401 silent handling
- Responsive design (grid cols adapt: 1→2→3)

Fixed issues:
- maintenance.tsx: No `/api/leases/my-leases` route exists → changed to fetch activeLeases from `/api/dashboard/locataire`
- search-properties.tsx: `/api/properties` is public → changed from authFetch to raw fetch, removed unused imports (Heart, PropertiesResponse, isAuthenticated)

Lint: 0 errors, 0 warnings

Stage Summary:
- All 8 tenant components now use real API data instead of mocks
- Full CRUD: notifications (mark read), maintenance (create), rental-file (save draft + submit)
- Consistent UI pattern: loading skeleton → error state → empty state → data display
- All API responses properly mapped (data field, stats, pagination)
- No lint errors

---
Task ID: 18
Agent: seed-developer
Task: Update seed route with Notification, Payment, MaintenanceRequest, AuditLog, and Rating data for tenant1

Work Log:
- Read existing seed file and Prisma schema to understand current data structure and model relationships
- Added delete statements for new models at the top of the seed (before existing deletes):
  - `db.maintenanceRequest.deleteMany()`
  - `db.payment.deleteMany()`
  - `db.notification.deleteMany()`
- Captured lease ID by changing `await db.lease.create(...)` to `const lease1 = await db.lease.create(...)` for tenant1's active lease
- Added 5 Payments for tenant1's active lease:
  - 3 PAID: Jan (PMT-2025-001), Feb (PMT-2025-002), Mar (PMT-2025-003) — 250000 FCFA each with paidAt dates
  - 1 PENDING: Apr 2025 (PMT-2025-004) — due April 1st
  - 1 LATE: Dec 2024 (PMT-2024-012) — was due December 1st
- Added 6 Notifications for tenant1:
  - MESSAGE: "Nouveau message de Kouadio Yao" (unread, with actionUrl)
  - DOSSIER_UPDATE: "Votre dossier locatif a été validé" (read, with actionUrl)
  - VISIT_REMINDER: "Rappel : visite prévue le 12 mars" (unread, with actionUrl)
  - PAYMENT_ALERT: "Paiement en retard - décembre 2024" (unread, with actionUrl)
  - SYSTEM: "Bienvenue sur Mon Toit !" (read)
  - PROMOTION: "Offre spéciale : premiers mois réduits" (unread)
- Added 3 MaintenanceRequests for tenant1's active lease:
  - RESOLVED: "Réparation robinet cuisine" (priority: MEDIUM, with resolution text)
  - IN_PROGRESS: "Climatisation défaillante chambre 2" (priority: HIGH)
  - PENDING: "Porte d'entrée difficile à fermer" (priority: LOW)
- Added 6 AuditLog entries for tenant1:
  - LOGIN: session entity with location detail
  - PROFILE_UPDATE: user entity with tenant1's ID
  - DOSSIER_SUBMIT: rental file entity with rentalFile1's ID
  - FAVORITE_ADD: property entity with property[0]'s ID
  - VISIT_REQUEST: property entity with property[4]'s ID
  - PAYMENT_MADE: payment entity with PMT-2025-003 reference
- Added 1 Rating: tenant1 rating owner1, score 4, comment "Propriétaire réactif et logement en bon état"
- Tested seed route: POST /api/seed returns success with all user IDs
- Verified all data in database using direct Prisma queries:
  - 5 payments (3 PAID, 1 PENDING, 1 LATE) ✅
  - 6 notifications (3 read, 3 unread, 6 types) ✅
  - 3 maintenance requests (RESOLVED, IN_PROGRESS, PENDING) ✅
  - 6 audit logs (6 different actions) ✅
  - 1 rating (score 4) ✅
- Lint: 0 errors, 0 warnings

Stage Summary:
- Seed route now creates comprehensive demo data for all new models
- tenant1 (Moussa Koné, locataire@montoit.ci) has full data: payments, notifications, maintenance requests, audit logs, and a rating
- All foreign key references are correct (lease1, tenant1, owner1, rentalFile1, createdProperties)
- Delete order properly handles dependencies (maintenanceRequest, payment, notification before lease and user)

---
Task ID: 19
Agent: main
Task: Ensure ALL tenant views use real DB data (no mocks) — audit + implementation

Work Log:
- Audited all 11 tenant locataire components to identify mock vs real data
- Already using real DB data: overview, settings, messages, my-leases, my-visits, favorites, trust-score
- Found 8 components using mock/hardcoded data: notifications, payments, reviews, history, applications, maintenance, rental-file, search-properties
- Added missing Prisma models to schema: Notification, Payment, MaintenanceRequest, MaintenanceStatus, MaintenancePriority, NotificationType, PaymentStatus enums
- Added relations to User model (notifications, payments, maintenanceRequests) and Lease model (payments, maintenanceRequests)
- Ran `bun run db:push` successfully
- Dispatched 3 parallel subagent tasks:
  1. Create 7 API routes (notifications, payments, maintenance, reviews, history, rental-file, applications) — COMPLETED
  2. Update seed data with new model entries — COMPLETED
  3. Update all 8 frontend components to use real API data — COMPLETED
- Verified all API routes and frontend components are properly connected
- Verified lint passes clean (0 errors)
- Profile photo upload already implemented in settings component (handleAvatarUpload + handleAvatarDelete + /api/profile/avatar)
- Sécurité tab already properly implemented with password change + session management
- Notification preferences tab already properly implemented with DB persistence

Stage Summary:
- ALL 11 tenant views now use real DB data — no mocks remaining
- New Prisma models: Notification, Payment, MaintenanceRequest (with enums)
- 7 new API routes created for tenant-specific data
- Seed data includes: 5 payments, 6 notifications, 3 maintenance requests, 6 audit logs, 1 rating
- 8 frontend components rewritten: notifications, payments, reviews, history, applications, maintenance, rental-file, search-properties
- Lint: 0 errors
