import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CityCount {
  city: string;
  count: number;
}

interface UseAvailableCitiesResult {
  cities: CityCount[];
  propertyTypes: { type: string; count: number }[];
  loading: boolean;
}

/**
 * Hook pour récupérer les villes et types de propriétés disponibles avec compteurs
 */
export function useAvailableCities(): UseAvailableCitiesResult {
  const [cities, setCities] = useState<CityCount[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<{ type: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);

      try {
        // Récupérer toutes les propriétés disponibles
        const { data, error } = await supabase
          .from('properties')
          .select('city, property_type')
          .eq('status', 'disponible');

        if (error) throw error;

        // Compter par ville
        const cityMap = new Map<string, number>();
        const typeMap = new Map<string, number>();

        data?.forEach((p) => {
          if (p.city) {
            cityMap.set(p.city, (cityMap.get(p.city) || 0) + 1);
          }
          if (p.property_type) {
            typeMap.set(p.property_type, (typeMap.get(p.property_type) || 0) + 1);
          }
        });

        // Convertir en tableaux triés
        const citiesArray = Array.from(cityMap.entries())
          .map(([city, count]) => ({ city, count }))
          .sort((a, b) => b.count - a.count);

        const typesArray = Array.from(typeMap.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count);

        setCities(citiesArray);
        setPropertyTypes(typesArray);
      } catch (err) {
        console.error('Error fetching available cities:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  return { cities, propertyTypes, loading };
}
