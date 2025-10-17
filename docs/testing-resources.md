# Testing Resources & Guides

This document provides comprehensive testing resources for the Mon Toit API, including unit tests, integration tests, end-to-end testing, and performance testing strategies.

## Table of Contents
1. [Testing Strategy Overview](#testing-strategy-overview)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [API Testing with Postman](#api-testing-with-postman)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [Test Data Management](#test-data-management)
9. [CI/CD Integration](#cicd-integration)
10. [Test Reports & Coverage](#test-reports--coverage)

## Testing Strategy Overview

### Testing Pyramid
```
    E2E Tests (10%)
   ─────────────────
  Integration Tests (20%)
 ─────────────────────────
Unit Tests (70%)
```

### Key Testing Areas
- **Authentication & Authorization**: User roles, JWT tokens, RLS policies
- **Property Management**: CRUD operations, search, filtering
- **File Upload/Download**: Storage operations, validation
- **Real-time Features**: WebSocket subscriptions, live updates
- **Business Logic**: Application processing, lease certification
- **Error Handling**: API errors, network failures, validation
- **Security**: SQL injection, XSS, authentication bypasses

## Unit Testing

### Jest Configuration

#### Setup (jest.config.js)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/tests/**',
    '!src/main.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

#### Test Setup (src/tests/setup.ts)
```typescript
import '@testing-library/jest-dom';
import { supabase } from '../lib/supabase';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
    storage: {
      from: jest.fn(),
    },
    channel: jest.fn(),
  },
}));

// Mock environment variables
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
```

### Service Tests

#### Property Service Tests (src/tests/services/propertyService.test.ts)
```typescript
import { PropertyService } from '../../services/propertyService';
import { supabase } from '../../lib/supabase';

describe('PropertyService', () => {
  let propertyService: PropertyService;
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    propertyService = new PropertyService();
    jest.clearAllMocks();
  });

  describe('searchProperties', () => {
    it('should search properties with filters', async () => {
      // Arrange
      const filters = {
        city: 'Abidjan',
        maxPrice: 200000,
        minBedrooms: 2
      };

      const mockProperties = [
        {
          id: '1',
          title: 'Test Apartment',
          city: 'Abidjan',
          monthly_rent: 150000,
          bedrooms: 3
        }
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockProperties,
        error: null
      });

      // Act
      const result = await propertyService.searchProperties(filters);

      // Assert
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_public_properties', {
        p_city: 'Abidjan',
        p_property_type: null,
        p_min_rent: null,
        p_max_rent: 200000,
        p_min_bedrooms: 2
      });

      expect(result).toEqual(mockProperties);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Database error');
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: mockError
      });

      // Act & Assert
      await expect(propertyService.searchProperties({}))
        .rejects.toThrow('Database error');
    });

    it('should filter out rented properties for public users', async () => {
      // Arrange
      const mockProperties = [
        { id: '1', status: 'disponible' },
        { id: '2', status: 'loué' },
        { id: '3', status: 'disponible' }
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockProperties,
        error: null
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null } // No authenticated user
      });

      // Act
      const result = await propertyService.searchProperties({});

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(p => p.status !== 'loué')).toBe(true);
    });
  });

  describe('createProperty', () => {
    it('should create a new property', async () => {
      // Arrange
      const propertyData = {
        title: 'New Property',
        address: '123 Test St',
        city: 'Abidjan',
        propertyType: 'appartement',
        monthlyRent: 150000
      };

      const mockCreatedProperty = {
        id: '1',
        ...propertyData,
        created_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } }
      });

      const mockInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockCreatedProperty,
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockInsert);

      // Act
      const result = await propertyService.createProperty(propertyData);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('properties');
      expect(mockInsert.insert).toHaveBeenCalledWith({
        title: propertyData.title,
        address: propertyData.address,
        city: propertyData.city,
        property_type: propertyData.propertyType,
        monthly_rent: propertyData.monthlyRent,
        owner_id: 'user-1',
        status: 'disponible'
      });

      expect(result).toEqual(mockCreatedProperty);
    });

    it('should require authentication', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null }
      });

      // Act & Assert
      await expect(propertyService.createProperty({}))
        .rejects.toThrow('User not authenticated');
    });
  });
});
```

#### Auth Service Tests (src/tests/services/authService.test.ts)
```typescript
import { AuthService } from '../../services/authService';
import { supabase } from '../../lib/supabase';

describe('AuthService', () => {
  let authService: AuthService;
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should register a new user', async () => {
      // Arrange
      const signUpData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        userType: 'proprietaire'
      };

      const mockResponse = {
        user: { id: '1', email: 'test@example.com' },
        session: { access_token: 'token' }
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: mockResponse,
        error: null
      });

      // Act
      const result = await authService.signUp(signUpData);

      // Assert
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            full_name: signUpData.fullName,
            user_type: signUpData.userType
          }
        }
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle sign up errors', async () => {
      // Arrange
      const signUpData = {
        email: 'invalid-email',
        password: '123',
        fullName: 'Test User',
        userType: 'proprietaire'
      };

      const mockError = { message: 'Invalid email' };
      mockSupabase.auth.signUp.mockResolvedValue({
        data: null,
        error: mockError
      });

      // Act & Assert
      await expect(authService.signUp(signUpData))
        .rejects.toThrow('Invalid email');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current authenticated user', async () => {
      // Arrange
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' }
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should handle unauthenticated state', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result).toBeNull();
    });
  });
});
```

### Hook Tests

#### useAuth Hook Tests (src/tests/hooks/useAuth.test.tsx)
```typescript
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../../hooks/useAuth';
import { AuthProvider } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    // Arrange
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });

    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Assert
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('should handle sign in', async () => {
    // Arrange
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;
    const mockUser = { id: '1', email: 'test@example.com' };

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });

    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: { unsubscribe: jest.fn() }
      }
    });

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: { access_token: 'token' } },
      error: null
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Act
    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });

    // Assert
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    });
  });

  it('should handle sign out', async () => {
    // Arrange
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;
    const mockUser = { id: '1', email: 'test@example.com' };

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null
    });

    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: { unsubscribe: jest.fn() }
      }
    });

    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Act
    await act(async () => {
      await result.current.signOut();
    });

    // Assert
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });
});
```

## Integration Testing

### API Integration Tests

#### Property API Integration Tests (src/tests/integration/propertyAPI.test.ts)
```typescript
import { createClient } from '@supabase/supabase-js';
import { PropertyAPI } from '../../services/propertyService';

describe('PropertyAPI Integration', () => {
  let supabase: any;
  let propertyAPI: PropertyAPI;
  let testPropertyId: string;

  beforeAll(async () => {
    // Initialize test client
    supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );

    propertyAPI = new PropertyAPI(supabase);

    // Sign in as test user
    await supabase.auth.signInWithPassword({
      email: process.env.TEST_USER_EMAIL!,
      password: process.env.TEST_USER_PASSWORD!
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (testPropertyId) {
      await supabase.from('properties').delete().eq('id', testPropertyId);
    }

    // Sign out
    await supabase.auth.signOut();
  });

  describe('Property CRUD Operations', () => {
    it('should create, read, update, and delete property', async () => {
      // Create
      const createData = {
        title: 'Integration Test Property',
        address: '123 Test Street',
        city: 'Abidjan',
        propertyType: 'appartement',
        monthlyRent: 150000,
        bedrooms: 2,
        bathrooms: 1
      };

      const createdProperty = await propertyAPI.createProperty(createData);
      testPropertyId = createdProperty.id;

      expect(createdProperty.title).toBe(createData.title);
      expect(createdProperty.city).toBe(createData.city);
      expect(createdProperty.owner_id).toBeDefined();

      // Read
      const fetchedProperty = await propertyAPI.getPropertyById(testPropertyId);
      expect(fetchedProperty.id).toBe(testPropertyId);
      expect(fetchedProperty.title).toBe(createData.title);

      // Update
      const updateData = { monthlyRent: 160000 };
      const updatedProperty = await propertyAPI.updateProperty(testPropertyId, updateData);
      expect(updatedProperty.monthly_rent).toBe(updateData.monthlyRent);

      // Delete
      await propertyAPI.deleteProperty(testPropertyId);
      const deletedProperty = await propertyAPI.getPropertyById(testPropertyId);
      expect(deletedProperty).toBeNull();

      testPropertyId = ''; // Reset for cleanup
    });
  });

  describe('Property Search', () => {
    it('should search properties with filters', async () => {
      // Create test property
      const testProperty = await propertyAPI.createProperty({
        title: 'Search Test Property',
        address: '456 Search Ave',
        city: 'Abidjan',
        propertyType: 'appartement',
        monthlyRent: 120000
      });

      // Search by city
      const searchResults = await propertyAPI.searchProperties({
        city: 'Abidjan'
      });

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults.some(p => p.id === testProperty.id)).toBe(true);

      // Search by price range
      const priceResults = await propertyAPI.searchProperties({
        maxPrice: 150000,
        minPrice: 100000
      });

      expect(priceResults.some(p => p.id === testProperty.id)).toBe(true);

      // Cleanup
      await propertyAPI.deleteProperty(testProperty.id);
    });
  });
});
```

### Database Integration Tests

#### RLS Policy Tests (src/tests/integration/rls.test.ts)
```typescript
import { createClient } from '@supabase/supabase-js';

describe('Row Level Security', () => {
  let userClient: any;
  let ownerClient: any;
  let adminClient: any;

  beforeAll(async () => {
    // Create clients for different user types
    userClient = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.TEST_USER_TOKEN!
    );

    ownerClient = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.TEST_OWNER_TOKEN!
    );

    adminClient = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.TEST_ADMIN_TOKEN!
    );
  });

  describe('Property Access Control', () => {
    it('should allow owners to access their properties', async () => {
      const { data, error } = await ownerClient
        .from('properties')
        .select('*')
        .eq('owner_id', 'test-owner-id');

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should prevent users from accessing others properties', async () => {
      const { data, error } = await userClient
        .from('properties')
        .select('*')
        .eq('owner_id', 'other-owner-id');

      expect(error).not.toBeNull();
      expect(data).toEqual([]);
    });

    it('should allow admins to access all properties', async () => {
      const { data, error } = await adminClient
        .from('properties')
        .select('*');

      expect(error).toBeNull();
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe('Application Access Control', () => {
    it('should allow applicants to access their applications', async () => {
      const { data, error } = await userClient
        .from('rental_applications')
        .select('*')
        .eq('applicant_id', 'test-user-id');

      expect(error).toBeNull();
    });

    it('should prevent access to other users applications', async () => {
      const { data, error } = await userClient
        .from('rental_applications')
        .select('*')
        .eq('applicant_id', 'other-user-id');

      expect(error).not.toBeNull();
    });
  });
});
```

## End-to-End Testing

### Cypress Configuration

#### Setup (cypress.config.ts)
```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
  },
  env: {
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
  },
});
```

#### Custom Commands (cypress/support/commands.ts)
```typescript
// Auth commands
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('supabaseUrl')}/auth/v1/token?grant_type=password`,
    headers: {
      apikey: Cypress.env('supabaseAnonKey'),
      'Content-Type': 'application/json',
    },
    body: {
      email,
      password,
    },
  }).then((response) => {
    window.localStorage.setItem('supabase.auth.token', JSON.stringify(response.body));
  });
});

