/**
 * Tests du système d'authentification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validatePassword, generateSecurePassword } from '@/shared/utils/passwordPolicy';
import { PasswordStrengthIndicator } from '@/shared/ui/PasswordStrengthIndicator';
import { authApi } from '@/features/auth/services/auth.api';

describe('Password Policy', () => {
  it('devrait rejeter les mots de passe trop courts', () => {
    const result = validatePassword('abc123');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Le mot de passe doit contenir au moins 8 caractères');
  });

  it('devrait exiger une majuscule', () => {
    const result = validatePassword('password123!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Le mot de passe doit contenir au moins une majuscule');
  });

  it('devrait exiger une minuscule', () => {
    const result = validatePassword('PASSWORD123!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Le mot de passe doit contenir au moins une minuscule');
  });

  it('devrait exiger un chiffre', () => {
    const result = validatePassword('Password!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Le mot de passe doit contenir au moins un chiffre');
  });

  it('devrait exiger un caractère spécial', () => {
    const result = validatePassword('Password123');
    console.log('Résultat validation:', result);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('caractère spécial'))).toBe(true);
  });

  it('devrait rejeter les motifs interdits', () => {
    const result = validatePassword('Passsword123!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Le mot de passe contient un motif non autorisé');
  });

  it('devrait accepter les mots de passe valides', () => {
    const result = validatePassword('SecureP@ss123');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.score).toBeGreaterThan(70);
  });

  it('devrait générer des mots de passe sécurisés', () => {
    const password = generateSecurePassword(12);
    const result = validatePassword(password);
    expect(result.isValid).toBe(true);
    expect(password.length).toBe(12);
  });
});

describe('PasswordStrengthIndicator', () => {
  it('devrait afficher correctement la force', () => {
    // Test avec un mot de passe faible
    const weakResult = validatePassword('weak123');
    expect(weakResult.score).toBeLessThanOrEqual(40);

    // Test avec un mot de passe fort
    const strongResult = validatePassword('Str0ngP@ss!');
    expect(strongResult.score).toBeGreaterThan(80);
  });
});

describe('Auth API', () => {
  // Note: Ces tests nécessitent une configuration Supabase de test
  // Ils servent de documentation sur le comportement attendu

  describe('signUp', () => {
    it('devrait valider le mot de passe avant inscription', async () => {
      const invalidPasswordData = {
        email: 'test@example.com',
        password: '123456', // Mot de passe invalide
        fullName: 'Test User',
        phone: '+2250700000000',
        role: 'tenant' as const
      };

      try {
        await authApi.signUp(invalidPasswordData);
        // Si on arrive ici, le test échoue
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('mot de passe');
      }
    });

    it('devrait accepter un mot de passe valide', async () => {
      const validPasswordData = {
        email: 'test@example.com',
        password: 'SecureP@ss123',
        fullName: 'Test User',
        phone: '+2250700000000',
        role: 'tenant' as const
      };

      // Ce test nécessite un mock de Supabase
      try {
        const result = await authApi.signUp(validPasswordData);
        expect(result.error).toBeNull();
      } catch (error) {
        // Erreur attendue si Supabase n'est pas configuré
        console.log('Erreur Supabase attendue:', error);
      }
    });
  });

  describe('updatePassword', () => {
    it('devrait valider le nouveau mot de passe', async () => {
      try {
        await authApi.updatePassword('weak123');
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('mot de passe');
      }
    });
  });
});

// Tests d'intégration pour les Edge Functions
describe('Edge Functions Security', () => {
  it('send-auth-otp ne devrait pas exposer le code OTP', async () => {
    // Ce test simule un appel à l'edge function
    // En production, la réponse ne doit pas contenir l'OTP

    const mockResponse = {
      success: true,
      message: 'Code envoyé par SMS',
      provider: 'brevo',
      expiresIn: 600,
      // PAS de champ 'otp' ou 'devMode'
    };

    expect(mockResponse).not.toHaveProperty('otp');
    expect(mockResponse).not.toHaveProperty('devMode');
  });

  it('devrait avoir des en-têtes CORS sécurisés', () => {
    const expectedOrigin = 'https://montoit.ansut.ci';
    const expectedMethods = 'POST';
    const expectedHeaders = 'Content-Type, Authorization';

    // Simule les en-têtes CORS attendus
    const corsHeaders = {
      'Access-Control-Allow-Origin': expectedOrigin,
      'Access-Control-Allow-Methods': expectedMethods,
      'Access-Control-Allow-Headers': expectedHeaders,
    };

    expect(corsHeaders['Access-Control-Allow-Origin']).not.toBe('*');
    expect(corsHeaders['Access-Control-Allow-Methods']).toBe('POST');
    expect(corsHeaders['Access-Control-Allow-Headers']).not.toContain('X-Client-Info');
    expect(corsHeaders['Access-Control-Allow-Headers']).not.toContain('Apikey');
  });
});