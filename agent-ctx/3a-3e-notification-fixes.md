# Task 3a-3e: Fix Critical Notification Gaps

## Agent: notification-fixes

## Summary
Fixed all 5 categories of notification issues across 9 files.

## Changes Made

### Fix 1: Lease Termination Notifications
- **File**: `/src/app/api/leases/[id]/terminate/route.ts`
- Added `notify` import from `@/lib/notify`
- Added dual notification to both tenant and owner when lease is terminated
- Uses LEASE_UPDATE type with "Bail résilié" title
- Identifies who terminated (le locataire / le propriétaire)

### Fix 2: Payment Receipt Confirmation
- **File**: `/src/app/api/payments/[id]/route.ts`
- Added `notify` import from `@/lib/notify`
- Added tenant notification when owner confirms receipt (confirm_receipt action)
- Uses PAYMENT_ALERT type with "Paiement confirmé par le propriétaire ✅" title
- Includes amount formatted in FCFA

### Fix 3: Notification actionUrl Navigation
- **File**: `/src/components/dashboard/locataire/notifications.tsx` (shared by Locataire, Propriétaire, Agence, TC)
- **File**: `/src/components/dashboard/admin/notifications.tsx` (Admin)
- Changed `handleMarkAsRead` to accept full `NotificationItem` instead of just `id`
- Added `setDashboardSection(notif.actionUrl)` when actionUrl exists
- Made click handlers work on read notifications with actionUrl (for navigation)
- Admin: Made Card element clickable, Mail icon on read notifications triggers navigation

### Fix 4a: Fraud Alerts
- **File**: `/src/app/api/tc/fraud-alerts/route.ts`
- Added `notifyFraudAlert` import
- On POST (create), queries all other active TC users and notifies them via `notifyFraudAlert()`

### Fix 4b: Certifications
- **File**: `/src/app/api/tc/certifications/route.ts`
- Added `notifyCertificationGranted` import
- Replaced generic `notify()` with DOSSIER_UPDATE type → `notifyCertificationGranted()` using CERTIFICATION type

### Fix 4c: Missions
- **File**: `/src/app/api/tc/missions/route.ts`
- Added `notifyMissionAssigned` import
- Changed owner notification type from DOSSIER_UPDATE to PROPERTY_VERIFICATION
- Added `notifyMissionAssigned()` for TC user (VerificationAgent has no userId, so TC user who manages agent is notified)

### Fix 4d: Properties - New Property for Moderation
- **File**: `/src/app/api/properties/route.ts`
- Added `notifyNewPropertyForModeration` and `notifyMany` imports
- Added `notifyNewProperty()` helper function
- On POST creating PENDING_VERIFICATION property: notifies admins via `notifyNewPropertyForModeration()` and TC agents via `notifyMany()` with PROPERTY_VERIFICATION type
- **File**: `/src/app/api/properties/[id]/route.ts`
- Changed TC notification type from DOSSIER_UPDATE to PROPERTY_VERIFICATION

### Fix 4e: Applications
- `/api/applications/route.ts` only has GET (no POST) — no place to add notification
- Rental file submission already notifies TC users
- No specific property owner to notify at submission stage
- `notifyNewApplication` helper remains available for future use

### Fix 5: Type Mismatches
- **5a**: `/src/app/api/leases/create/route.ts` — DOSSIER_UPDATE → LEASE_UPDATE
- **5b**: `/src/app/api/reviews/[id]/reply/route.ts` — DOSSIER_UPDATE → REVIEW
- **5c**: `/src/app/api/properties/[id]/route.ts` — DOSSIER_UPDATE → PROPERTY_VERIFICATION
- **5d/5e**: Already handled by using `notifyMissionAssigned()` and `notifyCertificationGranted()`

## Verification
- `bun run lint` passes with zero errors
- Dev server compiles successfully
