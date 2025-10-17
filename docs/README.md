# Mon Toit API Documentation

🏠 **Comprehensive API documentation for the Mon Toit certified real estate platform in Côte d'Ivoire**

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-React%20%7C%20TypeScript%20%7C%20Supabase-informational.svg)

## 📖 Overview

Mon Toit is a modern Progressive Web App (PWA) certified real estate platform that connects landlords, tenants, and agencies in Côte d'Ivoire. This comprehensive API documentation provides everything developers need to integrate with the Mon Toit platform.

### 🚀 Key Features

- **Multi-tenant Architecture**: Support for landlords, tenants, agencies, and trusted third parties
- **ANSUT Certification**: Integrated lease certification and validation
- **Real-time Updates**: WebSocket-based live notifications and updates
- **Secure Authentication**: JWT-based auth with MFA support
- **File Management**: Upload and manage property images and documents
- **Geolocation**: Advanced property search with location-based filtering
- **Mobile Money Integration**: Support for MTN, Orange, and Moov payment methods

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Real-time Features](#real-time-features)
5. [File Storage](#file-storage)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [SDKs & Examples](#sdks--examples)
9. [Testing](#testing)
10. [Support](#support)

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ (for JavaScript/TypeScript SDK)
- Valid email address for registration
- Mon Toit developer account (optional for extended features)

### Basic Setup

#### JavaScript/TypeScript
```bash
npm install @supabase/supabase-js
```

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://btxhuqtirylvkgvoutoc.supabase.co',
  'your-anon-key'
);

// Search for properties
const { data, error } = await supabase.rpc('get_public_properties', {
  p_city: 'Abidjan',
  p_max_rent: 200000
});
```

#### Python
```bash
pip install supabase
```

```python
from supabase import create_client

supabase = create_client('https://btxhuqtirylvkgvoutoc.supabase.co', 'your-anon-key')

# Search for properties
response = supabase.rpc('get_public_properties', {
    'p_city': 'Abidjan',
    'p_max_rent': 200000
}).execute()

properties = response.data
```

### Try It Now

#### Search Properties (cURL)
```bash
curl -X POST "https://btxhuqtirylvkgvoutoc.supabase.co/rest/v1/rpc/get_public_properties" \
  -H "apikey: your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "p_city": "Abidjan",
    "p_max_rent": 200000,
    "p_min_bedrooms": 2
  }'
```

#### User Registration (cURL)
```bash
curl -X POST "https://btxhuqtirylvkgvoutoc.supabase.co/auth/v1/signup" \
  -H "apikey: your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "options": {
      "data": {
        "full_name": "John Doe",
        "user_type": "proprietaire"
      }
    }
  }'
```

## 🔐 Authentication

### User Types

The platform supports four primary user types:

| User Type | Description | Access Level |
|-----------|-------------|--------------|
| `proprietaire` | Property owners | Manage properties, applications, leases |
| `locataire` | Tenants | Browse properties, submit applications |
| `agence` | Real estate agencies | Multi-property management |
| `admin_ansut` | ANSUT administrators | Platform administration, certification |

### Authentication Flow

1. **Registration**: Create account with email and password
2. **Email Verification**: Confirm email address
3. **Profile Completion**: Add profile information
4. **Verification**: Optional identity verification (CNAM, ONECI, Face)

### JWT Token Structure

```json
{
  "aud": "authenticated",
  "exp": 1234567890,
  "sub": "user_uuid",
  "email": "user@example.com",
  "app_metadata": {
    "provider": "email",
    "roles": ["proprietaire"]
  },
  "user_metadata": {
    "full_name": "John Doe",
    "user_type": "proprietaire"
  }
}
```

## 🛠 API Endpoints

### Base URL
```
https://btxhuqtirylvkgvoutoc.supabase.co
```

### Core Endpoints

#### Authentication
- `POST /auth/v1/signup` - User registration
- `POST /auth/v1/token` - User login
- `DELETE /auth/v1/token` - User logout

#### Properties
- `POST /rest/v1/rpc/get_public_properties` - Search properties
- `POST /rest/v1/rpc/get_public_property` - Get property details
- `POST /rest/v1/properties` - Create property (owner only)
- `PATCH /rest/v1/properties/{id}` - Update property
- `DELETE /rest/v1/properties/{id}` - Delete property

#### Applications
- `GET /rest/v1/rental_applications` - Get applications
- `POST /rest/v1/rental_applications` - Submit application
- `PATCH /rest/v1/rental_applications/{id}` - Update application status

#### Leases
- `GET /rest/v1/leases` - Get leases
- `POST /rest/v1/leases` - Create lease
- `PATCH /rest/v1/leases/{id}` - Update lease

#### Users
- `GET /rest/v1/profiles` - Get user profiles
- `PATCH /rest/v1/profiles/{id}` - Update profile
- `POST /rest/v1/rpc/get_public_profile` - Get public profile

### Complete API Reference

For detailed endpoint documentation, see:
- [📖 Complete API Documentation](./api-documentation.md)
- [📋 OpenAPI 3.1 Specification](./openapi-spec.yaml)
- [💻 Interactive Examples](./interactive-examples.md)

## 🔄 Real-time Features

### WebSocket Subscriptions

Subscribe to real-time updates for:

#### Property Updates
```typescript
const subscription = supabase
  .channel('property-updates')
  .on('postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'properties',
      filter: 'owner_id=eq.{user_id}'
    },
    (payload) => {
      console.log('Property updated:', payload);
    }
  )
  .subscribe();
