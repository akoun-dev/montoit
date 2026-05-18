# Task 1 — Fix Session Management

## Agent: session-fix
## Status: ✅ Completed

## Summary
Replaced the insecure `montoit-user-id` cookie-based authentication with a proper server-side session management system using cryptographically secure tokens, sliding session refresh, and server-side session tracking.

## Changes Made

### 1. Prisma Schema (`prisma/schema.prisma`)
- Added `Session` model with `id`, `token` (unique), `userId`, `expiresAt`, `createdAt`
- Added `sessions` relation to the `User` model
- Added indexes on `token`, `userId`, and `expiresAt`
- Ran `bun run db:push` to sync schema with database

### 2. New Session Library (`src/lib/session.ts`)
- `generateSessionToken()` — 48-byte hex crypto token
- `createSession(userId)` — creates session, enforces single-session-per-user
- `validateSession(token)` — validates + checks expiry + determines if refresh needed
- `refreshSession(token)` — sliding session refresh (deletes old, creates new)
- `deleteSession(token)` / `deleteAllUserSessions(userId)`
- `cleanupExpiredSessions()` — for periodic cleanup
- `getUserIdFromRequest(req)` — helper for API routes to extract userId from session cookie
- Cookie constants: `SESSION_COOKIE_NAME = 'montoit-session'`, 30-day duration, 7-day refresh threshold

### 3. Auth Routes Updated
- **`/api/auth/login`** — Uses `createSession()` and sets `montoit-session` cookie
- **`/api/auth/verify-sms-otp`** — Same pattern
- **`/api/auth/verify-email-otp`** — Same pattern
- **`/api/auth/me`** — Validates session token, implements sliding refresh, returns 500 (not 401) on server errors
- **`/api/auth/logout`** — Deletes server-side session, clears both `montoit-session` and `montoit-user-id` cookies

### 4. All Other API Routes Updated
Updated all routes that used `montoit-user-id` cookie to use `getUserIdFromRequest()`:
- `dashboard/admin`, `dashboard/proprietaire`, `dashboard/tc`, `dashboard/locataire`
- `scoring`
- `profile` (GET + PUT)
- `favorites` (GET + POST), `favorites/check` (POST)
- `oneci/verify`, `oneci/face-auth`

### 5. Seed Route Updated
Added `await db.session.deleteMany()` before `await db.user.deleteMany()` in cleanup

## Key Design Decisions
1. **30-day sliding sessions** with 7-day refresh threshold — sessions are refreshed if within 7 days of expiry
2. **Single session per user** — `createSession` deletes existing sessions before creating new ones
3. **Server errors return 500** (not 401) from `/api/auth/me` — prevents the frontend `checkAuth()` from clearing auth state on transient server errors
4. **Backward compatibility** — logout route clears both old `montoit-user-id` and new `montoit-session` cookies
5. **`getUserIdFromRequest` helper** — centralized session validation for all API routes, avoiding code duplication

## Verification
- `bun run db:push` — database synced successfully
- `bun run lint` — no ESLint errors
- Dev server running without compilation errors
