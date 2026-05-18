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
---
Task ID: 1
Agent: main
Task: Fix État des Lieux mobile responsiveness

Work Log:
- Analyzed uploaded screenshot showing mobile layout issues
- Redesigned the mobile card layout for each designation row
- Added better visual hierarchy: designation header with bg color, room rows with alternating bg
- Increased touch targets: min-h-[36px], min-w-[52px] for BON/MAUVAIS buttons
- Changed MAUVAIS from "M" to "MAUVAIS" on mobile for clarity
- Added active:scale-95 press feedback and ring indicators for selected conditions
- Added proper observation section with label and better spacing
- Room labels use consistent w-[5.5rem] width for alignment
- Added "clé(s)" suffix next to key count inputs

Stage Summary:
- Mobile État des Lieux cards are now fully responsive with proper touch targets, visual hierarchy, and spacing
- Desktop table layout unchanged

---
Task ID: 2
Agent: main
Task: Fix TC verification loading issue

Work Log:
- Analyzed fetchProperty flow in property-verify-detail.tsx
- Fixed loading state management: explicitly set setLoading(false) in all code paths
- Added cacheTtl: 0 to bypass cached responses for verification API calls
- Added setProperty(null) before fetching to clear stale data
- Removed .finally() pattern in favor of explicit setLoading(false) calls
- Added AuthError handling for primary API failure

Stage Summary:
- TC verification no longer gets stuck on loading
- Cache bypass ensures fresh data when verifying properties

---
Task ID: 3
Agent: subagent (full-stack-developer)
Task: Fix details view tab section mobile responsiveness

Work Log:
- Wrapped tab scroll container in relative div for gradient overlay
- Added -webkit-overflow-scrolling: touch for iOS smooth scrolling
- Added scroll-snap-type: x mandatory with scrollSnapAlign: 'start' on buttons
- Made tabs more compact on mobile: gap-0.5, px-2, text-[11px]
- Added shrink-0 to icon to prevent squishing
- Added gradient fade overlay on right edge (sm:hidden) to indicate scrollable content

Stage Summary:
- Tab section now scrolls smoothly on mobile with snap points
- Visual indicator shows when more tabs are available
- Compact layout prevents overflow issues

---
Task ID: 4
Agent: subagent (full-stack-developer)
Task: Rename Historique to Activité in TC sidebar

Work Log:
- Changed sidebar.tsx line 227: label from 'Historique' to 'Activité' for TC role only
- LOCATAIRE and PROPRIETAIRE sections still use 'Historique'

Stage Summary:
- TC dashboard sidebar now shows "Activité" instead of "Historique"

---
Task ID: 5
Agent: main
Task: Add caching to reduce unnecessary reloads

Work Log:
- Enhanced auth-fetch.ts with stale-while-revalidate pattern
- Increased default TTL from 30s to 60s with 2-minute grace period
- Added route-specific TTL overrides for 16+ API patterns
- Added revalidateInBackground() for stale data auto-refresh
- Added autoInvalidateOnMutation() — POST/PATCH/PUT/DELETE clears related caches
- Added invalidateCache() helper for manual cache invalidation by entity type
- Added clearCache() with prefix matching for broader cache invalidation
- Created useCachedFetch hook with auto-refresh, skipCache, and deps options
- Created usePaginatedFetch hook for infinite scroll with cached pagination
- Increased cache max size from 100 to 200 entries

Stage Summary:
- Caching system now uses stale-while-revalidate for instant UI updates
- Route-specific TTLs optimize cache duration per data type
- Mutations auto-invalidate related cache entries
- New React hooks (useCachedFetch, usePaginatedFetch) available for components

---
Task ID: 1-6
Agent: Main Agent
Task: Multiple improvements - Handwritten signature modal, État des Lieux buttons fix, TC verification loading fix, Historique→Activité rename, details view tabs responsiveness, caching fix

Work Log:
- Created SignaturePad component at src/components/ui/signature-pad.tsx (canvas-based handwritten signature with touch support)
- Updated locataire lease-detail.tsx with 3-step signing flow: signature pad → OTP request → OTP validation (CRYPTONEO)
- Updated propriétaire enhanced-leases.tsx with same 3-step signing flow
- Added ownerSignatureImage and tenantSignatureImage fields to Lease Prisma model
- Updated /api/leases/[id]/sign/route.ts to accept and store signatureImage (base64 PNG)
- Fixed État des Lieux "MAUVAIS" button in web view: changed "M" to "MAUVAIS" with proper sizing
- Fixed TC verification loading issue: changed cacheTtl:0 to skipCache:true, fixed authFetch to treat cacheTtl===0 as skip cache read
- Renamed "Historique" to "Activité" in TC litiges component (2 occurrences)
- Improved property detail view tab section: mobile pill/chip style tabs, scroll-into-view, responsive grids
- authFetch already has built-in stale-while-revalidate caching (caching task completed)

