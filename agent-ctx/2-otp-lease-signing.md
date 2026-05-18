# Task 2: OTP-Based Lease Signing for Tenants

## Work Summary
Implemented secure OTP-based lease signing flow for tenants, replacing the insecure PATCH-based sign action. Added dual notifications when both parties have signed and the lease becomes ACTIVE.

## Changes Made

### 1. New API Endpoint: POST /api/leases/[id]/request-sign-otp
- File: `/src/app/api/leases/[id]/request-sign-otp/route.ts`
- Authenticates user, verifies lease ownership/tenancy, checks PENDING_SIGNATURE status
- Checks if user already signed (rejects with 400)
- Returns existing valid OTP if one exists (avoids duplicates)
- Generates new 6-digit OTP with 24-hour expiry, stored as BAIL_SIGNATURE type
- Returns otpCode in response for UI display

### 2. Updated POST /api/leases/[id]/sign/route.ts
- Added import of `notifyLeaseActivated` from `@/lib/notify`
- After existing counterparty notification, when lease becomes ACTIVE (both signed):
  - Owner signing + tenant already signed → calls notifyLeaseActivated for both parties
  - Tenant signing + owner already signed → calls notifyLeaseActivated for both parties

### 3. Updated PATCH /api/leases/[id]/route.ts (sign action)
- Added import of `notifyLeaseActivated` from `@/lib/notify`
- Same dual-notification pattern as the sign route:
  - Tenant signing + owner already signed → notifyLeaseActivated
  - Owner signing + tenant already signed → notifyLeaseActivated

### 4. Updated /src/components/dashboard/locataire/lease-detail.tsx
- Added imports: `ShieldCheck` (lucide-react), `Label` and `Input` (UI components)
- Added new state: `otpCode`, `requestedOtp`, `requestingOtp`, `otpStep`
- Added `handleRequestOtp` function: calls POST /api/leases/{id}/request-sign-otp
- Replaced `handleSign`: now calls POST /api/leases/{id}/sign with `{ otpCode }` body
- Replaced sign dialog with two-step OTP flow:
  - Step 1 ("request"): Shows "Obtenir un code OTP" button → generates OTP
  - Step 2 ("enter"): Shows OTP code prominently + input field + "Confirmer la signature" button
- Dialog resets OTP state on close
- Sign button disabled until 6-digit OTP is entered

### 5. Added notifyLeaseActivated to /src/lib/notify.ts
- New helper function that sends LEASE_UPDATE notification to BOTH tenant and owner
- Message: "Le bail pour "{title}" est maintenant actif. Les deux parties ont signé électroniquement."
- Uses Promise.all for parallel delivery

## Verification
- Lint passes with zero errors
- Dev server compiles successfully
- All changes are backward-compatible
