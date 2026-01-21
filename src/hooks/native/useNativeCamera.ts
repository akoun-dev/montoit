import { useState, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

interface UseNativeCameraOptions {
  quality?: number;
  allowEditing?: boolean;
  resultType?: CameraResultType;
}

interface CameraResult {
  dataUrl?: string;
  webPath?: string;
  blob?: Blob;
}

export function useNativeCamera(options: UseNativeCameraOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const checkPermissions = useCallback(async () => {
    if (!isNative) return true;

    const permissions = await Camera.checkPermissions();
    if (permissions.camera === 'denied' || permissions.photos === 'denied') {
      const request = await Camera.requestPermissions();
      return request.camera === 'granted' && request.photos === 'granted';
    }
    return true;
  }, [isNative]);

  const takePhoto = useCallback(async (): Promise<CameraResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        throw new Error('Permission caméra refusée');
      }

      const photo: Photo = await Camera.getPhoto({
        quality: options.quality ?? 80,
        allowEditing: options.allowEditing ?? false,
        resultType: options.resultType ?? CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
      });

      return {
        dataUrl: photo.dataUrl,
        webPath: photo.webPath,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur caméra';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [checkPermissions, options]);

  const pickFromGallery = useCallback(async (): Promise<CameraResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        throw new Error('Permission galerie refusée');
      }

      const photo: Photo = await Camera.getPhoto({
        quality: options.quality ?? 80,
        allowEditing: options.allowEditing ?? false,
        resultType: options.resultType ?? CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      return {
        dataUrl: photo.dataUrl,
        webPath: photo.webPath,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur galerie';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [checkPermissions, options]);

  const pickMultiple = useCallback(
    async (limit = 10): Promise<CameraResult[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const hasPermission = await checkPermissions();
        if (!hasPermission) {
          throw new Error('Permission galerie refusée');
        }

        const result = await Camera.pickImages({
          quality: options.quality ?? 80,
          limit,
        });

        return result.photos.map((photo) => ({
          webPath: photo.webPath,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur sélection';
        setError(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [checkPermissions, options]
  );

  return {
    isNative,
    isLoading,
    error,
    takePhoto,
    pickFromGallery,
    pickMultiple,
    checkPermissions,
  };
}
