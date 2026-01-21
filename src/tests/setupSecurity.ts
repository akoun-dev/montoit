/**
 * Setup spécifique pour les tests de sécurité
 * Mock les dépendances externes et configure l'environnement de test
 */

import { vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock global pour les APIs du navigateur
global.fetch = vi.fn(() => Promise.resolve({
  ok: true,
  status: 200,
  headers: new Headers({
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': "default-src 'self'",
  }),
  json: async () => ({}),
  text: async () => '',
  blob: async () => new Blob(),
  arrayBuffer: async () => new ArrayBuffer(0),
})) as any;
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock du localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock du sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock de l'intersection observer
global.IntersectionObserver = class IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
};

// Mock de resize observer
global.ResizeObserver = class ResizeObserver {
  constructor(_callback: ResizeObserverCallback) {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Polyfill pour File.arrayBuffer() qui n'existe pas dans jsdom
if (typeof File !== 'undefined' && !File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = function () {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer);
      };
      reader.onerror = () => {
        resolve(new ArrayBuffer(0));
      };
      reader.readAsArrayBuffer(this);
    });
  };
}

/**
 * Mock de Supabase pour les tests de sécurité
 */
const createMockSupabaseClient = () => {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null })),
          })),
          single: vi.fn(() => ({ data: null, error: null })),
          limit: vi.fn(() => ({ data: [], error: null })),
        })),
        single: vi.fn(() => ({ data: null, error: null })),
        limit: vi.fn(() => ({ data: [], error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({ data: null, error: { message: 'Unauthorized' } })),
          })),
        })),
        insert: vi.fn(() => ({ data: null, error: null })),
        delete: vi.fn(() => ({ data: null, error: null })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({ data: null, error: { message: 'Unauthorized' } })),
          })),
          select: vi.fn(() => ({ data: null, error: { message: 'Unauthorized' } })),
        })),
      })),
      insert: vi.fn(() => ({ data: null, error: null })),
      delete: vi.fn(() => ({ data: null, error: null })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: null },
        error: null,
      })),
      signInWithPassword: vi.fn(() => Promise.resolve({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      })),
      signUp: vi.fn(() => Promise.resolve({
        data: { user: null, session: null },
        error: null,
      })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      resetPasswordForEmail: vi.fn(() => Promise.resolve({ error: null })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => ({ data: { path: 'mock-path' }, error: null })),
        remove: vi.fn(() => ({ error: null })),
        createSignedUrl: vi.fn(() => ({ data: { signedUrl: 'mock-url' }, error: null })),
      })),
    },
  };
};

// Créer le mock Supabase
const mockSupabase = createMockSupabaseClient();

// Mock du module Supabase
vi.mock('@/services/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Réinitialiser les mocks avant chaque test
beforeEach(() => {
  vi.clearAllMocks();
});

// Nettoyer après chaque test
afterEach(() => {
  vi.restoreAllMocks();
});

export default {};
