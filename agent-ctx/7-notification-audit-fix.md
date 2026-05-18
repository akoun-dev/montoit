# Task 7: Audit and fix notification system for all actors

## Summary
Comprehensive audit and fix of the Mon Toit notification system to ensure real-time notifications work correctly for ALL actors (Locataire, Propriétaire, Agence, TC, Admin).

## Issues Found and Fixed

### 1. Agence Dashboard Missing Notifications Route
- **File**: `/src/components/dashboard/index.tsx`
- **Issue**: Agence sidebar had 'notifications' link but the dashboard switch statement had no case for it
- **Fix**: Added `case 'notifications': return <Notifications />` to AgenceDashboard

### 2. Admin Notifications Component Using Mock Data
- **File**: `/src/components/dashboard/admin/notifications.tsx`
- **Issue**: Component accessed `d.notifications` but API returns `d.data`; fell back to `mockNotifications`; markAsRead/markAllAsRead only updated local state without API calls
- **Fix**: Rewrote component to use proper API response format (`result.data`), removed mock data fallback, added API calls for markAsRead and markAllAsRead, added MAINTENANCE/LEASE_UPDATE/MESSAGE/VISIT_REMINDER type support

### 3. Dashboard Header Not Using useNotifications Hook
- **File**: `/src/components/dashboard/dashboard-header.tsx`
- **Issue**: Header only fetched unread count once on mount (no real-time WebSocket updates)
- **Fix**: Replaced manual `useEffect` + `authFetch` with `useNotifications()` hook for real-time WebSocket-powered unread count updates

### 4. All API Routes Using `db.notification.create` Instead of `notify()` Helper
- **Issue**: 20+ API routes created notifications directly in DB, bypassing WebSocket push
- **Fix**: Replaced `db.notification.create` with `notify()` and `db.notification.createMany` with `notifyMany()` in:
  - `/api/visits/route.ts` - Visit request creation (ADDED: owner+agency notification)
  - `/api/visits/[id]/route.ts` - Visit status updates (accepted/rejected/cancelled)
  - `/api/leases/create/route.ts` - New lease creation
  - `/api/leases/[id]/sign/route.ts` - Lease signing
  - `/api/leases/[id]/route.ts` - Lease sign/modify actions
  - `/api/rental-files/[id]/action/route.ts` - Rental file accept/reject
  - `/api/tc/rental-files/route.ts` - TC rental file validation
  - `/api/maintenance/route.ts` - Maintenance request creation (ADDED: owner notification)
  - `/api/maintenance/[id]/route.ts` - Maintenance request updates
  - `/api/maintenance/[id]/comments/route.ts` - Maintenance comments
  - `/api/messages/route.ts` - Direct messages
  - `/api/messages/send/route.ts` - Already used notify() ✓
  - `/api/rental-file/route.ts` - Rental file submission (TC notification)
  - `/api/reviews/route.ts` - New review
  - `/api/reviews/[id]/reply/route.ts` - Review reply
  - `/api/profile/share/route.ts` - Profile sharing
  - `/api/owner-file/documents/route.ts` - Owner file document upload
  - `/api/properties/[id]/route.ts` - Property verification request
  - `/api/notifications/route.ts` - POST endpoint
  - `/api/tc/verifications/route.ts` - Property verification approve/reject
  - `/api/tc/oneci/route.ts` - ONECI verification
  - `/api/tc/certifications/route.ts` - Certification grant/revoke
  - `/api/tc/messages/route.ts` - TC messaging
  - `/api/tc/ownership-docs/route.ts` - Ownership document review
  - `/api/tc/missions/route.ts` - Mission creation
  - `/api/tc/litiges/route.ts` - Dispute updates (kept db.notification.create in transaction + added WebSocket push after)

### 5. Missing Notification Triggers
- **Added**: Notification to property owner when tenant creates a visit request
- **Added**: Notification to agency (if property has mandat) when tenant creates a visit request
- **Added**: Notification to property owner when tenant creates a maintenance request
- **Added**: `actionUrl` field to all notifications for proper navigation

### 6. Notification Type Categories Updated
- **File**: `/src/components/dashboard/locataire/notifications.tsx`
- **Added**: MAINTENANCE, LEASE_UPDATE, SECURITY type categories with proper icons and colors

### 7. Notification Helper Functions Added
- **File**: `/src/lib/notify.ts`
- **Added**: `notifyNewVisitRequest()`, `notifyVisitStatusUpdate()`, `notifyNewLease()`, `notifyLeaseSigned()`, `notifyRentalFileValidated()`, `notifyRentalFileRejected()`, `notifyNewMaintenanceRequest()`, `notifyMaintenanceUpdate()`, `notifyNewMessage()`

### 8. Lease Notification Type Changed
- Changed lease-related notifications from type `DOSSIER_UPDATE` to `LEASE_UPDATE` for better categorization

## Verification
- ✅ Lint passes with zero errors
- ✅ Dev server compiles successfully
- ✅ WebSocket service running on port 3003 (health check OK)
- ✅ `/api/notifications` endpoint returns 200 with proper data
- ✅ All 5 roles (Locataire, Propriétaire, Agence, TC, Admin) have notifications section accessible from sidebar
