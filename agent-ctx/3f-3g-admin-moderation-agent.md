# Task 3f-3g: Fix Admin Moderation Components

## Summary
Replaced mock data in admin moderation.tsx with real API integration, and built properties-moderation.tsx from scratch.

## Backend Changes

### Updated API Routes (ADMIN access added)
1. `/src/app/api/tc/ownership-docs/route.ts` — Added ADMIN role alongside TIERS_CONFIANCE in GET and PATCH
2. `/src/app/api/tc/rental-files/route.ts` — Added ADMIN role alongside TIERS_CONFIANCE in GET and PATCH
3. `/src/app/api/history/route.ts` — Removed LOCATAIRE-only restriction; ADMIN can see all audit logs; added user relation in select

### New API Route
4. `/src/app/api/admin/properties-moderation/route.ts`
   - GET: Lists PENDING_VERIFICATION properties (ADMIN only), with search/type/commune filters
   - PATCH: Approve (→ ACTIVE + isVerified) or reject (→ SUSPENDED with reason), creates audit log, notifies owner

## Frontend Changes

### Rewritten: `/src/components/dashboard/admin/moderation.tsx`
- Removed ALL mock data
- Real API integration using authFetch
- 3 tabs: Documents de propriété, Dossiers locatifs, Signalements
- Stats cards, loading/error states, framer-motion animations
- Validate/reject actions with real API calls

### Built from scratch: `/src/components/dashboard/admin/properties-moderation.tsx`
- Property cards with image, title, type, price, address, owner, date
- Approve/reject actions with dialog
- Detail dialog for viewing full property info
- Search and type filters
- Responsive grid layout