Cypress.Commands.add('logout', () => {
  window.localStorage.removeItem('supabase.auth.token');
  cy.visit('/');
});

// Property commands
Cypress.Commands.add('createProperty', (propertyData) => {
  return cy.request({
    method: 'POST',
    url: '/api/properties',
    body: propertyData,
  });
});

// File upload commands
Cypress.Commands.add('uploadFile', (fileName, fileType, selector) => {
  cy.fixture(fileName, 'base64').then((fileContent) => {
    cy.get(selector).attachFile({
      fileContent,
      fileName,
      mimeType: fileType,
    });
  });
});
```

### E2E Test Scenarios

#### Authentication Flow (cypress/e2e/auth.cy.ts)
```typescript
describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should allow user to sign up', () => {
    // Navigate to sign up
    cy.get('[data-testid="sign-up-button"]').click();

    // Fill sign up form
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="confirm-password-input"]').type('password123');
    cy.get('[data-testid="full-name-input"]').type('Test User');
    cy.get('[data-testid="user-type-select"]').select('proprietaire');

    // Submit form
    cy.get('[data-testid="sign-up-submit"]').click();

    // Verify success message
    cy.get('[data-testid="success-message"]')
      .should('contain', 'Inscription réussie');

    // Verify redirect to dashboard
    cy.url().should('include', '/dashboard');
  });

  it('should allow user to sign in', () => {
    // Navigate to sign in
    cy.get('[data-testid="sign-in-button"]').click();

    // Fill sign in form
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password123');

    // Submit form
    cy.get('[data-testid="sign-in-submit"]').click();

    // Verify success message
    cy.get('[data-testid="success-message"]')
      .should('contain', 'Connexion réussie');

    // Verify redirect to dashboard
    cy.url().should('include', '/dashboard');
  });

  it('should show error for invalid credentials', () => {
    cy.get('[data-testid="sign-in-button"]').click();
    cy.get('[data-testid="email-input"]').type('invalid@example.com');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="sign-in-submit"]').click();

    cy.get('[data-testid="error-message"]')
      .should('contain', 'Identifiants invalides');
  });

  it('should allow user to sign out', () => {
    // Sign in first
    cy.login('test@example.com', 'password123');
    cy.visit('/dashboard');

    // Sign out
    cy.get('[data-testid="sign-out-button"]').click();
    cy.get('[data-testid="confirm-sign-out"]').click();

    // Verify redirect to home
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });
});
```

#### Property Management Flow (cypress/e2e/properties.cy.ts)
```typescript
describe('Property Management', () => {
  beforeEach(() => {
    cy.login('owner@example.com', 'password123');
    cy.visit('/dashboard/owner');
  });

  it('should create a new property', () => {
    // Navigate to create property
    cy.get('[data-testid="add-property-button"]').click();

    // Fill property form
    cy.get('[data-testid="property-title"]').type('Beautiful Apartment');
    cy.get('[data-testid="property-address"]').type('123 Main St, Abidjan');
    cy.get('[data-testid="property-city"]').type('Abidjan');
    cy.get('[data-testid="property-type"]').select('appartement');
    cy.get('[data-testid="monthly-rent"]').type('150000');
    cy.get('[data-testid="bedrooms"]').type('3');
    cy.get('[data-testid="bathrooms"]').type('2');
    cy.get('[data-testid="surface-area"]').type('120');
    cy.get('[data-testid="property-description"]').type('Spacious apartment with great amenities');

    // Upload images
    cy.uploadFile('apartment1.jpg', 'image/jpeg', '[data-testid="property-images"]');
    cy.uploadFile('apartment2.jpg', 'image/jpeg', '[data-testid="property-images"]');

    // Submit form
    cy.get('[data-testid="submit-property"]').click();

    // Verify success
    cy.get('[data-testid="success-message"]')
      .should('contain', 'Propriété créée avec succès');

    // Verify property appears in list
    cy.get('[data-testid="property-list"]')
      .should('contain', 'Beautiful Apartment');
  });

  it('should edit an existing property', () => {
    // Find and click on a property
    cy.get('[data-testid="property-card"]').first().within(() => {
      cy.get('[data-testid="edit-button"]').click();
    });

    // Update property details
    cy.get('[data-testid="monthly-rent"]').clear().type('160000');
    cy.get('[data-testid="property-description"]').clear().type('Updated description');

    // Save changes
    cy.get('[data-testid="save-changes"]').click();

    // Verify success
    cy.get('[data-testid="success-message"]')
      .should('contain', 'Propriété mise à jour');
  });

  it('should delete a property', () => {
    // Find and click on a property
    cy.get('[data-testid="property-card"]').first().within(() => {
      cy.get('[data-testid="delete-button"]').click();
    });

    // Confirm deletion
    cy.get('[data-testid="confirm-delete"]').click();

    // Verify success
    cy.get('[data-testid="success-message"]')
      .should('contain', 'Propriété supprimée');
  });
});
```

#### Property Search Flow (cypress/e2e/search.cy.ts)
```typescript
describe('Property Search', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should search properties with filters', () => {
    // Set search filters
    cy.get('[data-testid="search-city"]').type('Abidjan');
    cy.get('[data-testid="property-type"]').select('appartement');
    cy.get('[data-testid="min-price"]').type('100000');
    cy.get('[data-testid="max-price"]').type('200000');
    cy.get('[data-testid="min-bedrooms"]').type('2');

    // Perform search
    cy.get('[data-testid="search-button"]').click();

    // Wait for results
    cy.get('[data-testid="search-results"]').should('be.visible');

    // Verify results
    cy.get('[data-testid="property-card"]').should('have.length.greaterThan', 0);

    // Verify filters are applied
    cy.get('[data-testid="property-card"]').each(($card) => {
      cy.wrap($card).find('[data-testid="property-type-badge"]')
        .should('contain', 'appartement');
      cy.wrap($card).find('[data-testid="bedroom-count"]')
        .invoke('text')
        .then((text) => {
          const bedrooms = parseInt(text);
          expect(bedrooms).to.be.at.least(2);
        });
    });
  });

  it('should show no results for impossible criteria', () => {
    // Set impossible filters
    cy.get('[data-testid="search-city"]').type('NonExistentCity');
    cy.get('[data-testid="max-price"]').type('1000');

    // Perform search
    cy.get('[data-testid="search-button"]').click();

    // Verify no results message
    cy.get('[data-testid="no-results"]')
      .should('contain', 'Aucun bien trouvé');
  });

  it('should save search criteria', () => {
    // Set filters
    cy.get('[data-testid="search-city"]').type('Abidjan');
    cy.get('[data-testid="property-type"]').select('villa');

    // Save search
    cy.get('[data-testid="save-search-button"]').click();
    cy.get('[data-testid="search-name-input"]').type('My Abidjan Villa Search');
    cy.get('[data-testid="confirm-save"]').click();

    // Verify saved search
    cy.get('[data-testid="saved-searches"]')
      .should('contain', 'My Abidjan Villa Search');
  });
});
```

## API Testing with Postman

### Collection Setup

#### Environment Variables
```json
{
  "name": "Mon Toit API Environment",
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
      "key": "serviceRoleKey",
      "value": "your-service-role-key",
      "enabled": true
    },
    {
      "key": "accessToken",
      "value": "",
      "enabled": true
    },
    {
      "key": "userId",
      "value": "",
      "enabled": true
    },
    {
      "key": "propertyId",
      "value": "",
      "enabled": true
    }
  ]
}
```

#### Test Scripts

#### Authentication Tests
```javascript
// Tests for authentication endpoints

