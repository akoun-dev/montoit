# Mon Toit API Documentation

## Overview

Mon Toit is a certified real estate platform in Côte d'Ivoire built as a modern Progressive Web App (PWA) with React, TypeScript, and Supabase backend. This comprehensive API documentation covers all endpoints, authentication flows, and integration patterns for developers building on the Mon Toit platform.

## Base Configuration

- **Base URL**: `https://btxhuqtirylvkgvoutoc.supabase.co`
- **API Version**: Supabase PostgREST 13.0.5
- **Authentication**: JWT-based via Supabase Auth
- **Real-time**: WebSocket subscriptions via Supabase Realtime
- **Storage**: Supabase Storage buckets for media files

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [User Management APIs](#user-management-apis)
3. [Property Management APIs](#property-management-apis)
4. [Rental Application APIs](#rental-application-apis)
5. [Lease Management APIs](#lease-management-apis)
6. [Messaging APIs](#messaging-apis)
7. [Payment APIs](#payment-apis)
8. [Admin & Management APIs](#admin--management-apis)
9. [Real-time Subscriptions](#real-time-subscriptions)
10. [File Storage APIs](#file-storage-apis)
11. [Geolocation APIs](#geolocation-apis)
12. [Rate Limiting & Security](#rate-limiting--security)
13. [Error Handling](#error-handling)
14. [SDK & Code Examples](#sdk--code-examples)

## Authentication & Authorization

### User Types & Roles

The platform supports four primary user types with role-based access control (RBAC):

#### User Types (`user_type` enum)
- `proprietaire` - Property owners
- `locataire` - Tenants
- `agence` - Real estate agencies
- `admin_ansut` - ANSUT administrators

#### Application Roles (`app_role` enum)
- `user` - Standard user access
- `agent` - Agency agent access
- `moderator` - Content moderation access
- `admin` - Platform administration
- `super_admin` - Super administrator access
- `tiers_de_confiance` - Trusted third party access

### Authentication Flow

#### 1. User Registration
```typescript
POST /auth/v1/signup
{
  "email": "user@example.com",
  "password": "securePassword123",
  "options": {
    "data": {
      "full_name": "John Doe",
      "user_type": "proprietaire"
    }
  }
}
```

#### 2. User Login
```typescript
POST /auth/v1/token?grant_type=password
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### 3. Multi-Factor Authentication (MFA)
```typescript
// Enable MFA for admin users
POST /auth/v1/factors
{
  "friendly_name": "Admin MFA",
  "factor_type": "totp"
}

// Verify MFA code
POST /auth/v1/verify?grant_type=mfa_challenge
{
  "challenge_id": "challenge_id_here",
  "code": "123456"
}
```

### Authorization Patterns

#### Row Level Security (RLS)
All tables implement Row Level Security policies that enforce:

- **Property Ownership**: Users can only access their own properties
- **Application Privacy**: Applications are only visible to property owners and applicants
- **Role-based Access**: Admin users have elevated access to sensitive data
- **Public Access**: Some data is publicly accessible via secure RPC functions

#### JWT Token Structure
```typescript
{
  "aud": "authenticated",
  "exp": 1234567890,
  "sub": "user_uuid",
  "email": "user@example.com",
  "phone": "+225XXXXXXXXX",
  "app_metadata": {
    "provider": "email",
    "roles": ["proprietaire"],
    "user_type": "proprietaire"
  },
  "user_metadata": {
    "full_name": "John Doe",
    "user_type": "proprietaire"
  },
  "role": "authenticated"
}
```

## User Management APIs

### Profiles API

#### Get Current User Profile
```typescript
GET /rest/v1/profiles?id=eq.{user_id}
Headers: {
  "Authorization": "Bearer {jwt_token}",
  "apikey": "{supabase_anon_key}"
}
```

#### Update User Profile
```typescript
PATCH /rest/v1/profiles?id=eq.{user_id}
Headers: {
  "Authorization": "Bearer {jwt_token}",
  "apikey": "{supabase_anon_key}",
  "Content-Type": "application/json"
}
Body: {
  "full_name": "Updated Name",
  "bio": "Professional real estate investor",
  "city": "Abidjan",
  "phone": "+225XXXXXXXXX",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

#### Get Public Profile (Secure)
```typescript
POST /rest/v1/rpc/get_public_profile
Body: {
  "target_user_id": "user_uuid"
}
```

### User Roles Management

#### Add Role to User
```typescript
POST /rest/v1/rpc/add_available_role
Body: {
  "p_user_id": "user_uuid",
  "p_new_role": "agence"
}
```

#### Check User Role
```typescript
POST /rest/v1/rpc/has_role
Body: {
  "_user_id": "user_uuid",
  "_role": "admin"
}
```

### User Verification APIs

#### Get Verification Status
```typescript
POST /rest/v1/rpc/get_my_verification_status
Headers: { "Authorization": "Bearer {jwt_token}" }
```

#### Submit CNAM Verification
```typescript
POST /rest/v1/user_verifications
Body: {
  "user_id": "user_uuid",
  "cnam_social_security_number": "XXXXXXXXXX",
  "cnam_employer": "Company Name"
}
```

#### Submit ONECI Verification
```typescript
POST /rest/v1/user_verifications
Body: {
  "user_id": "user_uuid",
  "oneci_cni_number": "CIXXXXXXXXX"
}
```

#### Face Verification
```typescript
PATCH /rest/v1/user_verifications?id=eq.{verification_id}
Body: {
  "face_verification_status": "pending",
  "face_verification_attempts": 1
}
```

## Property Management APIs

### Public Property Search

#### Get Public Properties (Secure RPC)
```typescript
POST /rest/v1/rpc/get_public_properties
Body: {
  "p_city": "Abidjan",
  "p_property_type": "appartement",
  "p_min_rent": 50000,
  "p_max_rent": 200000,
  "p_min_bedrooms": 2,
  "p_status": "disponible"
}
```

#### Get Single Public Property
```typescript
POST /rest/v1/rpc/get_public_property
Body: {
  "p_property_id": "property_uuid"
}
```

### Property CRUD Operations

#### Create Property (Owner Only)
```typescript
POST /rest/v1/properties
Headers: {
  "Authorization": "Bearer {jwt_token}",
  "Content-Type": "application/json"
}
Body: {
  "title": "Beautiful 3-bedroom apartment",
  "description": "Spacious apartment in great location",
  "address": "123 Rue Principale, Cocody, Abidjan",
  "city": "Abidjan",
  "property_type": "appartement",
  "monthly_rent": 150000,
  "bedrooms": 3,
  "bathrooms": 2,
  "surface_area": 120,
  "has_parking": true,
  "has_ac": true,
  "is_furnished": false,
  "deposit_amount": 300000,
  "charges_amount": 25000,
  "owner_id": "owner_uuid",
  "status": "disponible",
  "latitude": 5.3600,
  "longitude": -4.0083
}
```

#### Update Property
```typescript
PATCH /rest/v1/properties?id=eq.{property_id}
Headers: { "Authorization": "Bearer {jwt_token}" }
Body: {
  "monthly_rent": 160000,
  "description": "Updated description with new features",
  "status": "disponible"
}
```

#### Delete Property
```typescript
DELETE /rest/v1/properties?id=eq.{property_id}
Headers: { "Authorization": "Bearer {jwt_token}" }
```

### Property Analytics & Stats

#### Get Property Statistics
```typescript
// This is a client-side operation using multiple queries
// First get view count
GET /rest/v1/properties?id=eq.{property_id}&select=view_count

// Then get favorites count
GET /rest/v1/user_favorites?property_id=eq.{property_id}&select=count

// Finally get applications count
GET /rest/v1/rental_applications?property_id=eq.{property_id}&select=count
```

#### Increment View Count
```typescript
PATCH /rest/v1/properties?id=eq.{property_id}
Body: {
  "view_count": 101  // Client-side increment
}
```

### Property Search & Filtering

#### Advanced Property Search
```typescript
// Use the property service for complex searches
// This combines multiple filters and geolocation
const searchParams = {
  city: "Abidjan",
  propertyType: ["appartement", "villa"],
  minPrice: 50000,
  maxPrice: 300000,
  minBedrooms: 2,
  minBathrooms: 1,
  minSurface: 80,
  isFurnished: true,
  hasParking: true,
  hasAc: true,
  hasGarden: false,
  latitude: 5.3600,
  longitude: -4.0083,
  radiusKm: 10
}
```

#### Search by Location
```typescript
// Client-side geolocation filtering using Haversine formula
// First fetch properties, then filter by distance
const nearbyProperties = await propertyService.searchNearby(
  latitude, longitude, radiusKm, filters
);
```

## Rental Application APIs

### Submit Rental Application

#### Create Application
```typescript
POST /rest/v1/rental_applications
Headers: {
  "Authorization": "Bearer {jwt_token}",
  "Content-Type": "application/json"
}
Body: {
  "property_id": "property_uuid",
  "applicant_id": "tenant_uuid",
  "cover_letter": "I am interested in this property because...",
  "documents": {
    "id_card": "https://storage_url/id_card.pdf",
    "proof_of_income": "https://storage_url/income.pdf",
    "references": ["reference1.pdf", "reference2.pdf"]
  },
  "status": "pending",
  "application_score": 85,
  "processing_deadline": "2024-02-01T23:59:59Z"
}
```

### Get Applications

#### Get Property Applications (Owner Only)
```typescript
GET /rest/v1/rental_applications?property_id=eq.{property_id}&select=*
Headers: { "Authorization": "Bearer {jwt_token}" }
```

#### Get User Applications (Tenant)
```typescript
GET /rest/v1/rental_applications?applicant_id=eq.{user_id}&select=*
Headers: { "Authorization": "Bearer {jwt_token}" }
```

### Application Management

#### Update Application Status
```typescript
PATCH /rest/v1/rental_applications?id=eq.{application_id}
Headers: { "Authorization": "Bearer {jwt_token}" }
Body: {
  "status": "accepted",
  "reviewed_at": "2024-01-15T10:30:00Z"
}
```

#### Auto-process Overdue Applications
```typescript
POST /rest/v1/rpc/auto_process_overdue_applications
Headers: { "Authorization": "Bearer {jwt_token}" }
```

## Lease Management APIs

### Create Lease

#### Generate Lease from Application
```typescript
POST /rest/v1/leases
Headers: { "Authorization": "Bearer {jwt_token}" }
Body: {
  "property_id": "property_uuid",
  "landlord_id": "landlord_uuid",
  "tenant_id": "tenant_uuid",
  "lease_type": "habitation",
  "start_date": "2024-02-01",
  "end_date": "2025-01-31",
  "monthly_rent": 150000,
  "deposit_amount": 300000,
  "charges_amount": 25000,
  "status": "active",
  "certification_status": "not_requested"
}
```

### Lease Certification (ANSUT)

#### Request Certification
```typescript
PATCH /rest/v1/leases?id=eq.{lease_id}
Body: {
  "certification_status": "pending",
  "certification_requested_at": "2024-01-15T10:00:00Z"
}
```

#### Pre-validate for Certification
```typescript
POST /rest/v1/rpc/pre_validate_lease_for_certification
Body: {
  "p_lease_id": "lease_uuid"
}
```

#### Get Certification History
```typescript
GET /rest/v1/lease_certification_history?lease_id=eq.{lease_id}
Headers: { "Authorization": "Bearer {jwt_token}" }
```

### Electronic Signatures

#### Initiate Electronic Signature
```typescript
POST /rest/v1/electronic_signature_logs
Body: {
  "lease_id": "lease_uuid",
  "user_id": "signer_uuid",
  "operation_id": "crypto_neo_operation_id",
  "signature_type": "landlord", // or "tenant"
  "status": "pending"
}
```

#### Update Signature Status
```typescript
PATCH /rest/v1/electronic_signature_logs?id=eq.{signature_log_id}
Body: {
  "status": "completed",
  "cryptoneo_response": {
    "signature_id": "sig_123",
    "timestamp": "2024-01-15T10:30:00Z",
    "document_hash": "abc123..."
  }
}
```

## Messaging APIs

### Internal Messages

#### Send Message
```typescript
POST /rest/v1/messages
Headers: { "Authorization": "Bearer {jwt_token}" }
Body: {
  "sender_id": "sender_uuid",
  "receiver_id": "receiver_uuid",
  "content": "Hello, I'm interested in your property",
  "application_id": "application_uuid", // optional
  "conversation_type": "property_inquiry", // optional
  "attachments": ["image1.jpg", "document.pdf"] // optional
}
```

#### Get Conversation
```typescript
GET /rest/v1/messages?or=(sender_id.eq.{user_id},receiver_id.eq.{other_user_id})&or=(sender_id.eq.{other_user_id},receiver_id.eq.{user_id})&order=created_at.desc
Headers: { "Authorization": "Bearer {jwt_token}" }
```

#### Mark Message as Read
```typescript
PATCH /rest/v1/messages?id=eq.{message_id}
Body: {
  "is_read": true
}
```

### Guest Messages (Public)

#### Submit Guest Message
```typescript
POST /rest/v1/guest_messages
Body: {
  "property_id": "property_uuid",
  "owner_id": "owner_uuid",
  "guest_name": "John Doe",
  "guest_email": "john@example.com",
  "guest_phone": "+225XXXXXXXXX",
  "message_content": "I'm interested in visiting this property",
  "ip_address": "192.168.1.1",
  "browser_fingerprint": "fp_12345"
}
```

#### Get Guest Messages (Owner)
```typescript
GET /rest/v1/guest_messages?owner_id=eq.{user_id}
Headers: { "Authorization": "Bearer {jwt_token}" }
```

## Payment APIs

### Create Payment

#### Initiate Payment
```typescript
POST /rest/v1/payments
Headers: { "Authorization": "Bearer {jwt_token}" }
Body: {
  "payer_id": "payer_uuid",
  "receiver_id": "receiver_uuid",
  "property_id": "property_uuid", // optional
  "amount": 150000,
  "payment_type": "rent", // "rent", "deposit", "charges", "fees"
  "payment_method": "mobile_money", // "mobile_money", "card", "bank_transfer"
  "status": "pending"
}
```

### Mobile Money Integration

#### Process Mobile Money Payment
```typescript
POST /rest/v1/mobile_money_transactions
Body: {
  "payment_id": "payment_uuid",
  "provider": "mtn", // "mtn", "orange", "moov"
  "phone_number": "+225XXXXXXXXX",
  "amount": 150000,
  "status": "pending",
  "transaction_ref": null // to be filled by provider response
}
```

#### Update Transaction Status
```typescript
PATCH /rest/v1/mobile_money_transactions?id=eq.{transaction_id}
Body: {
  "status": "completed",
  "transaction_ref": "TXN123456789",
  "provider_response": {
    "status": "success",
    "transaction_id": "PROVIDER_TXN_ID",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Payment Access Control

#### Log Payment Access
```typescript
POST /rest/v1/payment_access_log
Body: {
  "payment_id": "payment_uuid",
  "requester_id": "user_uuid",
  "access_granted": true,
  "relationship_type": "landlord" // "landlord", "tenant", "agency"
}
```

## Admin & Management APIs

### User Management (Admin)

#### Get All Users
```typescript
GET /rest/v1/profiles?select=*
Headers: { "Authorization": "Bearer {admin_jwt}" }
```

#### Admin Role Management
```typescript
// Promote to super admin
POST /rest/v1/rpc/promote_to_super_admin
Body: {
  "target_user_id": "user_uuid"
}
Headers: { "Authorization": "Bearer {admin_jwt}" }
```

### Verification Management (Admin)

#### Get Verifications for Review
```typescript
POST /rest/v1/rpc/get_verifications_for_admin_review
Headers: { "Authorization": "Bearer {admin_jwt}" }
```

#### Approve Verification
```typescript
POST /rest/v1/rpc/approve_verification
Body: {
  "p_user_id": "user_uuid",
  "p_verification_type": "cnam", // "cnam", "oneci", "face"
  "p_review_notes": "Documents verified and approved"
}
Headers: { "Authorization": "Bearer {admin_jwt}" }
```

#### Reject Verification
```typescript
POST /rest/v1/rpc/reject_verification
Body: {
  "p_user_id": "user_uuid",
  "p_verification_type": "cnam",
  "p_review_notes": "Invalid document provided"
}
Headers: { "Authorization": "Bearer {admin_jwt}" }
```

### Property Moderation (Admin)

#### Get Properties for Moderation
```typescript
GET /rest/v1/properties?moderation_status=in.pending&select=*
Headers: { "Authorization": "Bearer {admin_jwt}" }
```

#### Moderate Property
```typescript
PATCH /rest/v1/properties?id=eq.{property_id}
Body: {
  "moderation_status": "approved",
  "moderated_at": "2024-01-15T10:00:00Z",
  "moderated_by": "admin_uuid",
  "moderation_notes": "Property approved - all documents verified"
}
Headers: { "Authorization": "Bearer {admin_jwt}" }
```

### Analytics & Reporting

#### Get Platform Statistics
```typescript
// Multiple queries for comprehensive stats
const stats = {
  totalProperties: await supabase.from('properties').select('*', { count: 'exact', head: true }),
  totalUsers: await supabase.from('profiles').select('*', { count: 'exact', head: true }),
  activeLeases: await supabase.from('leases').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  pendingApplications: await supabase.from('rental_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending')
};
```

#### Generate Owner Analytics
```typescript
POST /rest/v1/rpc/get_owner_analytics
Body: {
  "owner_user_id": "owner_uuid"
}
Headers: { "Authorization": "Bearer {jwt_token}" }
```

### Security & Monitoring

#### Block IP Address
```typescript
POST /rest/v1/rpc/block_ip
Body: {
  "_ip_address": "192.168.1.1",
  "_reason": "Suspicious activity detected",
  "_duration_hours": 24,
  "_notes": "Multiple failed login attempts"
}
Headers: { "Authorization": "Bearer {admin_jwt}" }
```

#### Detect DDoS Patterns
```typescript
POST /rest/v1/rpc/detect_ddos_pattern
Headers: { "Authorization": "Bearer {admin_jwt}" }
```

#### Monitor Sensitive Data Access
```typescript
POST /rest/v1/rpc/detect_suspicious_sensitive_data_access
Headers: { "Authorization": "Bearer {admin_jwt}" }
```

## Real-time Subscriptions

### Property Updates
```typescript
// Subscribe to property changes
const subscription = supabase
  .channel('property_updates')
  .on('postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'properties',
      filter: 'owner_id=eq.{user_id}'
    },
    (payload) => {
      console.log('Property updated:', payload);
      // Handle real-time updates
    }
  )
  .subscribe();
```

### New Applications
```typescript
// Subscribe to new applications for owner's properties
const subscription = supabase
  .channel('new_applications')
  .on('postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'rental_applications',
      filter: 'property_id=in.({property_ids})'
    },
    (payload) => {
      console.log('New application received:', payload.new);
      // Send notification to property owner
    }
  )
  .subscribe();
```

### Message Updates
```typescript
// Subscribe to message updates
const subscription = supabase
  .channel('messages')
  .on('postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: 'receiver_id=eq.{user_id}'
    },
    (payload) => {
      console.log('New message:', payload.new);
      // Update UI and send notification
    }
  )
  .subscribe();
```

### Lease Status Updates
```typescript
// Subscribe to lease certification updates
const subscription = supabase
  .channel('lease_updates')
  .on('postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'leases',
      filter: 'certification_status=in.(pending,in_review,certified)'
    },
    (payload) => {
      console.log('Lease certification updated:', payload.new);
      // Notify relevant parties
    }
  )
  .subscribe();
```

## File Storage APIs

### Upload Property Images

#### Upload Image
```typescript
POST /storage/v1/object/property-images/{property_id}/{timestamp}_{filename}
Headers: {
  "Authorization": "Bearer {jwt_token}",
  "Content-Type": "image/jpeg" // or appropriate MIME type
}
Body: [binary file data]
```

#### Get Public URL
```typescript
POST /storage/v1/object/public/property-images/{path}
// Returns: { "publicUrl": "https://..." }
```

### Upload Documents

#### Upload Verification Documents
```typescript
POST /storage/v1/object/verification-docs/{user_id}/{document_type}/{filename}
Headers: {
  "Authorization": "Bearer {jwt_token}",
  "Content-Type": "application/pdf"
}
Body: [binary PDF data]
```

### File Management

#### List Files in Bucket
```typescript
POST /storage/v1/object/list/{bucket_name}
Body: {
  "prefix": "{property_id}/",
  "limit": 100
}
Headers: { "Authorization": "Bearer {jwt_token}" }
```

#### Delete File
```typescript
DELETE /storage/v1/object/{bucket_name}/{file_path}
Headers: { "Authorization": "Bearer {jwt_token}" }
```

## Geolocation APIs

### Property Location Search

#### Get Properties by Coordinates
```typescript
// This combines the property search with client-side distance calculation
const searchNearby = async (lat, lng, radiusKm, filters) => {
  // 1. Fetch all properties with filters
  const properties = await propertyService.fetchAll(filters);

  // 2. Filter by distance using Haversine formula
  return properties.filter(property => {
    if (!property.latitude || !property.longitude) return false;

    const distance = calculateDistance(
      lat, lng,
      property.latitude, property.longitude
    );

    return distance <= radiusKm;
  });
};
```

### Map Integration

#### Mapbox Integration
```typescript
// Mapbox is used for frontend map display
// Geocoding and place search are handled via Mapbox APIs
const mapboxClient = mapboxgl.accessToken = 'MAPBOX_PUBLIC_TOKEN';

// Geocode address to coordinates
const response = await fetch(
  `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}`
);
```

## Rate Limiting & Security

### Rate Limiting Functions

#### Check API Rate Limit
```typescript
POST /rest/v1/rpc/check_api_rate_limit
Body: {
  "_endpoint": "/rest/v1/properties",
  "_user_id": "user_uuid",
  "_ip_address": "192.168.1.1",
  "_max_requests": 100,
  "_window_minutes": 15
}
```

#### Check Login Rate Limit
```typescript
POST /rest/v1/rpc/check_login_rate_limit
Body: {
  "_email": "user@example.com",
  "_ip_address": "192.168.1.1"
}
```

### Security Functions

#### Log Sensitive Data Access
```typescript
POST /rest/v1/sensitive_data_access_log
Body: {
  "data_type": "phone_number",
  "requester_id": "user_uuid",
  "target_user_id": "target_uuid",
  "access_granted": true,
  "relationship_type": "landlord",
  "metadata": { "property_id": "prop_uuid" }
}
```

## Error Handling

### Standard Error Responses

#### Validation Error (400)
```json
{
  "error": {
    "code": "23502",
    "message": "null value in column 'title' violates not-null constraint",
    "details": "FATAL:  null value in column 'title' violates not-null constraint"
  },
  "user_message": "Champs obligatoires manquants. Veuillez remplir tous les champs requis."
}
```

#### Authorization Error (403)
```json
{
  "error": {
    "code": "42501",
    "message": "new row violates row-level security policy"
  },
  "user_message": "Permissions insuffisantes. Connectez-vous avec un compte propriétaire."
}
```

#### Rate Limit Error (429)
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "code": "RATE_LIMIT_EXCEEDED"
  },
  "user_message": "Trop de requêtes. Veuillez réessayer dans quelques minutes."
}
```

### Error Codes Reference

| Code | Type | Description |
|------|------|-------------|
| 23502 | Validation | Required field missing |
| 23503 | Foreign Key | Invalid reference |
| 23505 | Unique Constraint | Duplicate entry |
| 42501 | RLS Policy | Insufficient permissions |
| PGRST116 | Not Found | Resource not found |
| RATE_LIMIT_EXCEEDED | Rate Limit | Too many requests |

## SDK & Code Examples

### JavaScript/TypeScript SDK

#### Initialize Client
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://btxhuqtirylvkgvoutoc.supabase.co',
  'your-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
```

#### Authentication Wrapper
```typescript
class MonToitAPI {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email, password
    });

    if (error) throw error;
    return data;
  }

  async signUp(email: string, password: string, fullName: string, userType: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, user_type: userType }
      }
    });

    if (error) throw error;
    return data;
  }
}
```

#### Property Service
```typescript
class PropertyService {
  async searchProperties(filters: PropertyFilters): Promise<Property[]> {
    const { data, error } = await supabase.rpc('get_public_properties', {
      p_city: filters.city,
      p_property_type: filters.propertyType?.[0],
      p_min_rent: filters.minPrice,
      p_max_rent: filters.maxPrice,
      p_min_bedrooms: filters.minBedrooms
    });

    if (error) throw error;
    return data;
  }

  async createProperty(property: CreatePropertyRequest): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .insert(property)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
```

### React Hooks

#### useAuth Hook
```typescript
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
};
```

#### useProperties Hook
```typescript
export const useProperties = (filters?: SearchFilters) => {
  return useQuery({
    queryKey: ['properties', filters],
    queryFn: () => propertyService.searchProperties(filters || {}),
    staleTime: 60_000,
    retry: 2,
  });
};
```

### Python SDK Example

```python
import requests
from typing import Optional, List, Dict

class MonToitAPI:
    def __init__(self, base_url: str, anon_key: str):
        self.base_url = base_url
        self.anon_key = anon_key
        self.headers = {
            'apikey': anon_key,
            'Content-Type': 'application/json'
        }

    def search_properties(self, filters: Dict) -> List[Dict]:
        """Search for properties with filters"""
        response = requests.post(
            f"{self.base_url}/rest/v1/rpc/get_public_properties",
            headers=self.headers,
            json=filters
        )
        response.raise_for_status()
        return response.json()

    def get_property(self, property_id: str) -> Optional[Dict]:
        """Get a single property by ID"""
        response = requests.post(
            f"{self.base_url}/rest/v1/rpc/get_public_property",
            headers=self.headers,
            json={"p_property_id": property_id}
        )
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()[0]

# Usage
api = MonToitAPI(
    "https://btxhuqtirylvkgvoutoc.supabase.co",
    "your-anon-key"
)

properties = api.search_properties({
    "p_city": "Abidjan",
    "p_max_rent": 200000,
    "p_min_bedrooms": 2
})
```

## Testing & Development

### Test Environment Setup

1. **Set up test environment variables**
```bash
VITE_SUPABASE_URL=https://your-test-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-test-anon-key
VITE_MAPBOX_PUBLIC_TOKEN=your-mapbox-token
```

2. **Run tests**
```bash
npm run test
npm run test:e2e  # For end-to-end tests
```

### Mock API Responses

```typescript
// Mock data for testing
const mockProperty = {
  id: "test-property-id",
  title: "Test Property",
  address: "123 Test Street",
  city: "Abidjan",
  monthly_rent: 150000,
  bedrooms: 3,
  bathrooms: 2,
  status: "disponible"
};

// Mock service for testing
export const mockPropertyService = {
  fetchAll: async () => [mockProperty],
  fetchById: async (id: string) => mockProperty,
  create: async (property: CreatePropertyRequest) => ({ ...mockProperty, ...property }),
};
```

## Best Practices

### Security
- Always use HTTPS for API calls
- Implement proper authentication flow with JWT tokens
- Validate user permissions on the client side before making API calls
- Never expose secret keys in frontend code
- Use RLS policies for data access control

### Performance
- Implement proper caching strategies
- Use pagination for large datasets
- Optimize image sizes and formats
- Use real-time subscriptions judiciously
- Implement offline support for critical features

### Error Handling
- Always handle API errors gracefully
- Provide user-friendly error messages
- Implement retry logic for network failures
- Log errors for debugging and monitoring

### Code Organization
- Use TypeScript for type safety
- Implement proper service layer separation
- Use custom hooks for reusable logic
- Follow consistent naming conventions
- Document API endpoints and data structures

## Support & Resources

- **Documentation**: This guide and inline code documentation
- **GitHub Repository**: [Link to repository]
- **Support Email**: support@mon-toit.ci
- **API Status**: [Link to status page]
- **Developer Community**: [Link to Discord/Forum]

## Changelog

### v1.0.0 (Current)
- Initial API documentation
- Complete CRUD operations for properties, users, applications
- Authentication and authorization flows
- Real-time subscriptions
- File storage integration
- Admin and management APIs

---

*This documentation is maintained by the Mon Toit development team. For the most up-to-date information, please refer to the inline code documentation and GitHub repository.*