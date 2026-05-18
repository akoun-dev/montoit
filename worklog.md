---
Task ID: 1
Agent: Main
Task: Add SignatureAlias model to Prisma schema and create CRYPTONEO signature API routes

Work Log:
- Added `SignatureAlias` model to prisma/schema.prisma with fields: aliasCertificat, firstName, lastName, gender, email, phone, organisation, typePiece, hashPiece, certificateData, isActive
- Added `signatureAlias SignatureAlias?` relation to User model
- Ran `bun run db:push` successfully
- Created `/src/lib/cryptoneo.ts` helper with token caching (30min TTL), getCryptoneoToken(), cryptoneoFetch(), and type definitions
- Created 6 API routes: /api/signature/auth, generate-certificate, send-otp, sign, verify, signed-file
- Fixed CRYPTONEO auth endpoint from /auth/login to /user/auth
- Fixed response parsing to use data.data.xxx pattern (matching CRYPTONEO API structure)
- Added environment variables: CRYPTONEO_API_URL, CRYPTONEO_APP_KEY, CRYPTONEO_APP_SECRET

Stage Summary:
- SignatureAlias model live in database
- Full CRYPTONEO signature API integration available server-side
- Token caching prevents unnecessary auth calls
- Alias saved per user for reuse in future signatures

---
Task ID: 3
Agent: Main
Task: Fix État des Lieux form mobile responsiveness

Work Log:
- Removed mobile hint text about horizontal scrolling
- Added `hidden sm:block` to desktop table Card
- Added mobile-only card-based layout (`sm:hidden`) with per-designation cards
- Each card shows: row number + designation, room columns stacked vertically with BON/MAUVAIS toggles, observation input
- Key row has number inputs instead of condition toggles
- Total keys summary card at bottom
- Fixed header for small screens with text-lg, flex-wrap, truncate

Stage Summary:
- Mobile users now see a clean card layout instead of horizontal scrolling table
- Desktop users keep the existing table view
- All functionality preserved in both layouts

---
Task ID: 4-5
Agent: Main
Task: Fix PropertyDetailView details responsiveness and convert VisitTab to modal

Work Log:
- Added overflow-x-hidden to main section wrapper
- Added break-words to description and address text in DetailsTab
- Removed 'visit' from TabKey type and tabs array
- Added visitModalOpen state to PropertyDetailView
- Replaced setActiveTab('visit') with setVisitModalOpen(true) in sidebar and mobile CTA buttons
- Removed old VisitTab component (~290 lines)
- Created new VisitModal component using Dialog
- VisitModal has: visit type selection (Physique/Virtuelle), date input, time input (type="time"), notes textarea, submit button
- Renders at end of PropertyDetailView section

Stage Summary:
- Property detail view no longer overflows horizontally on mobile
- Visit planning is now a modal dialog with proper date and time inputs
- Time selection uses type="time" input instead of fixed time slot buttons
- Form resets on modal close

---
Task ID: 1-3
Agent: Main
Task: Fix TC Property Verification loading issue and rename "Historique" to "Activité"

Work Log:
- Fixed infinite loading bug in property-verify-detail.tsx: The `fetchProperty` callback set `loading=true` but never set it to `false` on early returns (after successful API calls). Changed the useEffect to use `fetchProperty().finally(() => setLoading(false))` so loading is always reset regardless of how the function exits.
- Removed the no-op useEffect (`if (!loading) setLoading(false)`) that did nothing useful.
- Renamed "Historique" → "Activité" in TC overview button text (line 778 of overview.tsx)
- Renamed "Historique" → "Activité" in TC overview quick links (line 873 of overview.tsx)
- Renamed "Historique" → "Activité" in locataire history.tsx error state heading (line 132)
- Changed error message from "Impossible de charger votre historique" → "Impossible de charger votre activité" (line 135)
- Renamed "Historique" → "Activité" in locataire history.tsx main heading (line 146)
- Lint passes cleanly with no errors

Stage Summary:
- TC property verification detail no longer gets stuck in infinite loading state
- "Historique" consistently renamed to "Activité" across TC dashboard and locataire history views