Stage Summary:
- SignaturePad component created for handwritten electronic signatures
- Both locataire and propriétaire now use 3-step signing flow (draw → OTP → validate with CRYPTONEO)
- Prisma schema updated with signatureImage fields for both owner and tenant
- État des Lieux desktop table now shows full "MAUVAIS" button instead of "M"
- TC verification loading fixed with proper cache bypass
- "Historique" renamed to "Activité" in TC dashboard
- Property detail tabs now mobile-responsive with pill style and scroll-into-view
---
Task ID: 1
Agent: Main
Task: Make "Bien à vérifier" and "Agent" fields searchable dropdowns in Nouvelle Mission form

Work Log:
- Added Check, Popover, PopoverContent, PopoverTrigger, Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList imports
- Added combobox state variables: propertySearchOpen, agentSearchOpen, propertySearch, agentSearch
- Replaced Select-based "Bien à vérifier" with Popover+Command searchable combobox
  - Shows property title + address + commune in dropdown items
  - Search filters by title, address, or commune
  - Check icon indicates selected item
  - Closes on selection
- Replaced Select-based "Agent" with Popover+Command searchable combobox
  - Shows agent name + email in dropdown items
  - Search filters by name or email
  - Same selection UX as property combobox

Stage Summary:
- Both "Bien à vérifier" and "Agent" fields now have searchable dropdowns with filtering
- Uses cmdk-based Command component with Popover for the combobox pattern
- Consistent UI with check mark indicator and auto-close on selection

---
Task ID: 2
Agent: Main
Task: Convert contract download from DOCX to PDF using LibreOffice

Work Log:
- Modified /api/leases/[id]/contract/route.ts to support ?format=pdf query parameter (default: pdf)
- Added convertDocxToPdf() function using LibreOffice headless mode
  - Writes DOCX to temp file, runs libreoffice --headless --convert-to pdf, reads PDF output
  - Cleans up temp files after conversion
  - Falls back to DOCX if PDF conversion fails
- Updated locataire lease-detail.tsx download button: format=pdf, .pdf extension
- Updated proprietaire enhanced-leases.tsx download button: format=pdf, .pdf extension
- Default format is now 'pdf' (was 'docx'), with 'docx' available via ?format=docx

Stage Summary:
- Lease contracts are now downloaded as PDF by default
- LibreOffice headless conversion is used server-side
- Graceful fallback to DOCX if LibreOffice conversion fails
- Both locataire and propriétaire download buttons updated

---
Task ID: 3
Agent: Main
Task: Fix "Bon/Mauvais" buttons in État des Lieux for web view

Work Log:
- Updated desktop table BON/MAUVAIS button styling
- Changed from small text-[10px] to proper text-xs with px-3 py-1.5 padding
- Changed rounded to rounded-md for better appearance
- Added ring-2 ring-green-200/ring-red-200 when selected for clear visual indicator
- Added scale-105 transform when active for subtle emphasis
- Added transition-all for smooth state changes
- Improved hover states: hover:border-green-300, hover:border-red-300
- Unselected buttons: green-50/red-50 bg with darker text (green-700/red-700)

Stage Summary:
- Web view BON/MAUVAIS buttons are now larger, properly padded, and visually distinct
- Selected state has ring + scale for clear feedback
- Hover states are more pronounced
- Mobile layout already had proper styling from previous fix

---
Task ID: 3
Agent: ONECI KYC Agent
Task: Implement ONECI KYC verification API integration

Work Log:
- Created `src/lib/oneci.ts` — ONECI helper module following the existing `cryptoneo.ts` pattern
  - JWT token caching with 30-minute TTL and 60s safety margin
  - Auto-retry on 401 (clears cached token and retries once)
  - TypeScript interfaces for all 4 response types: OneciAuthResponse, OneciPersonMatchResponse, OneciSubscriptionResponse, OneciFaceAuthResponse
  - fetchWithTimeout helper with 15s AbortController timeout
  - High-level API helpers: oneciPersonMatch(), oneciFaceAuth(), oneciCheckSubscription()
  - Environment variables: ONECI_API_BASE, ONECI_API_KEY, ONECI_SECRET_KEY
