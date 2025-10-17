# Visit Requests System - Quick Reference Card

## 🚀 Quick Start

### Import Components
```tsx
import { VisitRequestForm } from '@/components/visits/VisitRequestForm';
import { VisitRequestsQueue } from '@/components/visits/VisitRequestsQueue';
import {
  useVisitRequests,
  useCreateVisitRequest,
  useUpdateVisitRequest
} from '@/hooks/useVisitRequests';
```

---

## 📝 Create a Visit Request

### Basic Usage
```tsx
<VisitRequestForm
  propertyId="property-uuid"
  propertyTitle="Villa Moderne 3 Chambres"
  onSuccess={() => navigate('/dashboard')}
/>
```

### With Available Slots
```tsx
<VisitRequestForm
  propertyId="property-uuid"
  propertyTitle="Villa Moderne"
  availableSlots={[
    {
      id: "slot-uuid",
      start_time: "2025-10-15T14:00:00Z",
      end_time: "2025-10-15T15:00:00Z",
      available_spots: 5
    }
  ]}
/>
```

---

## 📋 Display Visit Requests Queue

### For Property Owners
```tsx
// Show requests for specific property
<VisitRequestsQueue propertyId="property-uuid" />
```

### For Agencies
```tsx
// Show all requests for mandate properties
<VisitRequestsQueue />
```

---

## 🎣 Using Hooks

### Fetch Visit Requests
```tsx
// All requests
const { data: requests, isLoading } = useVisitRequests();

// Filter by property
const { data: requests } = useVisitRequests({
  propertyId: 'property-uuid'
});

// Filter by status
const { data: pending } = useVisitRequests({
  status: 'pending',
  sortByPriority: true
});

// Filter by requester
const { data: myRequests } = useVisitRequests({
  requesterId: user.id
});
```

### Create Request
```tsx
const createRequest = useCreateVisitRequest();

const handleSubmit = async (data) => {
  await createRequest.mutateAsync({
    property_id: propertyId,
    request_type: 'flexible',
    visitor_count: 2,
    motivation: 'Très intéressé par ce bien',
    preferred_dates: ['2025-10-15', '2025-10-16'],
    availability_notes: 'Disponible après 18h'
  });
};
```

### Update Request Status
```tsx
const updateRequest = useUpdateVisitRequest();

// Accept request
await updateRequest.mutateAsync({
  requestId: request.id,
  updates: {
    status: 'accepted',
    agent_response: 'Visite confirmée pour le 15/10 à 15h'
  }
});

// Decline request
await updateRequest.mutateAsync({
  requestId: request.id,
  updates: {
    status: 'declined',
    agent_response: 'Désolé, le bien est déjà loué'
  }
});
```

---

## 🎯 Priority Score Calculation

| Factor | Points | Condition |
|--------|--------|-----------|
| Identity Verified | +30 | ONECI or CNAM verified |
| CNAM Verified | +20 | CNAM status = verified |
| Account Age | +10 | > 1 month old |
| Applications | +20 | Has previous applications |
| Complete Verification | +20 | ONECI + CNAM both verified |
| **Maximum** | **100** | |

### Priority Ranges
- 🔴 **High (80-100)**: Hot leads, respond urgently
- 🟠 **Medium (50-79)**: Warm leads, respond within 24h
- 🔵 **Low (0-49)**: Cold leads, standard response time

---

## ⏰ Expiration System

- **Auto-expire**: After 48 hours without response
- **Notification**: Sent to requester automatically
- **Status change**: `pending` → `expired`
- **Cron schedule**: Every hour via GitHub Actions

### Manual Expiration
```sql
-- Expire all stale requests immediately
SELECT * FROM expire_stale_visit_requests();
```

---

## ✅ Validation Rules

### Required Fields
- `request_type`: 'flexible' or 'specific'
- `visitor_count`: 1-10

### Conditional Requirements
**Flexible Requests**:
- At least one `preferred_date` OR `availability_notes`

**Specific Requests**:
- Valid `specific_slot_id` (UUID)

### Field Limits
- `motivation`: 500 characters max
- `availability_notes`: 1000 characters max
- `preferred_dates`: 5 dates max

---

## 🚨 Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Vous devez être connecté" | Not authenticated | Log in first |
| "Propriété n'existe pas" | Invalid property | Check property ID |
| "Plus disponible (statut: loué)" | Property not available | Choose different property |
| "Déjà une demande en attente" | Duplicate request | Wait for response or cancel previous |
| "Référence invalide" | Foreign key violation | Refresh page and retry |
| "Données invalides" | Validation failed | Check all fields |

---

## 🗄️ Database Queries

### Get Pending Requests by Priority
```sql
SELECT *
FROM property_visit_requests
WHERE status = 'pending'
ORDER BY priority_score DESC, created_at ASC;
```

### Get Expiring Soon (< 24h)
```sql
SELECT *
FROM property_visit_requests
WHERE status = 'pending'
  AND expires_at < NOW() + INTERVAL '24 hours'
ORDER BY expires_at ASC;
```

### Calculate Priority Score
```sql
SELECT calculate_visit_request_priority_score('user-uuid');
```