// Sign Up Test
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has user data", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.user).to.be.an('object');
    pm.expect(jsonData.user.email).to.eql(pm.collectionVariables.get("testEmail"));
});

pm.test("Response has session data", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.session).to.be.an('object');
    pm.expect(jsonData.session.access_token).to.be.a('string');

    // Store access token for subsequent requests
    pm.collectionVariables.set("accessToken", jsonData.session.access_token);
});

// Sign In Test
pm.test("Authentication successful", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.access_token).to.be.a('string');

    // Store token and user ID
    pm.collectionVariables.set("accessToken", jsonData.access_token);
    pm.collectionVariables.set("userId", jsonData.user.id);
});

pm.test("User data is correct", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.user.email).to.eql(pm.collectionVariables.get("testEmail"));
});
```

#### Property Tests
```javascript
// Tests for property endpoints

// Create Property Test
pm.test("Property created successfully", function () {
    pm.response.to.have.status(201);

    const jsonData = pm.response.json();
    pm.expect(jsonData.id).to.be.a('string');
    pm.expect(jsonData.title).to.be.a('string');

    // Store property ID for subsequent tests
    pm.collectionVariables.set("propertyId", jsonData.id);
});

pm.test("Property data is valid", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.monthly_rent).to.be.a('number');
    pm.expect(jsonData.monthly_rent).to.be.above(0);
    pm.expect(jsonData.status).to.eql('disponible');
});

