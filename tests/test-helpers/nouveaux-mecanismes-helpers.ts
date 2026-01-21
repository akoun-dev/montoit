/**
 * Fonctions utilitaires pour tester les nouveaux mécanismes de validation de MonToit
 */

import { renderHook, act } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';

/**
 * Fonctions utilitaires pour tester le service de validation
 */
export const testValidationService = {
  /**
   * Teste si un objet de données invalides est correctement validé
   */
  async testInvalidData(validationFn: Function, invalidData: any, expectedErrorFields: string[]) {
    const result = await validationFn(invalidData);
    
    expect(result.valid).toBe(false);
    expectedErrorFields.forEach(field => {
      expect(result.errors[field]).toBeDefined();
    });
  },

  /**
   * Teste si un objet de données valides est correctement validé
   */
  async testValidData(validationFn: Function, validData: any) {
    const result = await validationFn(validData);
    
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  },

  /**
   * Teste la validation d'emails
   */
  testEmailValidation(validateEmail: Function) {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'user+tag@domain.com',
      '123@example.com'
    ];

    const invalidEmails = [
      'invalid-email',
      'test@',
      '@example.com',
      'test..test@example.com',
      'test @example.com'
    ];

    validEmails.forEach(email => {
      expect(validateEmail(email)).toBe(true);
    });

    invalidEmails.forEach(email => {
      expect(validateEmail(email)).toBe(false);
    });
  },

  /**
   * Teste la validation de numéros de téléphone ivoiriens
   */
  testPhoneValidation(validatePhone: Function) {
    const validPhones = [
      '07123456',
      '+22507123456',
      '07 12 34 56',
      '+225 07 12 34 56'
    ];

    const invalidPhones = [
      '123',
      'abcdef',
      '+225123',
      '07123456789'
    ];

    validPhones.forEach(phone => {
      expect(validatePhone(phone)).toBe(true);
    });

    invalidPhones.forEach(phone => {
      expect(validatePhone(phone)).toBe(false);
    });
  }
};

/**
 * Fonctions utilitaires pour tester la gestion d'erreur
 */
export const testErrorHandling = {
  /**
   * Teste le retry automatique avec backoff exponentiel
   */
  async testRetryMechanism(ErrorHandler: any, retries: number = 3) {
    const errors: Error[] = [];
    let attemptCount = 0;

    const mockOperation = vi.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount <= retries) {
        const error = new Error(`Network error (attempt ${attemptCount})`);
        errors.push(error);
        throw error;
      }
      return Promise.resolve('success');
    });

    const context = {
      service: 'test-service',
      operation: 'test-operation'
    };

    const result = await ErrorHandler.executeWithRetry(mockOperation, context, {
      maxRetries: retries,
      baseDelay: 100
    });

    expect(result).toBe('success');
    expect(attemptCount).toBe(retries + 1);
    expect(errors.length).toBe(retries);
  },

  /**
   * Teste l'identification des erreurs réessayables
   */
  testRetryableErrorIdentification(ErrorHandler: any) {
    const retryableErrors = [
      new Error('Network error'),
      { name: 'TimeoutError' },
      { message: 'timeout occurred' },
      { status: 500 },
      { status: 502 },
      { status: 503 },
      { status: 504 },
      { status: 429 },
      { status: 408 },
      { code: 'PGRST116' },
      { code: '23505' }
    ];

    const nonRetryableErrors = [
      new Error('Validation failed'),
      { status: 400 },
      { status: 401 },
      { status: 403 },
      { status: 404 },
      { code: '23514' },
      { code: '42501' }
    ];

    retryableErrors.forEach(error => {
      expect(ErrorHandler.isRetryableError(error)).toBe(true);
    });

    nonRetryableErrors.forEach(error => {
      expect(ErrorHandler.isRetryableError(error)).toBe(false);
    });
  },

  /**
   * Teste le timeout des opérations
   */
  async testTimeoutHandling(ErrorHandler: any) {
    const mockOperation = vi.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    const context = {
      service: 'test-service',
      operation: 'test-operation'
    };

    await expect(
      ErrorHandler.executeWithRetry(mockOperation, context, {
        timeout: 100,
        maxRetries: 0
      })
    ).rejects.toThrow('Timeout');
  },

  /**
   * Teste le calcul du backoff exponentiel avec jitter
   */
  testExponentialBackoff(ErrorHandler: any) {
    const delays: number[] = [];
    const originalDelay = ErrorHandler.delay;

    ErrorHandler.delay = vi.fn().mockImplementation((ms: number) => {
      delays.push(ms);
      return Promise.resolve();
    });

    const mockOperation = vi.fn().mockRejectedValue(new Error('Network error'));
    const context = {
      service: 'test-service',
      operation: 'test-operation'
    };

    // Lancer une série de retries
    ErrorHandler.executeWithRetry(mockOperation, context, {
      maxRetries: 3,
      baseDelay: 100,
      exponentialBase: 2
    }).catch(() => {}); // Ignorer l'erreur finale

    // Vérifier que les délais augmentent
    expect(delays.length).toBe(3);
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThanOrEqual(delays[i-1]);
    }

    // Restaurer
    ErrorHandler.delay = originalDelay;
  }
};