```

#### New Messages
```typescript
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
    }
  )
  .subscribe();
```

#### Application Updates
```typescript
const subscription = supabase
  .channel('applications')
  .on('postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'rental_applications',
      filter: 'property_id=eq.{property_id}'
    },
    (payload) => {
      console.log('Application updated:', payload);
    }
  )
  .subscribe();
```

## 📁 File Storage

### Storage Buckets

| Bucket | Purpose | Access Control |
|--------|---------|----------------|
| `property-images` | Property photos | Public read, owner write |
| `property-videos` | Property videos | Public read, owner write |
| `property-360` | 360° panoramas | Public read, owner write |
| `property-plans` | Floor plans | Public read, owner write |
| `verification-docs` | User verification documents | Private (user/admin only) |

### Upload Examples

#### Upload Property Image
```typescript
const file = event.target.files[0];
const filePath = `${propertyId}/${Date.now()}_${file.name}`;

const { data, error } = await supabase.storage
  .from('property-images')
  .upload(filePath, file);

if (error) throw error;

const { data: { publicUrl } } = supabase.storage
  .from('property-images')
  .getPublicUrl(filePath);
```

#### Upload Verification Document
```typescript
const file = event.target.files[0];
const filePath = `${userId}/id_card_${Date.now()}.pdf`;

const { data, error } = await supabase.storage
  .from('verification-docs')
  .upload(filePath, file);
