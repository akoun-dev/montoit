import { useState, useCallback, useEffect } from 'react';
import { Geolocation, Position, PermissionStatus } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
}

interface UseNativeGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

export function useNativeGeolocation(options: UseNativeGeolocationOptions = {}) {
  const [position, setPosition] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const status: PermissionStatus = await Geolocation.checkPermissions();

      if (status.location === 'denied') {
        const request = await Geolocation.requestPermissions();
        return request.location === 'granted';
      }

      return status.location === 'granted' || status.location === 'prompt';
    } catch {
      return false;
    }
  }, []);

  const getCurrentPosition = useCallback(async (): Promise<GeolocationState | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        throw new Error('Permission localisation refusée');
      }

      const pos: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 10000,
        maximumAge: options.maximumAge ?? 0,
      });

      const newPosition: GeolocationState = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      };

      setPosition(newPosition);
      return newPosition;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur localisation';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [checkPermissions, options]);

  const startWatching = useCallback(async () => {
    if (watchId) return;

    try {
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        throw new Error('Permission localisation refusée');
      }

      const id = await Geolocation.watchPosition(
        {
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: options.timeout ?? 10000,
          maximumAge: options.maximumAge ?? 0,
        },
        (pos, err) => {
          if (err) {
            setError(err.message);
            return;
          }

          if (pos) {
            setPosition({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: pos.timestamp,
            });
          }
        }
      );

      setWatchId(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur suivi position';
      setError(message);
    }
  }, [watchId, checkPermissions, options]);

  const stopWatching = useCallback(async () => {
    if (watchId) {
      await Geolocation.clearWatch({ id: watchId });
      setWatchId(null);
    }
  }, [watchId]);

  // Calculate distance between two points in km
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  }, [watchId]);

  return {
    isNative,
    position,
    isLoading,
    error,
    getCurrentPosition,
    startWatching,
    stopWatching,
    isWatching: !!watchId,
    calculateDistance,
    checkPermissions,
  };
}