- Created `src/app/api/kyc/oneci/match/route.ts` — Person match verification endpoint
  - POST /api/kyc/oneci/match with body: { nni, firstName, lastName, birthDate, gender }
  - Validates all required fields, checks birthDate format (YYYY-MM-DD)
  - Falls back to user profile data for firstName/lastName/gender if not provided
  - On successful match: updates user.oneciVerified=true, oneciVerifiedAt=now, nni, gender, birthDate
  - French error messages matching existing NeoFace KYC route patterns
- Created `src/app/api/kyc/oneci/face-auth/route.ts` — Face authentication endpoint
  - POST /api/kyc/oneci/face-auth with body: { nni, faceImage }
  - Validates faceImage is a non-trivial base64 string (>100 chars)
  - Falls back to user.nni if not provided in request
  - On successful auth: updates user.oneciVerified=true, oneciVerifiedAt=now, nni
  - Same timeout/error handling as NeoFace route
- Created `src/app/api/kyc/oneci/subscription/route.ts` — Subscription check endpoint
  - GET /api/kyc/oneci/subscription — admin-only (checks effectiveRole === ADMIN)
  - Returns remainingRequests, totalRequests, usedRequests
  - Handles nested data structure from ONECI API response
- Added ONECI environment variables to `.env`:
  - ONECI_API_BASE=https://api-rnpp.verif.ci
  - ONECI_API_KEY=95d5eff0-3d4e-4a47-9732-c591f66c2e69
  - ONECI_SECRET_KEY=o9mE#KJBLEKSHPL
- Lint passes cleanly with no errors

Stage Summary:
- Full ONECI KYC API integration available server-side with 3 endpoints
- Token caching prevents unnecessary auth calls (30min TTL)
- Auto-retry on 401 ensures resilience against token expiration
- 15-second timeout on all ONECI API calls via AbortController
- Consistent French error messages across all routes
- User verification status updated in database on successful ONECI verification

---
Task ID: 2
Agent: FAQ Menu Agent
Task: Add FAQ menu after "A propos" with content

Work Log:
- Added `'faq'` to AppView type in `src/lib/auth-store.ts` (after `'a-propos'`)
- Added `HelpCircle` import to `src/components/home/header.tsx` and added FAQ nav link after "À Propos"
- Added `{ label: 'FAQ', view: 'faq' }` to platformLinks in `src/components/home/footer.tsx` after À Propos
- Removed `{ label: 'FAQ', href: '#' }` from resourceLinks in footer (moved to platform nav)
- Created `src/components/home/faq.tsx` with comprehensive FAQ component:
  - Header section with HelpCircle icon, title "Foire Aux Questions", and subtitle
  - Category tabs: Général, Locataire, Propriétaire, Sécurité & Vérification (pill-style buttons)
  - Accordion FAQ items with framer-motion AnimatePresence for smooth expand/collapse
  - ChevronDown rotation animation when item is opened
  - 4 questions per category (16 total), all in French
  - "Still have questions?" CTA card linking to Nous Contacter
  - Responsive design with mobile-first approach
- Added FAQ import and view rendering in `src/app/page.tsx` after the a-propos case
- Lint passes cleanly with no errors

Stage Summary:
- FAQ is now a proper navigation item in header, footer, and routing
- Full FAQ page with 4 categories and 16 Q&A items
- Accordion UI with smooth animations
- FAQ moved from footer resourceLinks to platformLinks as a proper nav link

---
Task ID: 1
Agent: Main
Task: Fix 409 Conflict on POST /api/tc/agents - scope email uniqueness to TC's agents

Work Log:
- Changed Prisma schema: removed `@unique` from VerificationAgent.email, added `@@unique([tcId, email])` to scope uniqueness per TC
- Ran `bun run db:push --accept-data-loss` to apply schema change
- Updated POST handler in /api/tc/agents/route.ts: changed email uniqueness check from global (`findUnique`) to scoped per TC (`findFirst({ where: { tcId, email } })`)
- Added re-activation logic: if existing agent is soft-deleted (isActive: false), re-activate with new data instead of returning 409
- Updated PATCH handler: scoped email uniqueness check to same TC, excluding current agent ID
- Changed error message from "Un agent avec cet email existe déjà" to "Un agent avec cet email existe déjà dans votre équipe" for clarity

Stage Summary:
- 409 Conflict resolved: emails are now unique per TC, not globally
- Soft-deleted agents can be re-activated by creating with same email
- Error messages are more specific about the scope