```

## ❌ Error Handling

### Standard Error Response Format

```json
{
  "error": {
    "code": "42501",
    "message": "new row violates row-level security policy",
    "details": "User does not have permission to access this resource"
  },
  "user_message": "Permissions insuffisantes. Veuillez vous connecter avec un compte approprié."
}
```

### Common Error Codes

| HTTP Code | Error Code | Description |
|------------|------------|-------------|
| 400 | 23502 | Required field missing |
| 400 | 23503 | Invalid foreign key reference |
| 400 | 23505 | Duplicate entry |
| 401 | - | Authentication required |
| 403 | 42501 | Insufficient permissions (RLS) |
| 404 | PGRST116 | Resource not found |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | - | Internal server error |

### Error Handling Best Practices

```typescript
try {
  const { data, error } = await supabase
    .from('properties')
    .insert(propertyData);

  if (error) {
    // Handle Supabase-specific errors
    if (error.code === '42501') {
      throw new Error('You do not have permission to perform this action');
    } else if (error.code === '23505') {
      throw new Error('A property with these details already exists');
    } else {
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }

  return data;
} catch (error) {
  console.error('API Error:', error);
  throw error;
}
```

## 🚦 Rate Limiting

### Rate Limits

| Endpoint Type | Requests/Minute | Burst Limit |
|---------------|-----------------|-------------|
| Authentication | 10 | 20 |
| Property Search | 100 | 200 |
| CRUD Operations | 60 | 100 |
| File Upload | 30 | 50 |
| Admin Operations | 200 | 400 |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Handling Rate Limits

```typescript
const handleRateLimit = async (apiCall: () => Promise<any>) => {
  try {
    return await apiCall();
  } catch (error) {
    if (error.status === 429) {
      const resetTime = parseInt(error.headers['x-ratelimit-reset']);
      const waitTime = resetTime * 1000 - Date.now();

      if (waitTime > 0) {
        console.log(`Rate limited. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return await apiCall();
      }
    }
    throw error;
  }
};
```

## 💻 SDKs & Examples

### Available SDKs

| Language | SDK | Status |
|----------|-----|--------|
| JavaScript/TypeScript | @supabase/supabase-js | ✅ Official |
| Python | supabase-py | ✅ Community |
| Dart/Flutter | supabase-flutter | ✅ Official |
| Java/Kotlin | supabase-java | ✅ Community |
| C# | supabase-csharp | ✅ Community |
| Go | supabase-go | 🚧 In Development |

### Quick Examples

#### React Hook
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useProperties(filters = {}) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      const { data, error } = await supabase.rpc('get_public_properties', {
        p_city: filters.city,
        p_max_rent: filters.maxPrice
      });

      if (error) {
        console.error('Error fetching properties:', error);
      } else {
        setProperties(data);
      }
      setLoading(false);
    };

    fetchProperties();
  }, [filters]);

  return { properties, loading };
}
```

#### React Component
```typescript
import React from 'react';
import { useProperties } from '../hooks/useProperties';

export function PropertyList({ filters }) {
  const { properties, loading } = useProperties(filters);

  if (loading) {
    return <div>Loading properties...</div>;
  }

  return (
    <div className="property-grid">
      {properties.map(property => (
        <div key={property.id} className="property-card">
          <h3>{property.title}</h3>
          <p>{property.city}</p>
          <p>{property.monthly_rent} FCFA/month</p>
          <button>View Details</button>
        </div>
      ))}
    </div>
  );
}
```

#### Node.js Backend
```javascript
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const supabase = createClient(url, key);

// Middleware to verify JWT
const verifyAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token verification failed' });
  }
};

// Protected route
app.get('/api/my-properties', verifyAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('owner_id', req.user.id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});
```

### Complete Examples

For comprehensive examples and SDK implementations, see:
- [💻 Interactive Examples & SDK Guides](./interactive-examples.md)
- [🧪 Testing Resources](./testing-resources.md)

## 🧪 Testing

### Test Environment

Use the test environment for development and testing:
```
Base URL: https://your-test-project.supabase.co
```

### Testing Tools

#### Postman Collection
Import the provided Postman collection for API testing:
```bash
# Import collection from docs/postman-collection.json
```

#### Cypress Tests
```bash
npm run test:e2e
```

#### Unit Tests
```bash
npm run test:unit
```

### Test Data

Use the provided test data seeding script:
```bash
npm run seed:test-data
```

For complete testing documentation, see [🧪 Testing Resources](./testing-resources.md).

## 📚 Documentation Files

| File | Description |
|------|-------------|
| [api-documentation.md](./api-documentation.md) | Complete API documentation with all endpoints |
| [openapi-spec.yaml](./openapi-spec.yaml) | OpenAPI 3.1 specification |
| [interactive-examples.md](./interactive-examples.md) | Code examples and SDK implementations |
| [testing-resources.md](./testing-resources.md) | Testing guides and resources |

## 🤝 Support

### Getting Help

- **Documentation**: Read through the comprehensive guides above
- **GitHub Issues**: Report bugs and request features
- **Email**: support@mon-toit.ci
- **Community**: Join our developer community

### Contributing

We welcome contributions! Please see our contributing guidelines for details.

### License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🔗 Related Links

- [🌐 Mon Toit Website](https://mon-toit.ci)
- [📱 Mobile App (PWA)](https://mon-toit.ci)
- [📧 Contact Support](mailto:support@mon-toit.ci)
- [📖 Developer Blog](https://blog.mon-toit.ci)

## 📊 API Status

| Service | Status |
|---------|--------|
| Authentication API | ✅ Operational |
| Property API | ✅ Operational |
| File Storage | ✅ Operational |
| Real-time API | ✅ Operational |
| Payment API | ✅ Operational |

---

**Built with ❤️ for the Côte d'Ivoire real estate community**

© 2024 Mon Toit. All rights reserved.