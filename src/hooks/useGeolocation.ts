import { useState, useEffect, useCallback } from 'react';

interface GeolocationData {
  city: string;
  neighborhood?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface GeolocationReturn {
  location: GeolocationData;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const ABIDJAN_NEIGHBORHOODS = [
  { name: 'Cocody', lat: 5.3599, lng: -3.9889, bounds: { latMin: 5.32, latMax: 5.40, lngMin: -4.02, lngMax: -3.95 } },
  { name: 'Plateau', lat: 5.3244, lng: -4.0125, bounds: { latMin: 5.31, latMax: 5.34, lngMin: -4.03, lngMax: -4.00 } },
  { name: 'Marcory', lat: 5.2869, lng: -3.9967, bounds: { latMin: 5.27, latMax: 5.31, lngMin: -4.01, lngMax: -3.98 } },
  { name: 'Yopougon', lat: 5.3456, lng: -4.0889, bounds: { latMin: 5.30, latMax: 5.39, lngMin: -4.15, lngMax: -4.05 } },
  { name: 'Abobo', lat: 5.4167, lng: -4.0167, bounds: { latMin: 5.38, latMax: 5.45, lngMin: -4.05, lngMax: -3.98 } },
  { name: 'Adjamé', lat: 5.3500, lng: -4.0333, bounds: { latMin: 5.33, latMax: 5.37, lngMin: -4.05, lngMax: -4.01 } },
  { name: 'Treichville', lat: 5.2889, lng: -4.0089, bounds: { latMin: 5.27, latMax: 5.31, lngMin: -4.03, lngMax: -4.00 } },
  { name: 'Koumassi', lat: 5.3000, lng: -3.9500, bounds: { latMin: 5.28, latMax: 5.32, lngMin: -3.97, lngMax: -3.93 } },
  { name: 'Port-Bouët', lat: 5.2500, lng: -3.9333, bounds: { latMin: 5.23, latMax: 5.27, lngMin: -3.96, lngMax: -3.91 } },
  { name: 'Attécoubé', lat: 5.3333, lng: -4.0500, bounds: { latMin: 5.31, latMax: 5.36, lngMin: -4.08, lngMax: -4.03 } }
];

const CACHE_KEY = 'user_location';
const CACHE_TIMESTAMP_KEY = 'user_location_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const detectNeighborhood = (lat: number, lng: number): string | undefined => {
  for (const neighborhood of ABIDJAN_NEIGHBORHOODS) {
    if (
      lat >= neighborhood.bounds.latMin &&
      lat <= neighborhood.bounds.latMax &&
      lng >= neighborhood.bounds.lngMin &&
      lng <= neighborhood.bounds.lngMax
    ) {
      return neighborhood.name;
    }
  }
  return undefined;
};

export const useGeolocation = (): GeolocationReturn => {
  const [location, setLocation] = useState<GeolocationData>({
    city: 'Abidjan',
    country: 'Côte d\'Ivoire',
    neighborhood: undefined
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check cache first (5 min)
      const cachedLocation = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedLocation && cachedTime) {
        const cacheAge = Date.now() - parseInt(cachedTime);
        if (cacheAge < CACHE_DURATION) {
          setLocation(JSON.parse(cachedLocation));
          setIsLoading(false);
          return;
        }
      }

      if ('geolocation' in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: CACHE_DURATION
          });
        });

        const { latitude, longitude } = position.coords;
        const neighborhood = detectNeighborhood(latitude, longitude);
        
        const locationData: GeolocationData = {
          city: 'Abidjan',
          country: 'Côte d\'Ivoire',
          neighborhood,
          latitude,
          longitude
        };
        
        setLocation(locationData);
        localStorage.setItem(CACHE_KEY, JSON.stringify(locationData));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      } else {
        setLocation({ 
          city: 'Abidjan',
          country: 'Côte d\'Ivoire'
        });
      }
    } catch (err) {
      setError(err as Error);
      setLocation({ 
        city: 'Abidjan',
        country: 'Côte d\'Ivoire'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Execute once on mount to avoid infinite loop

  return {
    location,
    isLoading,
    error,
    refresh: fetchLocation
  };
};