### Get Request with Details
```sql
SELECT
  r.*,
  p.title as property_title,
  p.address,
  prof.full_name as requester_name,
  prof.is_verified
FROM property_visit_requests r
JOIN properties p ON p.id = r.property_id
JOIN profiles prof ON prof.id = r.requester_id
WHERE r.id = 'request-uuid';
```

---

## 🎨 UI Components

### Status Badges
```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="default">En attente</Badge>
<Badge variant="secondary">Acceptée</Badge>
<Badge variant="destructive">Refusée</Badge>
<Badge variant="outline">Expirée</Badge>
```

### Priority Display
```tsx
const getPriorityColor = (score: number) => {
  if (score >= 80) return "text-red-600 bg-red-50";
  if (score >= 50) return "text-orange-600 bg-orange-50";
  return "text-blue-600 bg-blue-50";
};

<div className={cn("px-2 py-1 rounded", getPriorityColor(score))}>
  {score}
</div>
```

---

## 🔔 Notifications

### Notification Types

**visit_request_expired**:
```json
{
  "type": "visit_request_expired",
  "title": "Demande de visite expirée",
  "message": "Votre demande pour 'Villa Moderne' a expiré...",
  "link": "/properties/{property_id}",
  "metadata": {
    "request_id": "uuid",
    "property_id": "uuid",
    "expired_at": "2025-10-13T12:00:00Z"
  }
}
```

### Query User Notifications
```tsx
const { data: notifications } = useQuery({
  queryKey: ['notifications', user.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    return data;
  }
});
```

---

## 🧪 Testing

### Test Priority Calculation
```tsx
// Create request with high-priority user
const request = await createRequest.mutateAsync({
  property_id: propertyId,
  request_type: 'flexible',
  visitor_count: 1,
});

// Check calculated score
expect(request.priority_score).toBeGreaterThan(50);
expect(request.score_breakdown).toBeDefined();
```

### Test Validation
```tsx
// Should fail: no dates or notes
await expect(
  createRequest.mutateAsync({
    property_id: propertyId,
    request_type: 'flexible',
    visitor_count: 1,
    // Missing preferred_dates and availability_notes
  })
).rejects.toThrow();
```

### Test Expiration
```sql
-- Create request with past expiration
INSERT INTO property_visit_requests (
  property_id,
  requester_id,
  request_type,
  visitor_count,
  expires_at,
  status
) VALUES (
  'property-uuid',
  'user-uuid',
  'flexible',
  1,
  NOW() - INTERVAL '1 hour',  -- Already expired
  'pending'
);

-- Run expiration
SELECT * FROM expire_stale_visit_requests();

-- Verify status changed to 'expired'
SELECT status FROM property_visit_requests
WHERE requester_id = 'user-uuid';
-- Should return: 'expired'
```

---

## 📊 Analytics Queries

### Conversion Funnel
```sql
SELECT
  'Total Requests' as stage,
  COUNT(*) as count
FROM property_visit_requests
UNION ALL
SELECT
  'Accepted',
  COUNT(*)
FROM property_visit_requests
WHERE status = 'accepted'
UNION ALL
SELECT
  'Converted to Booking',
  COUNT(*)
FROM property_visit_requests
WHERE status = 'converted';
```

### Average Response Time
```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (agent_response_at - created_at))/3600) as avg_hours
FROM property_visit_requests
WHERE agent_response_at IS NOT NULL;
```

### Priority Distribution
```sql
SELECT
  CASE
    WHEN priority_score >= 80 THEN 'High'
    WHEN priority_score >= 50 THEN 'Medium'
    ELSE 'Low'
  END as priority,
  COUNT(*) as count,
  ROUND(AVG(priority_score), 1) as avg_score
FROM property_visit_requests
GROUP BY 1
ORDER BY avg_score DESC;
```

---

## 🔧 Configuration

### Adjust Expiration Time
```sql
-- Change from 48h to 24h
ALTER TABLE property_visit_requests
ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '24 hours');

-- Update trigger function
CREATE OR REPLACE FUNCTION set_visit_request_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- ... existing code ...
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + interval '24 hours';  -- Changed
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Customize Priority Algorithm
```sql
-- Edit calculate_visit_request_priority_score function
-- Adjust point values or add new factors
```

---

## 🆘 Troubleshooting

### Request not creating
1. Check user is authenticated
2. Verify property exists and is available
3. Check for duplicate pending requests
4. Verify RLS policies allow insert

### Priority score is 0
1. User profile exists?
2. User has verification data?
3. Check score_breakdown for details

### Requests not expiring
1. Check GitHub Actions is configured
2. Verify Edge Function is deployed
3. Test SQL function directly
4. Check cron job logs

### Form validation failing
1. Verify all required fields provided
2. Check request_type matches requirements
3. Ensure character limits respected
4. Test with minimal data first

---

## 📚 Related Files

- Form: `src/components/visits/VisitRequestForm.tsx`
- Queue: `src/components/visits/VisitRequestsQueue.tsx`
- Hooks: `src/hooks/useVisitRequests.ts`
- Migration: `supabase/migrations/improve_visit_requests_priority_and_expiration.sql`
- Edge Function: `supabase/functions/expire-stale-visit-requests/index.ts`
- Workflow: `.github/workflows/expire-stale-visit-requests.yml`

---

**Last Updated**: October 13, 2025
**Version**: 1.0
**Status**: Production Ready ✅