---
Task ID: 2-4
Agent: Main
Task: Fix Property Detail View Tabs Responsiveness on Mobile + Add Caching to Reduce Unnecessary Reloads

Work Log:
- **Task 2 — Tabs responsiveness:**
  - Compacted tab button spacing on mobile: `gap-1.5 px-3 py-3` → `gap-1 px-2.5 sm:px-4 py-2.5 sm:py-3`
  - Changed CommoditesTab amenity grid from `grid-cols-2 sm:grid-cols-3` to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` for better small-screen layout
  - Added `max-w-full` to ModalitesTab modePaiement badges container to prevent overflow
  - Verified `overflow-x-hidden` already present on main section wrapper

- **Task 4 — Caching:**
  - Created `src/components/providers/query-provider.tsx` — TanStack Query client provider with 1min stale time, 5min gcTime
  - Created `src/lib/use-query-helpers.ts` — Pre-built cached query hooks (usePropertyDetail, usePropertyReviews, useDashboardData, useNotifications, useTCVerifications)
  - Wrapped app with `QueryProvider` in `src/app/layout.tsx`
  - Added in-memory GET response cache to `src/lib/auth-fetch.ts` with 30s default TTL, auto-pruning, and `clearCache()` export

Stage Summary:
- Tabs are more compact and comfortable on small mobile screens
- Amenity grid stacks to 1 column on very small screens, 2 on sm, 3 on lg
- Payment mode badges no longer overflow their container on mobile
- TanStack Query is now fully wired up and available app-wide
- authFetch automatically caches GET responses for 30 seconds (configurable per-request via `cacheTtl`)
- `clearCache()` available for invalidating cache after mutations
- Lint passes cleanly

---
Task ID: 1
Agent: Main
Task: Fix TC property verification loading issue

Work Log:
- Identified bug: fetchProperty() called setLoading(true) but never called setLoading(false) on successful data fetch (early returns)
- Removed useless no-op useEffect (if (!loading) setLoading(false))
- Changed useEffect to use fetchProperty().finally(() => setLoading(false)) ensuring loading state is always cleared

Stage Summary:
- TC verification detail no longer gets stuck in infinite loading state
- Property data loads correctly for both PENDING_VERIFICATION and other status properties

---
Task ID: 2
Agent: Main
Task: Fix property detail view tabs responsiveness on mobile

Work Log:
- Made tab buttons more compact: gap-1.5 px-3 py-3 → gap-1 px-2.5 sm:px-4 py-2.5 sm:py-3
- Fixed Commodités grid: grid-cols-2 sm:grid-cols-3 → grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
- Added max-w-full to Modalités badges container to prevent overflow

Stage Summary:
- Tab bar fits better on small mobile screens with tighter spacing
- Amenity items stack in single column on tiny screens
- Payment method badges no longer overflow cards

---
Task ID: 3
Agent: Main
Task: Change TC "Historique" to "Activité"

Work Log:
- Changed button text in TC overview: "Historique" → "Activité"
- Changed quick link label: "Historique" → "Activité"  
- Changed both h1 headings in ActivityHistory component: "Historique" → "Activité"
- Changed error message: "votre historique" → "votre activité"

Stage Summary:
- All "Historique" references in TC dashboard changed to "Activité"

---
Task ID: 4
Agent: Main
Task: Add caching to reduce unnecessary reloads

Work Log:
- Created QueryProvider component with TanStack Query (1min stale, 5min GC, no refetch on focus)
- Added QueryProvider wrapper to app layout
- Created use-query-helpers.ts with pre-built cached hooks for property, reviews, dashboard, notifications, TC verifications
- Added in-memory GET response cache to auth-fetch.ts with 30s default TTL
- Cache only applies to GET requests, mutations bypass cache
- Auto-pruning when cache exceeds 100 entries
- Exported clearCache() for invalidation after mutations

Stage Summary:
- All components using authFetch now benefit from automatic GET response caching
- Dashboard data cached for 30s, property details 2min, reviews 5min, notifications 15s
- TanStack Query available for components that want more sophisticated caching
- clearCache() available for manual invalidation after mutations