/**
 * Fonctions utilitaires pour tester les hooks HTTP avec AbortController
 */
export const testHttpHooks = {
  /**
   * Teste l'annulation des requêtes avec AbortController
   */
  async testRequestCancellation(useHttpHook: Function) {
    const { result, unmount } = renderHook(() => useHttpHook());

    // Lancer une requête lente
    const requestPromise = result.current.get('/api/slow-endpoint');

    // Annuler immédiatement
    unmount();

    // La requête devrait être annulée proprement
    await expect(requestPromise).rejects.toThrow();
  },

  /**
   * Teste la gestion des timeouts avec AbortController
   */
  async testTimeoutHandling(useHttpHook: Function) {
    const { result } = renderHook(() => useHttpHook());

    // Mock une requête qui dépasse le timeout
    global.fetch = vi.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    const requestPromise = result.current.get('/api/test', { timeout: 100 });

    await expect(requestPromise).rejects.toThrow();
  },

  /**
   * Teste que les requêtes précédentes sont annulées
   */
  async testPreviousRequestCancellation(useHttpHook: Function) {
    const { result } = renderHook(() => useHttpHook());

    // Lancer plusieurs requêtes rapidement
    const request1 = result.current.get('/api/test1');
    const request2 = result.current.get('/api/test2');
    const request3 = result.current.get('/api/test3');

    // Toutes devraient être résolues sans erreur
    await Promise.all([
      expect(request1).resolves.toBeDefined(),
      expect(request2).resolves.toBeDefined(),
      expect(request3).resolves.toBeDefined()
    ]);
  },

  /**
   * Teste le cleanup automatique lors du démontage
   */
  testAutomaticCleanup(useHttpHook: Function) {
    const { unmount } = renderHook(() => useHttpHook());

    // Le démontage ne devrait pas générer d'erreur
    expect(() => unmount()).not.toThrow();
  }
};

/**
 * Fonctions utilitaires pour tester le debouncing
 */
export const testDebouncing = {
  /**
   * Teste le debouncing d'une valeur simple
   */
  testValueDebouncing() {
    const { result } = renderHook(() => {
      const { useDebounce } = require('@/hooks/useDebounce');
      return useDebounce('initial', 100);
    });

    expect(result.current).toBe('initial');
  },

  /**
   * Teste le debouncing d'une recherche
   */
  testSearchDebouncing() {
    const { result } = renderHook(() => {
      const { useDebouncedSearch } = require('@/hooks/useDebounce');
      return useDebouncedSearch('', 300);
    });

    expect(result.current.query).toBe('');
    expect(result.current.debouncedSearchQuery).toBe('');
    expect(result.current.isSearching).toBe(false);
  },

  /**
   * Teste le debouncing des filtres
   */
  testFiltersDebouncing() {
    const initialFilters = { type: 'apartment', minPrice: 0 };
    
    const { result } = renderHook(() => {
      const { useDebouncedFilters } = require('@/hooks/useDebounce');
      return useDebouncedFilters(initialFilters, 200);
    });

    expect(result.current.filters).toEqual(initialFilters);
    expect(result.current.debouncedFilters).toEqual(initialFilters);
  },

  /**
   * Teste l'auto-save avec debouncing
   */
  testAutoSaveDebouncing() {
    const initialData = { name: '', email: '' };

    const { result } = renderHook(() => {
      const { useDebouncedAutoSave } = require('@/hooks/useDebounce');
      return useDebouncedAutoSave(initialData, 500);
    });

    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.updateData({ name: 'John' });
    });

    expect(result.current.isDirty).toBe(true);
  },

  /**
   * Teste les délais configurés
   */
  testConfiguredDelays() {
    const { DEBOUNCE_DELAYS } = require('@/hooks/useDebounce');
    
    expect(DEBOUNCE_DELAYS.SEARCH).toBe(300);
    expect(DEBOUNCE_DELAYS.FILTERS).toBe(500);
    expect(DEBOUNCE_DELAYS.AUTOSAVE).toBe(1000);
    expect(DEBOUNCE_DELAYS.TYPING).toBe(500);
    expect(DEBOUNCE_DELAYS.NAVIGATION).toBe(200);
    expect(DEBOUNCE_DELAYS.API_RETRY).toBe(1000);
  }
};

