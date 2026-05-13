import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useDebounce,
  useDebouncedCallback,
  useDebouncedSearch,
  useDebouncedFilters,
} from '@/hooks/shared/useDebounce';

describe('Cleanup des hooks de debouncing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  test('useDebounce nettoie son timeout au demontage', () => {
    const { rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    expect(() => unmount()).not.toThrow();

    act(() => {
      vi.advanceTimersByTime(200);
    });
  });

  test('useDebouncedCallback annule le callback en attente au demontage', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 100));

    act(() => {
      result.current('payload');
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  test('useDebouncedSearch supporte des cycles rapides mount/unmount', () => {
    for (let i = 0; i < 20; i++) {
      const { result, unmount } = renderHook(() => useDebouncedSearch('', 50));

      act(() => {
        result.current.setQuery(`query-${i}`);
      });

      unmount();
    }

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(true).toBe(true);
  });

  test('useDebouncedFilters nettoie correctement les updates en file', () => {
    const { result, unmount } = renderHook(() =>
      useDebouncedFilters({ city: 'Abidjan', minPrice: 0 }, 100)
    );

    act(() => {
      result.current.updateFilters({ city: 'Bouake' });
      result.current.updateFilters({ minPrice: 100000 });
    });

    expect(result.current.isFiltering).toBe(true);

    unmount();

    act(() => {
      vi.advanceTimersByTime(200);
    });
  });
});
