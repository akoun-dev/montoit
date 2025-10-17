# Interactive API Examples & SDK Guides

This document provides comprehensive, interactive examples for integrating with the Mon Toit API, including SDK implementations in multiple languages and ready-to-use code snippets.

## Quick Start Guide

### 1. JavaScript/TypeScript (Recommended)

#### Installation
```bash
npm install @supabase/supabase-js
# or
yarn add @supabase/supabase-js
```

#### Basic Setup
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://btxhuqtirylvkgvoutoc.supabase.co';
const supabaseKey = 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
```

#### Authentication Example
```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securePassword123',
  options: {
    data: {
      full_name: 'John Doe',
      user_type: 'proprietaire'
    }
  }
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securePassword123'
});

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

### 2. Python SDK

#### Installation
```bash
pip install supabase
# or
pip install git+https://github.com/supabase-community/supabase-py.git
```

#### Basic Setup
```python
from supabase import create_client, Client
import os

url: str = "https://btxhuqtirylvkgvoutoc.supabase.co"
key: str = "your-anon-key"
supabase: Client = create_client(url, key)
```

#### Authentication Example
```python
# Sign up
auth_data = supabase.auth.sign_up({
    "email": "user@example.com",
    "password": "securePassword123",
    "options": {
        "data": {
            "full_name": "John Doe",
            "user_type": "proprietaire"
        }
    }
})

# Sign in
auth_data = supabase.auth.sign_in_with_password({
    "email": "user@example.com",
    "password": "securePassword123"
})

# Get current user
user = supabase.auth.get_user()
```

### 3. Node.js Backend

#### Installation
```bash
npm install @supabase/supabase-js dotenv
```

#### Setup (.env file)
```env
SUPABASE_URL=https://btxhuqtirylvkgvoutoc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Server Implementation
```javascript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
```

## Complete API Examples

### Property Management

#### Search Properties (JavaScript/TypeScript)
```typescript
class PropertyAPI {
  constructor(private supabase: any) {}

