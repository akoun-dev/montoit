import { useState, useCallback } from 'react';

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText?: string;
}

export interface PlaceDetails {
  latitude?: number;
  longitude?: number;
  city?: string;
  neighborhood?: string;
}

interface UsePlacesAutocompleteOptions {
  country?: string;
}

export function usePlacesAutocomplete({ country = 'ci' }: UsePlacesAutocompleteOptions = {}) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const setQuery = useCallback((query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    // Stub: pas d'implémentation réelle
    setIsLoading(false);
    setSuggestions([]);
  }, []);

  const getDetails = useCallback(async (placeId: string): Promise<PlaceDetails | null> => {
    // Stub
    return { latitude: 0, longitude: 0 };
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    setQuery,
    suggestions,
    isLoading,
    getDetails,
    clearSuggestions,
  };
}

export default usePlacesAutocomplete;
