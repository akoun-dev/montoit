import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ValidationService } from '@/services/validation/validationService';
import {
  handleError,
  withErrorHandling,
  isAuthError,
} from '@/shared/services/errorHandling.service';
import {
  useDebounce,
  useDebouncedSearch,
  useDebouncedFilters,
  useDebouncedAutoSave,
  DEBOUNCE_DELAYS,
} from '@/hooks/shared/useDebounce';

describe('ValidationService', () => {
  test('valide correctement les emails', () => {
    expect(ValidationService.validateEmail('invalid-email')).toEqual({
      isValid: false,
      error: "Format d'email invalide",
    });

    expect(ValidationService.validateEmail('john.doe@example.com')).toEqual({
      isValid: true,
    });
  });

  test('valide correctement les numeros ivoiriens', () => {
    expect(ValidationService.validateCIPhoneNumber('0701234567').isValid).toBe(true);
    expect(ValidationService.validatePhone('+2250701234567').isValid).toBe(true);
    expect(ValidationService.validateCIPhoneNumber('123').isValid).toBe(false);
  });

  test('rejette les valeurs numeriques negatives', () => {
    expect(ValidationService.validatePositiveNumber(-10, 'Loyer')).toEqual({
      isValid: false,
      error: 'Loyer doit être un nombre positif',
    });
  });
});

describe('Error handling', () => {
  test("mappe les erreurs d'authentification vers un message utilisateur", () => {
    const result = handleError({ code: 'PGRST301', message: 'JWT expired' }, 'connexion');

    expect(result.isAuthError).toBe(true);
    expect(result.userMessage).toContain('session');
    expect(isAuthError({ code: 'PGRST301', message: 'JWT expired' })).toBe(true);
  });

  test('withErrorHandling relance une erreur enrichie', async () => {
    await expect(
      withErrorHandling(
        async () => {
          throw { code: '23514', message: 'constraint failed' };
        },
        'la creation du dossier'
      )
    ).rejects.toThrow(/Données invalides|Donnees invalides/);
  });
});

describe('Debounce hooks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('useDebounce retarde la mise a jour de la valeur', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated' });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('updated');
  });

  test('useDebouncedSearch expose un etat de recherche pendant le delai', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 100));

    act(() => {
      result.current.setQuery('abidjan');
    });

    expect(result.current.query).toBe('abidjan');
    expect(result.current.isSearching).toBe(true);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.debouncedSearchQuery).toBe('abidjan');
    expect(result.current.isSearching).toBe(false);
  });

  test('useDebouncedFilters debouncent les mises a jour', () => {
    const { result } = renderHook(() =>
      useDebouncedFilters({ type: 'apartment', minPrice: 0 }, 100)
    );

    act(() => {
      result.current.updateFilters({ type: 'house' });
    });

    expect(result.current.filters.type).toBe('house');
    expect(result.current.debouncedFilters.type).toBe('apartment');
    expect(result.current.isFiltering).toBe(true);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.debouncedFilters.type).toBe('house');
    expect(result.current.isFiltering).toBe(false);
  });

  test('useDebouncedAutoSave sauvegarde les donnees debouncees', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDebouncedAutoSave({ name: '', email: '' }, 100));

    act(() => {
      result.current.updateData({ name: 'John' });
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    await act(async () => {
      await result.current.saveData(onSave);
    });

    expect(onSave).toHaveBeenCalledWith({ name: 'John', email: '' });
    expect(result.current.isSaving).toBe(false);
  });

  test('exporte les delais recommandes attendus', () => {
    expect(DEBOUNCE_DELAYS).toEqual({
      SEARCH: 300,
      FILTERS: 500,
      AUTOSAVE: 1000,
      TYPING: 500,
      NAVIGATION: 200,
      API_RETRY: 1000,
    });
  });
});
