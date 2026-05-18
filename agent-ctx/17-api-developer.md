# Task 17 — API Developer Work Log

## Task
Create all missing API routes for tenant (locataire) views

## Files Created

1. `/home/z/my-project/src/app/api/notifications/route.ts`
   - GET: List notifications with pagination, filter by type/isRead, unreadCount
   - PUT: Mark as read (specific IDs or markAllRead)

2. `/home/z/my-project/src/app/api/payments/route.ts`
   - GET: List payments with lease/property/owner includes + stats (totalPaid, lateCount, nextDue)

3. `/home/z/my-project/src/app/api/maintenance/route.ts`
   - GET: List maintenance requests with lease/property info + status stats
   - POST: Create request with leaseId, title, description, priority + audit log

4. `/home/z/my-project/src/app/api/reviews/route.ts`
   - GET: Ratings given + received with direction filter + stats (averageScoreReceived)

5. `/home/z/my-project/src/app/api/history/route.ts`
   - GET: Audit logs for current user with entity/action filter + pagination

6. `/home/z/my-project/src/app/api/rental-file/route.ts`
   - GET: List rental files with documents/leases/reviewer + status stats
   - POST: Upsert draft + submit flag + audit log

7. `/home/z/my-project/src/app/api/applications/route.ts`
   - GET: Status tracking view with computed timeline + document progress

## Pattern Used
All routes follow the existing `/api/dashboard/locataire/route.ts` pattern:
- `getUserIdFromRequest(req)` for auth
- 401 if not authenticated, 403 if not LOCATAIRE
- try/catch with console.error + 500 response

## Lint
0 errors, 0 warnings
