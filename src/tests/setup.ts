/**
 * Configuration des tests de sécurité
 */

import { vi } from 'vitest';
import { supabase } from '@/services/supabase/client';

// Mock de Supabase pour les tests
vi.mock('@/services/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        in: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        or: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        range: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://test.com' } })),
        remove: vi.fn(() => Promise.resolve({ error: null })),
        createSignedUrl: vi.fn(() =>
          Promise.resolve({ data: { signedUrl: 'http://signed.com' }, error: null })
        ),
      })),
    },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

// Configuration globale pour les tests de sécurité
beforeAll(() => {
  // Désactiver les logs pendant les tests
  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();

  // Configurer le timeout pour les tests asynchrones
  vi.setConfig({ testTimeout: 10000 });

  // Mock de localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Mock de sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  });

  // Mock de fetch
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      headers: new Map(),
    } as Response)
  );

  // Mock de performance.now() pour les tests de performance
  Object.defineProperty(performance, 'now', {
    value: vi.fn(() => Date.now()),
    writable: true,
  });
});

afterAll(() => {
  // Nettoyer les mocks
  vi.restoreAllMocks();
});

// Helper function pour créer des erreurs de Supabase
export function createSupabaseError(message: string) {
  return {
    message,
    details: '',
    hint: '',
    code: '400',
  };
}

// Helper function pour simuler des données utilisateur
export function createMockUser(overrides: any = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// Helper function pour simuler un profil utilisateur
export function createMockProfile(overrides: any = {}) {
  return {
    id: 'test-profile-id',
    user_id: 'test-user-id',
    email: 'test@example.com',
    full_name: 'Test User',
    user_type: 'tenant',
    is_verified: false,
    trust_score: 50,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// Helper function pour simuler une propriété
export function createMockProperty(overrides: any = {}) {
  return {
    id: 'test-property-id',
    title: 'Test Property',
    description: 'Test Description',
    address: '123 Test St',
    city: 'Test City',
    owner_id: 'test-owner-id',
    status: 'available',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// Helper function pour simuler un contrat
export function createMockContract(overrides: any = {}) {
  return {
    id: 'test-contract-id',
    property_id: 'test-property-id',
    owner_id: 'test-owner-id',
    tenant_id: 'test-tenant-id',
    status: 'draft',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// Helper function pour attendre (async/await helper)
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
