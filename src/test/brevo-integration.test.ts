/**
 * Tests d'intégration pour le système Brevo OTP
 *
 * Ces tests valident le fonctionnement complet du système d'authentification OTP
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { otpUnifiedService } from '@/services/brevo/otp-unified.service';
import { authBrevoService } from '@/services/brevo/auth-brevo.service';

// Mock Supabase
vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
          maybeSingle: vi.fn(() => ({ data: null, error: null })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => ({ data: [], error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    })),
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      signUp: vi.fn(),
      setSession: vi.fn(),
      getUser: vi.fn(),
    },
  },
}));

describe('OTP Unified Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendOTP', () => {
    it('devrait envoyer un OTP par email', async () => {
      const { supabase } = await import('@/services/supabase/client');
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: { status: 'ok', brevoMessageId: 'test-message-id' },
        error: null,
      });

      const result = await otpUnifiedService.sendOTP({
        recipient: 'test@example.com',
        method: 'email',
        userName: 'Test User',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
    });

    it('devrait envoyer un OTP par SMS', async () => {
      const { supabase } = await import('@/services/supabase/client');
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: { status: 'ok', brevoMessageId: 'sms-message-id' },
        error: null,
      });

      const result = await otpUnifiedService.sendOTP({
        recipient: '+2250700000000',
        method: 'sms',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('sms-message-id');
    });

    it('devrait envoyer un OTP par WhatsApp', async () => {
      const { supabase } = await import('@/services/supabase/client');
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: { status: 'ok', brevoMessageId: 'whatsapp-message-id' },
        error: null,
      });

      const result = await otpUnifiedService.sendOTP({
        recipient: '+2250700000000',
        method: 'whatsapp',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('whatsapp-message-id');
    });

    it("devrait gérer les erreurs d'envoi", async () => {
      const { supabase } = await import('@/services/supabase/client');
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: { status: 'error', reason: 'API Error' },
        error: null,
      });

      const result = await otpUnifiedService.sendOTP({
        recipient: 'test@example.com',
        method: 'email',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });

  describe('verifyOTP', () => {
    it('devrait vérifier un OTP valide', async () => {
      const { supabase } = await import('@/services/supabase/client');
      const mockSupabase = supabase as any;

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    single: vi.fn(() => ({
                      data: {
                        id: 'otp-id',
                        recipient: 'test@example.com',
                        code: '123456',
                        method: 'email',
                      },
                      error: null,
                    })),
                  })),
                })),
              })),
            })),
          })),
        })),
      });

      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
      });

      const result = await otpUnifiedService.verifyOTP({
        recipient: 'test@example.com',
        code: '123456',
        method: 'email',
      });

      expect(result.success).toBe(true);
    });

    it('devrait rejeter un OTP invalide', async () => {
      const { supabase } = await import('@/services/supabase/client');
      const mockSupabase = supabase as any;

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    single: vi.fn(() => ({
                      data: null,
                      error: { message: 'No data found' },
                    })),
                  })),
                })),
              })),
            })),
          })),
        })),
      });

      const result = await otpUnifiedService.verifyOTP({
        recipient: 'test@example.com',
        code: 'wrong-code',
        method: 'email',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Code invalide ou expiré');
    });
  });
});

describe('Auth Brevo Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initiateAuth', () => {
    it("devrait initier l'authentification par email", async () => {
      const result = await authBrevoService.initiateAuth({
        email: 'test@example.com',
        method: 'email',
        fullName: 'Test User',
      });

      expect(result.success).toBe(true);
      expect(result.otpSent).toBe(true);
    });

    it("devrait initier l'authentification par téléphone", async () => {
      const result = await authBrevoService.initiateAuth({
        phone: '+2250700000000',
        method: 'phone',
        fullName: 'Test User',
      });

      expect(result.success).toBe(true);
      expect(result.otpSent).toBe(true);
    });
  });

  describe('updateProfileRole', () => {
    it('devrait mettre à jour le rôle utilisateur', async () => {
      const { supabase } = await import('@/services/supabase/client');
      const mockSupabase = supabase as any;

      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
      });

      const result = await authBrevoService.updateProfileRole('user-id', 'locataire');

      expect(result.success).toBe(true);
    });
  });
});

// Tests d'intégration avec React Hook
describe('useBrevoAuth Hook', () => {
  // Note: Les tests de hooks React nécessiteraient @testing-library/react
  // Ceci est un exemple de structure de test

  it("devrait gérer le flux d'envoi OTP", () => {
    // Test avec React Testing Library
    // 1. Rendre le composant avec le hook
    // 2. Simuler la saisie utilisateur
    // 3. Cliquer sur le bouton d'envoi
    // 4. Vérifier l'état de chargement
    // 5. Vérifier le message de succès
  });

  it('devrait gérer le flux de vérification OTP', () => {
    // Test avec React Testing Library
    // 1. Simuler l'envoi OTP réussi
    // 2. Saisir un code OTP
    // 3. Cliquer sur vérifier
    // 4. Vérifier la redirection
  });
});

// Tests E2E (Playwright)
describe('Tests E2E - Authentification OTP', () => {
  it("devrait compléter le flux d'inscription par email", async () => {
    // Test E2E avec Playwright
    // 1. Visiter la page d'inscription
    // 2. Choisir méthode email
    // 3. Saisir email et nom
    // 4. Vérifier réception OTP
    // 5. Saisir OTP
    // 6. Choisir un rôle
    // 7. Vérifier redirection dashboard
  });

  it("devrait compléter le flux d'inscription par téléphone", async () => {
    // Test E2E avec Playwright
    // 1. Visiter la page d'inscription
    // 2. Choisir méthode téléphone
    // 3. Saisir numéro
    // 4. Choisir WhatsApp
    // 5. Vérifier réception OTP
    // 6. Saisir OTP
    // 7. Saisir nom
    // 8. Vérifier création compte
  });
});
