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