// Get Properties Test
pm.test("Properties retrieved successfully", function () {
    pm.response.to.have.status(200);

    const jsonData = pm.response.json();
    pm.expect(jsonData).to.be.an('array');
});

pm.test("Properties have required fields", function () {
    const jsonData = pm.response.json();
    if (jsonData.length > 0) {
        jsonData.forEach(property => {
            pm.expect(property).to.have.property('id');
            pm.expect(property).to.have.property('title');
            pm.expect(property).to.have.property('city');
            pm.expect(property).to.have.property('monthly_rent');
        });
    }
});

// Search Properties Test
pm.test("Search executed successfully", function () {
    pm.response.to.have.status(200);

    const jsonData = pm.response.json();
    pm.expect(jsonData).to.be.an('array');
});

pm.test("Search filters applied correctly", function () {
    const jsonData = pm.response.json();
    const maxPrice = parseInt(pm.collectionVariables.get("maxPrice"));

    if (jsonData.length > 0) {
        jsonData.forEach(property => {
            pm.expect(property.monthly_rent).to.be.at.most(maxPrice);
        });
    }
});
```

## Performance Testing

### Load Testing with Artillery

#### Configuration (artillery.config.yml)
```yaml
config:
  target: '{{ $processEnvironment.API_BASE_URL }}'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      name: "Load test"
    - duration: 60
      arrivalRate: 20
      name: "Stress test"
  payload:
    path: "test-data.csv"
    fields:
      - "email"
      - "password"
  processor: "test-processor.js"

