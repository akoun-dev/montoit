import { useState, useCallback, useEffect } from 'react';

interface Property {
  id: string;
  title: string;
  monthly_rent: number;
  surface_area?: number;
  bedrooms?: number;
  bathrooms?: number;
  city: string;
  property_type: string;
  is_furnished?: boolean;
  has_parking?: boolean;
  has_ac?: boolean;
  deposit_amount?: number;
  charges_amount?: number;
  main_image?: string;
}

const MAX_COMPARE = 4;
const COMPARE_STORAGE_KEY = 'compare_properties';

export function useCompareProperties() {
  const [compareList, setCompareList] = useState<string[]>(() => {
    const stored = localStorage.getItem(COMPARE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  // Sauvegarder dans localStorage quand la liste change
  useEffect(() => {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareList));
  }, [compareList]);

  const addToCompare = useCallback((propertyId: string) => {
    setCompareList((prev) => {
      if (prev.includes(propertyId)) {
        return prev; // Déjà dans la liste
      }
      if (prev.length >= MAX_COMPARE) {
        return prev; // Limite atteinte
      }
      return [...prev, propertyId];
    });
  }, []);

  const removeFromCompare = useCallback((propertyId: string) => {
    setCompareList((prev) => prev.filter((id) => id !== propertyId));
  }, []);

  const toggleCompare = useCallback((propertyId: string) => {
    setCompareList((prev) => {
      if (prev.includes(propertyId)) {
        return prev.filter((id) => id !== propertyId);
      }
      if (prev.length >= MAX_COMPARE) {
        return prev; // Limite atteinte
      }
      return [...prev, propertyId];
    });
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]);
  }, []);

  const isComparing = useCallback(
    (propertyId: string) => compareList.includes(propertyId),
    [compareList]
  );

  const canAddMore = compareList.length < MAX_COMPARE;

  return {
    compareList,
    addToCompare,
    removeFromCompare,
    toggleCompare,
    clearCompare,
    isComparing,
    canAddMore,
    MAX_COMPARE,
  };
}
