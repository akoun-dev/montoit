import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';

interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  humidity?: number;
  windSpeed?: number;
  feelsLike?: number;
}

interface WeatherReturn {
  weather: WeatherData;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const FALLBACK_WEATHER: WeatherData = {
  temperature: 28,
  description: 'Ensoleillé',
  icon: 'sun',
  humidity: 75,
  windSpeed: 12
};

const CACHE_KEY = 'weather_data';
const CACHE_TIMESTAMP_KEY = 'weather_timestamp';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const AUTO_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

/**
 * Hook to fetch weather data for Abidjan with localStorage caching
 * Cache duration: 30 minutes
 * Auto-refresh: every 30 minutes
 * Falls back to default sunny weather if API fails
 */
export const useWeather = (): WeatherReturn => {
  const [weather, setWeather] = useState<WeatherData>(FALLBACK_WEATHER);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const WEATHER_ENABLED = false; // Temporarily disabled to avoid CORS errors

  const fetchWeather = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Optional opt-out (useful if the Edge Function isn't deployed yet in dev)
      if (!WEATHER_ENABLED) {
        setWeather(FALLBACK_WEATHER);
        setIsLoading(false);
        return;
      }

      // Check cache first (30 min)
      const cachedWeather = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cachedWeather && cachedTime) {
        const cacheAge = Date.now() - parseInt(cachedTime);
        if (cacheAge < CACHE_DURATION) {
          setWeather(JSON.parse(cachedWeather));
          setIsLoading(false);
          return;
        }
      }

      const { data, error: apiError } = await supabase.functions.invoke('get-weather', {
        body: { city: 'Abidjan' }
      });

      if (apiError) {
        throw new Error(`Weather API error: ${apiError.message}`);
      }

      if (data?.weather) {
        const weatherData: WeatherData = {
          ...data.weather,
          feelsLike: data.weather.feelsLike || data.weather.temperature
        };

        setWeather(weatherData);
        localStorage.setItem(CACHE_KEY, JSON.stringify(weatherData));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      } else {
        setWeather(FALLBACK_WEATHER);
      }
    } catch (err) {
      logger.warn('Weather fetch error', { error: err });
      setError(err as Error);

      // Try to use stale cache if available
      const staleWeather = localStorage.getItem(CACHE_KEY);
      if (staleWeather) {
        try {
          setWeather(JSON.parse(staleWeather));
          logger.info('Using stale weather data');
        } catch (parseError) {
          setWeather(FALLBACK_WEATHER);
        }
      } else {
        setWeather(FALLBACK_WEATHER);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 30 minutes (separate effect to avoid infinite loop)
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchWeather();
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    weather,
    isLoading,
    error,
    refresh: fetchWeather
  };
};
