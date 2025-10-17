# Contact Information Protection

## Overview

Phone numbers and other contact information are sensitive PII that must be protected from harvesting attacks. This document explains how Mon Toit protects user contact information while allowing legitimate access.

## Security Architecture

### 1. Phone Number Protection

**Problem**: Attackers could create fake rental applications or property listings to harvest phone numbers of legitimate users.

**Solution**: Multi-layered protection:

#### Layer 1: RPC Function for Phone Access
- Phone numbers are ONLY accessible via the `get_user_phone(target_user_id)` RPC function
- Access is granted based on legitimate relationships:
  - Users can access their own phone number
  - Landlords can access phone numbers of applicants to their properties
  - Applicants can access phone numbers of landlords they applied to
  - Parties in active leases can access each other's phone numbers
  - Admins can access any phone number

#### Layer 2: Access Logging
- Every call to `get_user_phone()` is logged in the `phone_access_log` table
- Logs include: requester ID, target user ID, timestamp, access granted/denied, relationship type
- Admins can monitor for suspicious patterns (e.g., excessive requests, denied access attempts)

#### Layer 3: Public Profile Function
- Use `get_public_profile(target_user_id)` RPC to get non-sensitive profile information
- Returns: name, avatar, bio, city, user type, verification status
- Never returns: phone number, email, or other contact info

### 2. RLS Policies

The `profiles` table has STRICT RLS policies that prevent cross-user access:
- ✅ Users can view their own complete profile (including phone)
- ✅ Admins can view all profiles
- ❌ All other access is DENIED at the database level

**Cross-user access MUST use RPC functions:**

```sql
-- ❌ WRONG: Direct SELECT is blocked by RLS (unless you're viewing your own profile)
SELECT * FROM profiles WHERE id = 'some-user-id';
-- ERROR: RLS policy violation

-- ✅ CORRECT: Use RPC function for public info (no phone)
SELECT * FROM get_public_profile('some-user-id');

-- ✅ CORRECT: Use RPC function for phone (logged access with relationship checks)
SELECT get_user_phone('some-user-id');
```

This architecture prevents contact information harvesting by blocking direct queries at the database level.

### 3. Frontend Implementation

#### Viewing Public Profiles
```typescript
// Use the get_public_profile RPC
const { data: profile } = await supabase
  .rpc('get_public_profile', { target_user_id: userId });
```

#### Accessing Phone Numbers
```typescript
// Use the useUserPhone hook (already implemented)
import { useUserPhone } from '@/hooks/useUserPhone';

function ApplicantDetails({ applicantId }) {
  const { phone, loading } = useUserPhone(applicantId);
  
  if (loading) return <span>Chargement...</span>;
  if (!phone) return null; // No access
  
  return <span>📞 {phone}</span>;
}
```

#### Components That Display Phone Numbers
- `ApplicantPhoneDisplay` - Displays applicant phone to landlords
- Uses `useUserPhone` hook which calls `get_user_phone()` RPC
- Automatically handles access control and loading states

## Monitoring and Detection

### Viewing Access Logs (Admins Only)
```sql
-- Recent phone access attempts
SELECT 
  pal.requester_id,
  p1.full_name as requester_name,
  pal.target_user_id,
  p2.full_name as target_name,
  pal.relationship_type,
  pal.access_granted,
  pal.accessed_at
FROM phone_access_log pal
JOIN profiles p1 ON p1.id = pal.requester_id
JOIN profiles p2 ON p2.id = pal.target_user_id
ORDER BY pal.accessed_at DESC
LIMIT 100;

-- Detect potential harvesting (many denied requests)
SELECT 
  requester_id,
  COUNT(*) as denied_attempts,
  COUNT(DISTINCT target_user_id) as unique_targets
FROM phone_access_log
WHERE 
  access_granted = false
  AND accessed_at > now() - interval '1 hour'
GROUP BY requester_id
HAVING COUNT(*) > 10
ORDER BY denied_attempts DESC;
```

### Rate Limiting (Future Enhancement)
Consider implementing rate limiting on `get_user_phone()` calls:
- Max 50 phone number requests per hour per user
- Temporary suspension after 100 denied access attempts
- Alert admins for suspicious patterns

## Migration History

- **2025-10-05**: Added `phone_access_log` table and updated `get_user_phone()` to log all access attempts
- **2025-10-05**: Created `get_public_profile()` RPC for accessing non-sensitive profile data
- **2025-10-05**: **SECURITY FIX** - Removed overly permissive RLS policies on `profiles` table
  - Dropped: "Applicants can view landlord public profiles"
  - Dropped: "Landlords can view applicant public profiles"
  - Dropped: "Lease parties can view each other public profiles"
  - Result: Cross-user access now MUST use `get_public_profile()` or `get_user_phone()` RPCs
  - This prevents contact information harvesting by scammers creating fake applications/listings
- **2025-10-05**: Removed `profiles_public` view entirely (redundant with `get_public_profile()` RPC)

## Best Practices

1. **Never query `profiles` table directly** - Always use RPC functions
2. **Use `get_public_profile()`** for general profile viewing
3. **Use `get_user_phone()`** only when displaying contact information
4. **Monitor `phone_access_log`** regularly for suspicious activity
5. **Educate users** about not sharing contact info in other fields (bio, etc.)

## Related Documentation

- [Phone Number Protection](./PHONE_NUMBER_PROTECTION.md) - Original implementation details
- [Security Architecture](./SECURITY.md) - Overall security practices
- [RLS Policies](./SECURITY.md#row-level-security) - Database access control
