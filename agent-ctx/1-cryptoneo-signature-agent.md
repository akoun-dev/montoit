# Task 1 — Cryptoneo Signature Agent

## Task Summary
Add SignatureAlias model to Prisma schema and create CRYPTONEO signature API routes.

## Files Created
- `/home/z/my-project/src/lib/cryptoneo.ts` — Shared utility with token caching, authenticated fetch, type definitions
- `/home/z/my-project/src/app/api/signature/auth/route.ts` — POST /api/signature/auth
- `/home/z/my-project/src/app/api/signature/generate-certificate/route.ts` — POST /api/signature/generate-certificate
- `/home/z/my-project/src/app/api/signature/send-otp/route.ts` — POST /api/signature/send-otp
- `/home/z/my-project/src/app/api/signature/sign/route.ts` — POST /api/signature/sign
- `/home/z/my-project/src/app/api/signature/verify/route.ts` — POST /api/signature/verify
- `/home/z/my-project/src/app/api/signature/signed-file/route.ts` — GET /api/signature/signed-file

## Files Modified
- `/home/z/my-project/prisma/schema.prisma` — Added SignatureAlias model + User.signatureAlias relation
- `/home/z/my-project/.env` — Added CRYPTONEO_API_URL, CRYPTONEO_APP_KEY, CRYPTONEO_APP_SECRET

## Key Decisions
- Token caching with 30-minute TTL in memory (no Redis needed)
- Auto-retry on 401 from CRYPTONEO (clears cache and re-authenticates once)
- SignatureAlias has `userId @unique` constraint (one alias per user)
- All CRYPTONEO API calls are server-side only — never exposed to client
- Uses `getUserIdAndRole` from `@/lib/session` for auth in all routes
- Uses `db` from `@/lib/db` for database access

## Status
✅ All tasks completed successfully