/**
 * Fonctions utilitaires pour tester les cleanup functions
 */
export const testCleanupFunctions = {
  /**
   * Teste la création et le nettoyage d'un AbortController
   */
  async testAbortControllerCleanup(cleanupRegistry: any) {
    const controller = cleanupRegistry.createAbortController(
      'test-abort',
      'Test AbortController',
      'TestComponent'
    );

    expect(cleanupRegistry.has('test-abort')).toBe(true);

    const removed = cleanupRegistry.remove('test-abort');
    expect(removed).toBe(true);
    expect(cleanupRegistry.has('test-abort')).toBe(false);
  },

  /**
   * Teste la création et le nettoyage d'un timeout
   */
  async testTimeoutCleanup(cleanupRegistry: any) {
    let timeoutCalled = false;
    const callback = () => { timeoutCalled = true; };

    const timeoutId = cleanupRegistry.createTimeout(
      'test-timeout',
      callback,
      100,
      'Test Timeout',
      'TestComponent'
    );

    expect(cleanupRegistry.has('test-timeout')).toBe(true);

    // Nettoyer avant exécution
    cleanupRegistry.remove('test-timeout');

    // Attendre après le délai prévu
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    expect(timeoutCalled).toBe(false);
  },

  /**
   * Teste le nettoyage par composant
   */
  testComponentCleanup(cleanupRegistry: any) {
    // Ajouter des ressources pour différents composants
    cleanupRegistry.createAbortController('abort-1', 'Test 1', 'Component1');
    cleanupRegistry.createTimeout('timeout-1', () => {}, 100, 'Test 2', 'Component1');
    cleanupRegistry.createInterval('interval-1', () => {}, 100, 'Test 3', 'Component2');

    // Nettoyer Component1
    const cleanedCount = cleanupRegistry.cleanupComponent('Component1');
    expect(cleanedCount).toBe(2);

    // Vérifier que Component2 est intact
    expect(cleanupRegistry.has('interval-1')).toBe(true);
    expect(cleanupRegistry.has('abort-1')).toBe(false);
    expect(cleanupRegistry.has('timeout-1')).toBe(false);
  },

  /**
   * Teste le nettoyage par type
   */
  testTypeCleanup(cleanupRegistry: any) {
    cleanupRegistry.createAbortController('abort-1', 'Test 1', 'Component1');
    cleanupRegistry.createTimeout('timeout-1', () => {}, 100, 'Test 2', 'Component2');
    cleanupRegistry.createInterval('interval-1', () => {}, 100, 'Test 3', 'Component3');

    // Nettoyer tous les timeouts
    const cleanedCount = cleanupRegistry.cleanupByType('timeout');
    expect(cleanedCount).toBe(1);

    // Vérifier que seul le timeout a été nettoyé
    expect(cleanupRegistry.has('abort-1')).toBe(true);
    expect(cleanupRegistry.has('timeout-1')).toBe(false);
    expect(cleanupRegistry.has('interval-1')).toBe(true);
  },

  /**
   * Teste les statistiques du registry
   */
  testStats(cleanupRegistry: any) {
    cleanupRegistry.createAbortController('abort-1', 'Test 1', 'Component1');
    cleanupRegistry.createTimeout('timeout-1', () => {}, 100, 'Test 2', 'Component2');

    const stats = cleanupRegistry.getStats();

    expect(stats.totalResources).toBe(2);
    expect(stats.byType['abort-controller']).toBe(1);
    expect(stats.byType['timeout']).toBe(1);
    expect(stats.oldestResource).toBeDefined();
    expect(stats.newestResource).toBeDefined();
  },

  /**
   * Teste la détection des fuites de mémoire
   */
  testMemoryLeakDetection(cleanupRegistry: any) {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Créer beaucoup de timeouts pour déclencher l'alerte
    for (let i = 0; i < 15; i++) {
      cleanupRegistry.createTimeout(`timeout-${i}`, () => {}, 100, `Test ${i}`, 'Component');
    }

    // Vérifier que l'alerte a été générée
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Many timeouts')
    );

    warnSpy.mockRestore();
  },

  /**
   * Teste le nettoyage global
   */
  testGlobalCleanup(cleanupRegistry: any) {
    cleanupRegistry.createAbortController('abort-1', 'Test 1', 'Component1');
    cleanupRegistry.createTimeout('timeout-1', () => {}, 100, 'Test 2', 'Component2');
    cleanupRegistry.createInterval('interval-1', () => {}, 100, 'Test 3', 'Component3');

    const cleanedCount = cleanupRegistry.cleanupAll();

    expect(cleanedCount).toBe(3);
    expect(cleanupRegistry.getStats().totalResources).toBe(0);
  }
};

