# Task: TC API Routes

## Summary
Created 3 production-ready API route files for the Tiers de Confiance (TC) interface:

### 1. `/src/app/api/tc/agents/route.ts`
- **GET**: List agents for current TC with `?search=` and `?isActive=` filters, includes mission counts
- **POST**: Create agent with email uniqueness check, required fields validation
- **PATCH**: Update agent with ownership check; auto-cancels ASSIGNED/IN_PROGRESS missions when deactivating
- **DELETE**: Soft-delete (isActive=false) with auto-cancellation of active missions

### 2. `/src/app/api/tc/missions/route.ts`
- **GET**: List missions with agent/property/inventoryReport includes; filters: `?status=`, `?agentId=`, `?propertyId=`, `?dateFrom=`, `?dateTo=`; `?calendar=true` for date-grouped view
- **POST**: Create mission with validation (agent ownership, property PENDING_VERIFICATION, agent active)
- **PATCH**: Update mission status with valid transition checks; sets completedAt on COMPLETED; updates property to ACTIVE/isVerified on PROPERTY_VERIFICATION completion

### 3. `/src/app/api/tc/litiges/route.ts`
- **GET**: List disputes with two modes (default: owned + unassigned OPEN; `?mine=true`: only own); filters: `?status=`, `?type=`
- **PATCH**: Status transitions with validation; OPEN→IN_REVIEW assigns handledById; RESOLVED requires resolution text; reopen clears handledById; creates AuditLog and Notification in a transaction

## Key Design Decisions
- All routes use `getUserIdAndRole()` with `effectiveRole === 'TIERS_CONFIANCE'` check
- Consistent error handling with French error messages
- Proper ownership checks (tcId === userId)
- Transaction usage in litiges PATCH for atomicity
- Calendar view returns date-keyed grouped missions
