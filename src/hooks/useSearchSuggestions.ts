import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';

export const useSearchSuggestions = (query: string) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const debounce = setTimeout(async () => {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('city, title, neighborhood')
          .or(`city.ilike.%${query}%,title.ilike.%${query}%,neighborhood.ilike.%${query}%`)
          .eq('moderation_status', 'approved')
          .limit(10);

        if (error) throw error;

        if (data) {
          const uniqueSuggestions = [
            ...new Set([
              ...data.map(p => p.city).filter(Boolean),
              ...data.map(p => p.neighborhood).filter(Boolean),
              ...data.map(p => p.title.split(' ')[0]).filter(Boolean),
            ])
          ];
          
          setSuggestions(uniqueSuggestions.slice(0, 5));
        }
      } catch (error) {
        logger.debug('Failed to fetch search suggestions', { query });
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [query]);

  return { suggestions, isLoading };
};