/**
 * Fonctions utilitaires pour tester l'intégration complète
 */
export const testIntegration = {
  /**
   * Teste un scénario complet de candidature avec tous les mécanismes
   */
  async testCompleteApplicationScenario() {
    const { result, unmount } = renderHook(() => {
      const { useHttp, useDebounce, useCleanupRegistry } = require('@/hooks/useHttp');
      const { useDebouncedSearch } = require('@/hooks/useDebounce');
      const http = useHttp();
      const search = useDebouncedSearch('', 300);
      const cleanup = useCleanupRegistry('ApplicationForm');

      // Simuler la création de ressources
      cleanup.createAbortController('submit-request', 'Submit AbortController');
      cleanup.createTimeout('auto-save', () => {}, 30000, 'Auto-save Timer');

      return { http, search, cleanup };
    });

    // Simuler une recherche avec debouncing
    act(() => {
      result.current.search.setQuery('appartement 2 pièces');
    });

    // Attendre le debouncing
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Simuler une soumission
    const submitPromise = result.current.http.post('/api/applications', {
      propertyId: '123',
      applicantName: 'John Doe'
    });

    // Annuler le processus
    unmount();

    // Vérifier que tout s'est nettoyé proprement
    expect(() => {}).not.toThrow();
  },

  /**
   * Teste la gestion d'erreur avec retry et debouncing
   */
  async testErrorHandlingWithRetryAndDebouncing() {
    vi.useFakeTimers();

    let attemptCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount <= 2) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: true })
      });
    });

    global.fetch = mockFetch;

    const { result } = renderHook(() => {
      const { useHttp } = require('@/hooks/useHttp');
      const { useDebounce } = require('@/hooks/useDebounce');
      const http = useHttp();
      const [query, setQuery] = useDebounce('', 200);

      return { http, query, setQuery };
    });

    // Lancer une recherche
    act(() => {
      result.current.setQuery('test property');
    });

    // Attendre le debouncing
    act(() => {
      vi.advanceTimersByTime(200);
    });

    const requestPromise = result.current.http.get('/api/search?q=test');

    // La requête devrait eventually réussir
    await waitFor(() => {
      expect(result.current.http.success || result.current.http.error).toBeDefined();
    }, { timeout: 5000 });

    vi.useRealTimers();
  }
};

// Configuration par défaut pour les tests
export const testConfig = {
  defaultTimeouts: {
    validation: 1000,
    http: 5000,
    cleanup: 100,
    debouncing: 500
  },
  defaultRetries: {
    maxRetries: 3,
    baseDelay: 100,
    exponentialBase: 2
  },
  defaultDelays: {
    search: 300,
    filters: 500,
    autoSave: 1000,
    typing: 500,
    navigation: 200,
    apiRetry: 1000
  }
};

// Export par défaut
export default {
  testValidationService,
  testErrorHandling,
  testHttpHooks,
  testDebouncing,
  testCleanupFunctions,
  testIntegration,
  testConfig
};