scenarios:
  - name: "User Authentication Flow"
    weight: 30
    flow:
      - post:
          url: "/auth/v1/token?grant_type=password"
          headers:
            apikey: "{{ $processEnvironment.ANON_KEY }}"
            Content-Type: "application/json"
          json:
            email: "{{ email }}"
            password: "{{ password }}"
          capture:
            - json: "$.access_token"
              as: "accessToken"
      - think: 2
      - get:
          url: "/rest/v1/profiles"
          headers:
            Authorization: "Bearer {{ accessToken }}"
            apikey: "{{ $processEnvironment.ANON_KEY }}"

  - name: "Property Search"
    weight: 50
    flow:
      - post:
          url: "/rest/v1/rpc/get_public_properties"
          headers:
            apikey: "{{ $processEnvironment.ANON_KEY }}"
            Content-Type: "application/json"
          json:
            p_city: "Abidjan"
            p_max_rent: 200000
            p_min_bedrooms: 2
      - think: 1

  - name: "Property Details"
    weight: 20
    flow:
      - get:
          url: "/rest/v1/properties"
          headers:
            apikey: "{{ $processEnvironment.ANON_KEY }}"
          qs:
            select: "id,title,city,monthly_rent"
            limit: "10"
      - think: 1
```

#### Test Data Generator (generate-data.js)
```javascript
const fs = require('fs');

