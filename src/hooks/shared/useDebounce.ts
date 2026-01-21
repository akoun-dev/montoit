import { useEffect, useState } from 'react';

/**
 * Hook useDebounce générique pour retarder l'exécution d'une valeur
 * @param value - La valeur à débouncer
 * @param delay - Le délai en millisecondes
 * @returns La valeur débouncée
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Mettre à jour la valeur débouncée après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoyer le timeout si la valeur change avant que le délai ne soit écoulé
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook pour débouncer une fonction asynchrone
 * @param callback - La fonction à débouncer
 * @param delay - Le délai en millisecondes
 * @returns Une fonction débouncée
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const debouncedCallback = ((...args: Parameters<T>) => {
    // Annuler le timer précédent s'il existe
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Créer un nouveau timer
    const newTimer = setTimeout(() => {
      callback(...args);
    }, delay);

    setDebounceTimer(newTimer);
  }) as T;

  // Nettoyer le timer lors du démontage du composant
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return debouncedCallback;
}

/**
 * Hook spécialisé pour les requêtes de recherche avec debouncing
 * @param initialQuery - La requête initiale
 * @param delay - Le délai en millisecondes (défaut: 300ms pour la recherche)
 * @returns Un objet avec la requête débouncée et une fonction de recherche
 */
export function useDebouncedSearch(initialQuery: string = '', delay: number = 300) {
  const [query, setQuery] = useState(initialQuery);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const debouncedSearchQuery = useDebounce(searchQuery, delay);

  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  return {
    query,
    debouncedSearchQuery,
    setQuery,
    isSearching: query !== debouncedSearchQuery,
  };
}

/**
 * Hook pour débouncer les filtres de recherche avec debouncing
 * @param initialFilters - Les filtres initiaux
 * @param delay - Le délai en millisecondes (défaut: 500ms pour les filtres)
 * @returns Un objet avec les filtres débouncés et les fonctions de mise à jour
 */
export function useDebouncedFilters<T extends Record<string, any>>(
  initialFilters: T,
  delay: number = 500
) {
  const [filters, setFilters] = useState<T>(initialFilters);
  const [debouncedFilters, setDebouncedFilters] = useState<T>(initialFilters);
  const debouncedFiltersValue = useDebounce(filters, delay);

  useEffect(() => {
    setDebouncedFilters(debouncedFiltersValue);
  }, [debouncedFiltersValue]);

  const updateFilters = (newFilters: Partial<T>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  return {
    filters,
    debouncedFilters,
    updateFilters,
    resetFilters,
    isFiltering: filters !== debouncedFilters,
  };
}

/**
 * Hook pour débouncer les auto-saves de formulaires
 * @param initialData - Les données initiales du formulaire
 * @param delay - Le délai en millisecondes (défaut: 1000ms pour l'auto-save)
 * @returns Un objet avec les données débouncées et les fonctions de gestion
 */
export function useDebouncedAutoSave<T extends Record<string, any>>(
  initialData: T,
  delay: number = 1000
) {
  const [data, setData] = useState<T>(initialData);
  const [debouncedData, setDebouncedData] = useState<T>(initialData);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const debouncedDataValue = useDebounce(data, delay);

  useEffect(() => {
    setDebouncedData(debouncedDataValue);
    if (debouncedDataValue !== initialData) {
      setIsDirty(true);
    }
  }, [debouncedDataValue, initialData]);

  const updateData = (newData: Partial<T>) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const saveData = async (callback: (data: T) => Promise<void>) => {
    if (isDirty) {
      setIsSaving(true);
      try {
        await callback(debouncedData);
        setIsDirty(false);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const resetData = () => {
    setData(initialData);
    setIsDirty(false);
  };

  return {
    data,
    debouncedData,
    isDirty,
    isSaving,
    updateData,
    saveData,
    resetData,
  };
}

/**
 * Configuration des délais de debouncing recommandés pour MonToit
 */
export const DEBOUNCE_DELAYS = {
  SEARCH: 300, // Recherche de propriétés
  FILTERS: 500, // Filtres de recherche avancés
  AUTOSAVE: 1000, // Auto-save de formulaires
  TYPING: 500, // Pendant la saisie de texte
  NAVIGATION: 200, // Navigation entre pages
  API_RETRY: 1000, // Retry d'API
} as const;

/**
 * Types pour les différents délais de debouncing
 */
export type DebounceDelay = (typeof DEBOUNCE_DELAYS)[keyof typeof DEBOUNCE_DELAYS];
