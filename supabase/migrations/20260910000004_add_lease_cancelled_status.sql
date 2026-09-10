-- src/app/api/leases/[id]/cancel/route.ts sets leases.status = 'CANCELLED',
-- but the lease_status enum only had DRAFT/PENDING_SIGNATURE/ACTIVE/
-- TERMINATED/EXPIRED — every call to that route failed with an invalid
-- enum value error, so a lease pending signature could never actually be
-- cancelled.
alter type lease_status add value if not exists 'CANCELLED';
