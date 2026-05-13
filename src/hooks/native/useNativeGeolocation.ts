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

// Helper function for web geolocation (fallback)
const getWebGeolocation = (): Promise<GeolocationState | null> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Géolocalisation non supportée'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        reject(new Error(err.message || 'Erreur de géolocalisation'));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

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
      if (isNative) {
        const status: PermissionStatus = await Geolocation.checkPermissions();

        if (status.location === 'denied') {
          const request = await Geolocation.requestPermissions();
          return request.location === 'granted';
        }

        return status.location === 'granted' || status.location === 'prompt';
      } else {
        // Web: check if permission is already granted or prompt
        return new Promise<boolean>((resolve) => {
          if (!navigator.geolocation) {
            resolve(false);
            return;
          }

          navigator.permissions.query({ name: 'geolocation' }).then((result) => {
            resolve(result.state === 'granted' || result.state === 'prompt');
          }).catch(() => resolve(false));
        });
      }
    } catch {
      return false;
    }
  }, [isNative]);

  const getCurrentPosition = useCallback(async (): Promise<GeolocationState | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        throw new Error('Permission localisation refusée');
      }

      let result: GeolocationState | null = null;

      if (isNative) {
        const pos: Position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: options.timeout ?? 10000,
          maximumAge: options.maximumAge ?? 0,
        });

        result = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
      } else {
        // Web fallback
        result = await getWebGeolocation();
      }

      if (result) {
        setPosition(result);
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur localisation';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [checkPermissions, options, isNative]);

  const startWatching = useCallback(async () => {
    if (watchId) return;

    try {
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        throw new Error('Permission localisation refusée');
      }

      if (isNative) {
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
      } else {
        // Web fallback
        if (!navigator.geolocation) {
          throw new Error('Géolocalisation non supportée');
        }

        const id = navigator.geolocation.watchPosition(
          (pos) => {
            setPosition({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: pos.timestamp,
            });
            setError(null); // Clear error on success
          },
          (err) => {
            setError(err.message || 'Erreur de localisation');
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );

        setWatchId(id.toString());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur suivi position';
      setError(message);
    }
  }, [watchId, checkPermissions, options, isNative]);

  const stopWatching = useCallback(async () => {
    if (watchId) {
      if (isNative) {
        await Geolocation.clearWatch({ id: watchId });
      } else if (navigator.geolocation) {
        navigator.geolocation.clearWatch(Number(watchId));
      }
      setWatchId(null);
    }
  }, [watchId, isNative]);

  // Calculate distance between two points in km
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId) {
        if (isNative) {
          Geolocation.clearWatch({ id: watchId });
        } else if (navigator.geolocation) {
          navigator.geolocation.clearWatch(Number(watchId));
        }
      }
    };
  }, [watchId, isNative]);

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