const users = [];
for (let i = 1; i <= 100; i++) {
  users.push({
    email: `user${i}@test.com`,
    password: 'password123'
  });
}

fs.writeFileSync('test-data.csv', 'email,password\n');
users.forEach(user => {
  fs.appendFileSync('test-data.csv', `${user.email},${user.password}\n`);
});

console.log('Test data generated');
```

### Performance Monitoring

#### Lighthouse CI Configuration
```yaml
# .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/search',
        'http://localhost:3000/properties/1'
      ],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'categories:pwa': ['error', { minScore: 0.8 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
```

## Security Testing

### OWASP ZAP Integration

#### Security Test Script (security-test.js)
```javascript
const ZapClient = require('zaproxy');

async function runSecurityTests() {
  const zap = new ZapClient({
    proxy: 'http://localhost:8080'
  });

  // Start spidering
  console.log('Starting spider scan...');
  const spiderId = await zap.spider.scan('http://localhost:3000');

  // Wait for spider to complete
  let progress = 0;
  while (progress < 100) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const status = await zap.spider.status(spiderId);
    progress = parseInt(status.status);
    console.log(`Spider progress: ${progress}%`);
  }

  // Start active scan
  console.log('Starting active scan...');
  const scanId = await zap.ascan.scan('http://localhost:3000');

  // Wait for scan to complete
  progress = 0;
  while (progress < 100) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    const status = await zap.ascan.status(scanId);
    progress = parseInt(status.status);
    console.log(`Active scan progress: ${progress}%`);
  }

  // Get results
  const alerts = await zap.core.alerts();
  console.log('Security alerts found:', alerts.length);

  // Generate report
  await zap.core.htmlreport();
  console.log('Security report generated');
}