  async searchProperties(filters: {
    city?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    minBedrooms?: number;
  }) {
    try {
      const { data, error } = await this.supabase.rpc('get_public_properties', {
        p_city: filters.city || null,
        p_property_type: filters.propertyType || null,
        p_min_rent: filters.minPrice || null,
        p_max_rent: filters.maxPrice || null,
        p_min_bedrooms: filters.minBedrooms || null
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error searching properties:', error);
      throw error;
    }
  }

  async getPropertyDetails(propertyId: string) {
    try {
      const { data, error } = await this.supabase.rpc('get_public_property', {
        p_property_id: propertyId
      });

      if (error) throw error;
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching property:', error);
      throw error;
    }
  }

  async createProperty(propertyData: {
    title: string;
    address: string;
    city: string;
    propertyType: string;
    monthlyRent: number;
    bedrooms?: number;
    bathrooms?: number;
    description?: string;
  }) {
    try {
      const { data, error } = await this.supabase
        .from('properties')
        .insert({
          title: propertyData.title,
          address: propertyData.address,
          city: propertyData.city,
          property_type: propertyData.propertyType,
          monthly_rent: propertyData.monthlyRent,
          bedrooms: propertyData.bedrooms,
          bathrooms: propertyData.bathrooms,
          description: propertyData.description,
          owner_id: (await this.supabase.auth.getUser()).data.user?.id,
          status: 'disponible'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  }
}

// Usage
const propertyAPI = new PropertyAPI(supabase);

// Search for apartments in Abidjan
const properties = await propertyAPI.searchProperties({
  city: 'Abidjan',
  propertyType: 'appartement',
  maxPrice: 200000,
  minBedrooms: 2
});

console.log('Found properties:', properties);
```

#### Search Properties (Python)
```python
class PropertyAPI:
    def __init__(self, supabase_client):
        self.supabase = supabase_client

    async def search_properties(self, filters: dict):
        """Search for properties with filters"""
        try:
            response = self.supabase.rpc('get_public_properties', {
                'p_city': filters.get('city'),
                'p_property_type': filters.get('property_type'),
                'p_min_rent': filters.get('min_price'),
                'p_max_rent': filters.get('max_price'),
                'p_min_bedrooms': filters.get('min_bedrooms')
            }).execute()

            if response.data:
                return response.data
            else:
                raise Exception(response.error)
        except Exception as e:
            print(f"Error searching properties: {e}")
            raise

    async def get_property_details(self, property_id: str):
        """Get property details by ID"""
        try:
            response = self.supabase.rpc('get_public_property', {
                'p_property_id': property_id
            }).execute()

            if response.data and len(response.data) > 0:
                return response.data[0]
            else:
                return None
        except Exception as e:
            print(f"Error fetching property: {e}")
            raise

    async def create_property(self, property_data: dict):
        """Create a new property"""
        try:
            user = self.supabase.auth.get_user()
            owner_id = user.user.id if user.user else None

            if not owner_id:
                raise Exception("User not authenticated")

            response = self.supabase.table('properties').insert({
                'title': property_data['title'],
                'address': property_data['address'],
                'city': property_data['city'],
                'property_type': property_data['property_type'],
                'monthly_rent': property_data['monthly_rent'],
                'bedrooms': property_data.get('bedrooms'),
                'bathrooms': property_data.get('bathrooms'),
                'description': property_data.get('description'),
                'owner_id': owner_id,
                'status': 'disponible'
            }).execute()

            if response.data:
                return response.data[0]
            else:
                raise Exception(response.error)
        except Exception as e:
            print(f"Error creating property: {e}")
            raise

# Usage
property_api = PropertyAPI(supabase)

# Search for properties
properties = await property_api.search_properties({
    'city': 'Abidjan',
    'property_type': 'appartement',
    'max_price': 200000,
    'min_bedrooms': 2
})

print(f"Found {len(properties)} properties")
```

### User Management

#### Update Profile (JavaScript/TypeScript)
```typescript
class UserAPI {
  constructor(private supabase: any) {}

  async updateProfile(updates: {
    fullName?: string;
    bio?: string;
    city?: string;
    phone?: string;
  }) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();

      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('profiles')
        .update({
          full_name: updates.fullName,
          bio: updates.bio,
          city: updates.city,
          phone: updates.phone
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  async getPublicProfile(userId: string) {
    try {
      const { data, error } = await this.supabase.rpc('get_public_profile', {
        target_user_id: userId
      });

      if (error) throw error;
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  }

  async submitVerification(verificationData: {
    type: 'cnam' | 'oneci' | 'face';
    documents?: Record<string, string>;
    socialSecurityNumber?: string;
    employer?: string;
    cniNumber?: string;
  }) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();

      if (!user) throw new Error('User not authenticated');

      const updateData: any = {
        user_id: user.id
      };

      if (verificationData.type === 'cnam') {
        updateData.cnam_social_security_number = verificationData.socialSecurityNumber;
        updateData.cnam_employer = verificationData.employer;
      } else if (verificationData.type === 'oneci') {
        updateData.oneci_cni_number = verificationData.cniNumber;
      } else if (verificationData.type === 'face') {
        updateData.face_verification_status = 'pending';
      }

      const { data, error } = await this.supabase
        .from('user_verifications')
        .upsert(updateData, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error submitting verification:', error);
      throw error;
    }
  }
}

// Usage
const userAPI = new UserAPI(supabase);

// Update profile
await userAPI.updateProfile({
  fullName: 'John Doe',
  bio: 'Real estate investor',
  city: 'Abidjan',
  phone: '+225XXXXXXXXX'
});

// Submit CNAM verification
await userAPI.submitVerification({
  type: 'cnam',
  socialSecurityNumber: '123456789',
  employer: 'Company Name'
});
```

### Rental Applications

#### Submit Application (JavaScript/TypeScript)
```typescript
class ApplicationAPI {
  constructor(private supabase: any) {}

  async submitApplication(applicationData: {
    propertyId: string;
    coverLetter?: string;
    documents?: Record<string, string>;
  }) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();

      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('rental_applications')
        .insert({
          property_id: applicationData.propertyId,
          applicant_id: user.id,
          cover_letter: applicationData.coverLetter,
          documents: applicationData.documents,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error submitting application:', error);
      throw error;
    }
  }

  async getMyApplications() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();

      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('rental_applications')
        .select(`
          *,
          properties (
            title,
            address,
            monthly_rent,
            images
          )
        `)
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw error;
    }
  }

  async getPropertyApplications(propertyId: string) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();

      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('rental_applications')
        .select(`
          *,
          profiles!rental_applications_applicant_id_fkey (
            full_name,
            avatar_url,
            phone,
            city
          )
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching property applications:', error);
      throw error;
    }
  }

  async updateApplicationStatus(applicationId: string, status: 'accepted' | 'rejected') {
    try {
      const { data, error } = await this.supabase
        .from('rental_applications')
        .update({
          status,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating application:', error);
      throw error;
    }
  }
}

// Usage
const applicationAPI = new ApplicationAPI(supabase);

// Submit application
const application = await applicationAPI.submitApplication({
  propertyId: 'property-uuid',
  coverLetter: 'I am very interested in this property...',
  documents: {
    id_card: 'https://storage.url/id.pdf',
    proof_of_income: 'https://storage.url/income.pdf'
  }
});

console.log('Application submitted:', application);
```

### Real-time Subscriptions

#### Property Updates (JavaScript/TypeScript)
```typescript
class RealtimeAPI {
  constructor(private supabase: any) {}

  subscribeToPropertyUpdates(propertyId: string, callback: (payload: any) => void) {
    const subscription = this.supabase
      .channel(`property-${propertyId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties',
          filter: `id=eq.${propertyId}`
        },
        callback
      )
      .subscribe();

    return subscription;
  }

  subscribeToNewMessages(userId: string, callback: (payload: any) => void) {
    const subscription = this.supabase
      .channel(`messages-${userId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`
        },
        callback
      )
      .subscribe();

    return subscription;
  }

  subscribeToApplicationUpdates(propertyId: string, callback: (payload: any) => void) {
    const subscription = this.supabase
      .channel(`applications-${propertyId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rental_applications',
          filter: `property_id=eq.${propertyId}`
        },
        callback
      )
      .subscribe();

    return subscription;
  }

  unsubscribe(subscription: any) {
    this.supabase.removeChannel(subscription);
  }
}

// Usage
const realtimeAPI = new RealtimeAPI(supabase);

// Subscribe to property updates
const propertySubscription = realtimeAPI.subscribeToPropertyUpdates(
  'property-uuid',
  (payload) => {
    console.log('Property updated:', payload);
    // Update UI or send notification
  }
);

// Subscribe to new messages
const messageSubscription = realtimeAPI.subscribeToNewMessages(
  'user-uuid',
  (payload) => {
    console.log('New message:', payload.new);
    // Show notification
  }
);

// Cleanup when done
// realtimeAPI.unsubscribe(propertySubscription);
// realtimeAPI.unsubscribe(messageSubscription);
```

### File Upload

#### Upload Property Images (JavaScript/TypeScript)
```typescript
class FileAPI {
  constructor(private supabase: any) {}

  async uploadPropertyImage(propertyId: string, file: File) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${propertyId}/${fileName}`;

      const { data, error } = await this.supabase.storage
        .from('property-images')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (error) throw error;

      const { data: { publicUrl } } = this.supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  async uploadVerificationDocument(userId: string, documentType: string, file: File) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${documentType}_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { data, error } = await this.supabase.storage
        .from('verification-docs')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (error) throw error;

      const { data: { publicUrl } } = this.supabase.storage
        .from('verification-docs')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  async deleteFile(bucket: string, filePath: string) {
    try {
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
}

// Usage
const fileAPI = new FileAPI(supabase);

// Upload property images
const imageFiles = document.querySelectorAll('input[type="file"]')[0].files;
const imageUrls = [];

for (const file of imageFiles) {
  const url = await fileAPI.uploadPropertyImage('property-uuid', file);
  imageUrls.push(url);
}

console.log('Uploaded images:', imageUrls);

// Upload verification document
const documentFile = document.querySelector('#verification-doc').files[0];
const docUrl = await fileAPI.uploadVerificationDocument(
  'user-uuid',
  'id_card',
  documentFile
);

console.log('Document URL:', docUrl);
```

## React Hooks & Components

### Custom Hooks

#### useAuth Hook
```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return { user, session, loading, signOut };
}
```

#### useProperties Hook
```typescript
// hooks/useProperties.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface PropertyFilters {
  city?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
}

export function useProperties(filters: PropertyFilters = {}) {
  const queryClient = useQueryClient();

  const {
    data: properties,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['properties', filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_properties', {
        p_city: filters.city || null,
        p_property_type: filters.propertyType || null,
        p_min_rent: filters.minPrice || null,
        p_max_rent: filters.maxPrice || null,
        p_min_bedrooms: filters.minBedrooms || null
      });

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const invalidateProperties = () => {
    queryClient.invalidateQueries({ queryKey: ['properties'] });
  };

  return {
    properties,
    isLoading,
    error,
    refetch,
    invalidateProperties
  };
}
```

#### useRealtime Hook
```typescript
// hooks/useRealtime.ts
import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtime(
  channel: string,
  event: string,
  table: string,
  filter?: string,
  callback?: (payload: any) => void
) {
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!callback) return;

    const channelConfig: any = {
      event,
      schema: 'public',
      table
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    subscriptionRef.current = supabase
      .channel(channel)
      .on('postgres_changes', channelConfig, callback)
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [channel, event, table, filter, callback]);

  return subscriptionRef.current;
}
```

### React Components

#### PropertyCard Component
```typescript
// components/PropertyCard.tsx
import React from 'react';
import { Property } from '../types';

interface PropertyCardProps {
  property: Property;
  onViewDetails: (property: Property) => void;
  onContactOwner: (property: Property) => void;
}

export function PropertyCard({ property, onViewDetails, onContactOwner }: PropertyCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {property.main_image && (
        <img
          src={property.main_image}
          alt={property.title}
          className="w-full h-48 object-cover"
        />
      )}

      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{property.title}</h3>
        <p className="text-gray-600 text-sm mb-2">{property.address}, {property.city}</p>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
            {property.bedrooms} chambres
          </span>
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
            {property.bathrooms} salles de bain
          </span>
          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
            {property.surface_area} m²
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xl font-bold text-primary">
            {property.monthly_rent.toLocaleString()} FCFA/mois
          </span>

          <div className="flex gap-2">
            <button
              onClick={() => onViewDetails(property)}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
            >
              Voir détails
            </button>
            <button
              onClick={() => onContactOwner(property)}
              className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
            >
              Contacter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### PropertySearch Component
```typescript
// components/PropertySearch.tsx
import React, { useState } from 'react';
import { useProperties } from '../hooks/useProperties';

export function PropertySearch() {
  const [filters, setFilters] = useState({
    city: '',
    propertyType: '',
    minPrice: '',
    maxPrice: '',
    minBedrooms: ''
  });

  const { properties, isLoading, error } = useProperties({
    city: filters.city || undefined,
    propertyType: filters.propertyType || undefined,
    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    minBedrooms: filters.minBedrooms ? Number(filters.minBedrooms) : undefined
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (error) {
    return <div className="text-red-500">Erreur: {error.message}</div>;
  }

  return (
    <div>
      {/* Search Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Rechercher un bien</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Ville"
            value={filters.city}
            onChange={(e) => handleFilterChange('city', e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={filters.propertyType}
            onChange={(e) => handleFilterChange('propertyType', e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Type de bien</option>
            <option value="appartement">Appartement</option>
            <option value="villa">Villa</option>
            <option value="studio">Studio</option>
          </select>

          <input
            type="number"
            placeholder="Prix min"
            value={filters.minPrice}
            onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="number"
            placeholder="Prix max"
            value={filters.maxPrice}
            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="number"
            placeholder="Min chambres"
            value={filters.minBedrooms}
            onChange={(e) => handleFilterChange('minBedrooms', e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Results */}
      <div>
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties?.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onViewDetails={(prop) => console.log('View details:', prop)}
                onContactOwner={(prop) => console.log('Contact owner:', prop)}
              />
            ))}
          </div>
        )}

        {!isLoading && properties?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucun bien trouvé pour ces critères
          </div>
        )}
      </div>
    </div>
  );
}
```

## Testing & Development

### Unit Tests (Jest)

#### API Service Tests
```typescript
// tests/propertyService.test.ts
import { PropertyAPI } from '../services/propertyService';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase');

describe('PropertyAPI', () => {
  let propertyAPI: PropertyAPI;

  beforeEach(() => {
    propertyAPI = new PropertyAPI(supabase);
    jest.clearAllMocks();
  });

  describe('searchProperties', () => {
    it('should search properties with filters', async () => {
      const mockProperties = [
        { id: '1', title: 'Test Property', city: 'Abidjan' }
      ];

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockProperties,
        error: null
      });

      const result = await propertyAPI.searchProperties({
        city: 'Abidjan',
        maxPrice: 200000
      });

      expect(supabase.rpc).toHaveBeenCalledWith('get_public_properties', {
        p_city: 'Abidjan',
        p_property_type: null,
        p_min_rent: null,
        p_max_rent: 200000,
        p_min_bedrooms: null
      });

      expect(result).toEqual(mockProperties);
    });

    it('should handle API errors', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'API Error' }
      });

      await expect(propertyAPI.searchProperties({}))
        .rejects.toThrow('API Error');
    });
  });

  describe('createProperty', () => {
    it('should create a new property', async () => {
      const mockProperty = {
        id: '1',
        title: 'New Property',
        address: '123 Test St',
        city: 'Abidjan'
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } }
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProperty,
              error: null
            })
          })
        })
      });

      const result = await propertyAPI.createProperty({
        title: 'New Property',
        address: '123 Test St',
        city: 'Abidjan',
        propertyType: 'appartement',
        monthlyRent: 150000
      });

      expect(result).toEqual(mockProperty);
      expect(supabase.from).toHaveBeenCalledWith('properties');
    });
  });
});
```

### Integration Tests (Cypress)

#### E2E Test Example
```typescript
// cypress/e2e/property-search.cy.ts
describe('Property Search', () => {
  beforeEach(() => {
    // Mock the API responses
    cy.intercept('POST', '**/rpc/get_public_properties', {
      fixture: 'properties.json'
    }).as('searchProperties');

    cy.visit('/');
  });

  it('should search for properties', () => {
    // Enter search criteria
    cy.get('[data-testid="city-input"]').type('Abidjan');
    cy.get('[data-testid="property-type-select"]').select('appartement');
    cy.get('[data-testid="max-price-input"]').type('200000');

    // Submit search
    cy.get('[data-testid="search-button"]').click();

    // Wait for API response
    cy.wait('@searchProperties');

    // Verify results
    cy.get('[data-testid="property-card"]').should('have.length.greaterThan', 0);
    cy.get('[data-testid="property-card"]').first().within(() => {
      cy.get('[data-testid="property-title"]').should('contain', 'Appartement');
      cy.get('[data-testid="property-price"]').should('contain', 'FCFA');
    });
  });

  it('should handle no results', () => {
    // Mock empty response
    cy.intercept('POST', '**/rpc/get_public_properties', {
      body: []
    }).as('searchPropertiesEmpty');

    // Enter search criteria that return no results
    cy.get('[data-testid="city-input"]').type('NonExistentCity');
    cy.get('[data-testid="search-button"]').click();

    cy.wait('@searchPropertiesEmpty');

    // Verify no results message
    cy.get('[data-testid="no-results"]').should('be.visible');
    cy.get('[data-testid="no-results"]').should('contain', 'Aucun bien trouvé');
  });
});
```

## Postman Collection

#### Environment Variables
```json
{
  "name": "Mon Toit API",
  "values": [
    {
      "key": "baseUrl",
      "value": "https://btxhuqtirylvkgvoutoc.supabase.co",
      "enabled": true
    },
    {
      "key": "anonKey",
      "value": "your-anon-key",
      "enabled": true
    },
    {
      "key": "accessToken",
      "value": "",
      "enabled": true
    }
  ]
}
```

#### Sample Requests
```json
{
  "info": {
    "name": "Mon Toit API Collection",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Sign Up",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "apikey",
                "value": "{{anonKey}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\",\n  \"options\": {\n    \"data\": {\n      \"full_name\": \"Test User\",\n      \"user_type\": \"proprietaire\"\n    }\n  }\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/v1/signup",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "v1", "signup"]
            }
          }
        },
        {
          "name": "Sign In",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "apikey",
                "value": "{{anonKey}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/v1/token?grant_type=password",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "v1", "token"],
              "query": [
                {
                  "key": "grant_type",
                  "value": "password"
                }
              ]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 200) {",
                  "    const response = pm.response.json();",
                  "    pm.collectionVariables.set('accessToken', response.access_token);",
                  "}"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "name": "Properties",
      "item": [
        {
          "name": "Search Properties",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              },
              {
                "key": "apikey",
                "value": "{{anonKey}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"p_city\": \"Abidjan\",\n  \"p_max_rent\": 200000,\n  \"p_min_bedrooms\": 2\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/rest/v1/rpc/get_public_properties",
              "host": ["{{baseUrl}}"],
              "path": ["rest", "v1", "rpc", "get_public_properties"]
            }
          }
        },
        {
          "name": "Create Property",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              },
              {
                "key": "apikey",
                "value": "{{anonKey}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"title\": \"Beautiful Apartment\",\n  \"address\": \"123 Main St\",\n  \"city\": \"Abidjan\",\n  \"property_type\": \"appartement\",\n  \"monthly_rent\": 150000,\n  \"bedrooms\": 3,\n  \"bathrooms\": 2\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/rest/v1/properties",
              "host": ["{{baseUrl}}"],
              "path": ["rest", "v1", "properties"]
            }
          }
        }
      ]
    }
  ]
}
```

## SDK Templates

### Generate SDK from OpenAPI Spec

You can use various tools to generate SDKs from the OpenAPI specification:

#### OpenAPI Generator
```bash
# Install OpenAPI Generator
npm install @openapitools/openapi-generator-cli -g

# Generate TypeScript SDK
openapi-generator-cli generate \
  -i openapi-spec.yaml \
  -g typescript-axios \
  -o ./sdk/typescript \
  --additional-properties=npmName=mon-toit-api,supportsES6=true

# Generate Python SDK
openapi-generator-cli generate \
  -i openapi-spec.yaml \
  -g python \
  -o ./sdk/python \
  --additional-properties=packageName=mon_toit_api
```

#### Swagger Codegen
```bash
# Generate JavaScript SDK
swagger-codegen generate \
  -i openapi-spec.yaml \
  -l javascript \
  -o ./sdk/javascript

# Generate PHP SDK
swagger-codegen generate \
  -i openapi-spec.yaml \
  -l php \
  -o ./sdk/php
```

This comprehensive documentation provides everything developers need to integrate with the Mon Toit API, from basic authentication to complex real-time applications and SDK generation.