runSecurityTests().catch(console.error);
```

## Test Data Management

### Database Seeding

#### Seed Script (scripts/seed-test-data.js)
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedTestData() {
  console.log('Seeding test data...');

  // Create test users
  const testUsers = [
    {
      email: 'owner@test.com',
      password: 'password123',
      user_metadata: {
        full_name: 'Test Owner',
        user_type: 'proprietaire'
      }
    },
    {
      email: 'tenant@test.com',
      password: 'password123',
      user_metadata: {
        full_name: 'Test Tenant',
        user_type: 'locataire'
      }
    },
    {
      email: 'admin@test.com',
      password: 'password123',
      user_metadata: {
        full_name: 'Test Admin',
        user_type: 'admin_ansut'
      }
    }
  ];

  for (const userData of testUsers) {
    const { data, error } = await supabase.auth.admin.createUser(userData);
    if (error) {
      console.error('Error creating user:', error);
    } else {
      console.log('Created user:', data.user.email);
    }
  }

  // Create test properties
  const { data: ownerUser } = await supabase.auth.getUser();

  const testProperties = [
    {
      title: 'Test Apartment 1',
      address: '123 Test St',
      city: 'Abidjan',
      property_type: 'appartement',
      monthly_rent: 150000,
      bedrooms: 2,
      bathrooms: 1,
      owner_id: ownerUser.user.id
    },
    {
      title: 'Test Villa 1',
      address: '456 Test Ave',
      city: 'Abidjan',
      property_type: 'villa',
      monthly_rent: 300000,
      bedrooms: 4,
      bathrooms: 2,
      owner_id: ownerUser.user.id
    }
  ];

  for (const propertyData of testProperties) {
    const { data, error } = await supabase
      .from('properties')
      .insert(propertyData)
      .select();

    if (error) {
      console.error('Error creating property:', error);
    } else {
      console.log('Created property:', data[0].title);
    }
  }

  console.log('Test data seeded successfully');
}

seedTestData().catch(console.error);
```

## CI/CD Integration

### GitHub Actions Workflow

#### Test Workflow (.github/workflows/test.yml)
```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup test environment
        run: |
          cp .env.test .env.local
          npm run db:test:setup

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Cleanup test environment
        run: npm run db:test:cleanup

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Start application
        run: npm start &

      - name: Wait for application
        run: npx wait-on http://localhost:3000

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload screenshots
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: cypress-screenshots
          path: cypress/screenshots

  security-tests:
    runs-on: ubuntu-latest
    needs: unit-tests

    steps:
      - uses: actions/checkout@v3

      - name: Run security audit
        run: npm audit --audit-level high

      - name: Run OWASP ZAP scan
        uses: zaproxy/action-full-scan@v0.7.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
```

This comprehensive testing documentation provides everything needed to ensure the Mon Toit API is thoroughly tested, secure, and performant.