/**
 * Mobile Camera Service for Mon Toit Real Estate App
 *
 * This file provides camera functionality for property photos, videos,
 * and document scanning for the real estate application.
 */

import { Capacitor } from '@capacitor/core';
import { Camera, CameraSource, CameraResultType, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';

export interface CameraOptions {
  quality?: number;
  allowEditing?: boolean;
  resultType?: CameraResultType;
  source?: CameraSource;
  saveToGallery?: boolean;
  correctOrientation?: boolean;
  width?: number;
  height?: number;
  promptLabelHeader?: string;
  promptLabelCancel?: string;
  promptLabelPhoto?: string;
  promptLabelPicture?: string;
}

export interface PropertyPhoto {
  id: string;
  url: string;
  webviewPath?: string;
  fileName: string;
  fileSize: number;
  createdAt: Date;
  type: 'photo' | 'video' | 'document';
  metadata?: {
    width?: number;
    height?: number;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
}

export class MobileCameraService {
  private static instance: MobileCameraService;
  private photos: PropertyPhoto[] = [];

  private constructor() {}

  static getInstance(): MobileCameraService {
    if (!MobileCameraService.instance) {
      MobileCameraService.instance = new MobileCameraService();
    }
    return MobileCameraService.instance;
  }

  /**
   * Take a photo for property listing
   */
  async takePropertyPhoto(options?: Partial<CameraOptions>): Promise<PropertyPhoto> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Camera is only available on native platforms');
    }

    try {
      // Trigger haptic feedback
      await Haptics.impact({ style: ImpactStyle.Light });

      const cameraOptions: CameraOptions = {
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: true,
        correctOrientation: true,
        width: 1920,
        height: 1080,
        promptLabelHeader: 'Photo du bien immobilier',
        promptLabelPhoto: 'Depuis la galerie',
        promptLabelPicture: 'Prendre une photo',
        promptLabelCancel: 'Annuler',
        ...options,
      };

      const photo = await Camera.getPhoto(cameraOptions);

      // Process the photo
      const propertyPhoto = await this.processPhoto(photo, 'photo');

      // Add to photos array
      this.photos.push(propertyPhoto);

      // Trigger success haptic feedback
      await Haptics.notification({ type: 'success' });

      return propertyPhoto;
    } catch (error) {
      console.error('Error taking property photo:', error);
      throw new Error('Impossible de prendre la photo: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  }

  /**
   * Select photo from gallery
   */
  async selectFromGallery(options?: Partial<CameraOptions>): Promise<PropertyPhoto> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Gallery access is only available on native platforms');
    }

    try {
      const cameraOptions: CameraOptions = {
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        saveToGallery: false,
        correctOrientation: true,
        width: 1920,
        height: 1080,
        promptLabelHeader: 'Sélectionner une photo',
        promptLabelPhoto: 'Galerie',
        promptLabelCancel: 'Annuler',
        ...options,
      };

      const photo = await Camera.getPhoto(cameraOptions);
      const propertyPhoto = await this.processPhoto(photo, 'photo');

      this.photos.push(propertyPhoto);

      // Trigger haptic feedback
      await Haptics.impact({ style: ImpactStyle.Medium });

      return propertyPhoto;
    } catch (error) {
      console.error('Error selecting photo from gallery:', error);
      throw new Error('Impossible de sélectionner la photo: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  }

  /**
   * Scan document (PDF, contract, etc.)
   */
  async scanDocument(): Promise<PropertyPhoto> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Document scanning is only available on native platforms');
    }

    try {
      const cameraOptions: CameraOptions = {
        quality: 100,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
        promptLabelHeader: 'Scanner un document',
        promptLabelPicture: 'Scanner le document',
        promptLabelCancel: 'Annuler',
      };

      const photo = await Camera.getPhoto(cameraOptions);
      const documentPhoto = await this.processPhoto(photo, 'document');

      this.photos.push(documentPhoto);

      // Trigger haptic feedback
      await Haptics.impact({ style: ImpactStyle.Heavy });

      return documentPhoto;
    } catch (error) {
      console.error('Error scanning document:', error);
      throw new Error('Impossible de scanner le document: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  }

  /**
   * Take video (if supported)
   */
  async takeVideo(): Promise<PropertyPhoto> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Video recording is only available on native platforms');
    }

    try {
      // For now, use camera with video-specific options
      const cameraOptions: CameraOptions = {
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: true,
        correctOrientation: true,
        promptLabelHeader: 'Enregistrer une vidéo',
        promptLabelPicture: 'Commencer l\'enregistrement',
        promptLabelCancel: 'Annuler',
      };

      const photo = await Camera.getPhoto(cameraOptions);
      const videoPhoto = await this.processPhoto(photo, 'video');

      this.photos.push(videoPhoto);

      // Trigger haptic feedback
      await Haptics.notification({ type: 'success' });

      return videoPhoto;
    } catch (error) {
      console.error('Error recording video:', error);
      throw new Error('Impossible d\'enregistrer la vidéo: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  }

  /**
   * Process captured photo
   */
  private async processPhoto(photo: Photo, type: 'photo' | 'video' | 'document'): Promise<PropertyPhoto> {
    // Generate unique ID
    const id = this.generateId();
    const fileName = `${type}_${id}_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`;

    // Get file size (approximate)
    const fileSize = await this.getFileSize(photo.path || '');

    // Create property photo object
    const propertyPhoto: PropertyPhoto = {
      id,
      url: photo.webPath || photo.path || '',
      webviewPath: photo.webPath,
      fileName,
      fileSize,
      createdAt: new Date(),
      type,
      metadata: {
        width: photo.width,
        height: photo.height,
      },
    };

    return propertyPhoto;
  }

  /**
   * Get approximate file size
   */
  private async getFileSize(path: string): Promise<number> {
    try {
      if (!path) return 0;

      // This is a simplified approach - in a real app, you'd want to
      // get actual file size from the filesystem
      const stat = await Filesystem.stat({
        path,
        directory: Directory.Documents,
      });

      return stat.size || 0;
    } catch (error) {
      console.warn('Could not get file size:', error);
      // Return approximate size based on typical photo dimensions
      return 2 * 1024 * 1024; // 2MB approximate
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Get all photos
   */
  getPhotos(): PropertyPhoto[] {
    return [...this.photos];
  }

  /**
   * Get photos by type
   */
  getPhotosByType(type: 'photo' | 'video' | 'document'): PropertyPhoto[] {
    return this.photos.filter(photo => photo.type === type);
  }

  /**
   * Delete photo
   */
  async deletePhoto(photoId: string): Promise<boolean> {
    try {
      const photoIndex = this.photos.findIndex(p => p.id === photoId);
      if (photoIndex === -1) {
        return false;
      }

      const photo = this.photos[photoIndex];

      // Delete from filesystem if needed
      if (photo.fileName) {
        try {
          await Filesystem.deleteFile({
            path: photo.fileName,
            directory: Directory.Documents,
          });
        } catch (error) {
          console.warn('Could not delete file from filesystem:', error);
        }
      }

      // Remove from array
      this.photos.splice(photoIndex, 1);

      // Trigger haptic feedback
      await Haptics.impact({ style: ImpactStyle.Medium });

      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  }

  /**
   * Share photo
   */
  async sharePhoto(photoId: string): Promise<boolean> {
    try {
      const photo = this.photos.find(p => p.id === photoId);
      if (!photo) {
        return false;
      }

      await Share.share({
        title: `Photo du bien immobilier - ${photo.fileName}`,
        text: 'Découvrez ce bien immobilier sur Mon Toit',
        url: photo.url,
      });

      // Trigger haptic feedback
      await Haptics.notification({ type: 'success' });

      return true;
    } catch (error) {
      console.error('Error sharing photo:', error);
      return false;
    }
  }

  /**
   * Clear all photos
   */
  async clearAllPhotos(): Promise<void> {
    this.photos = [];
    await Haptics.impact({ style: ImpactStyle.Heavy });
  }

  /**
   * Check camera permissions
   */
  async checkCameraPermissions(): Promise<boolean> {
    try {
      const permission = await Camera.checkPermissions();
      return permission.camera === 'granted' && permission.photos === 'granted';
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      return false;
    }
  }

  /**
   * Request camera permissions
   */
  async requestCameraPermissions(): Promise<boolean> {
    try {
      const permission = await Camera.requestPermissions();
      return permission.camera === 'granted' && permission.photos === 'granted';
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  }
}

/**
 * React hook for camera functionality
 */
export function useMobileCamera() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [photos, setPhotos] = React.useState<PropertyPhoto[]>([]);
  const [hasPermission, setHasPermission] = React.useState(false);

  const cameraService = MobileCameraService.getInstance();

  React.useEffect(() => {
    initializeCamera();
  }, []);

  const initializeCamera = async () => {
    if (Capacitor.isNativePlatform()) {
      const permission = await cameraService.checkCameraPermissions();
      setHasPermission(permission);

      if (!permission) {
        await cameraService.requestCameraPermissions();
        const newPermission = await cameraService.checkCameraPermissions();
        setHasPermission(newPermission);
      }
    }

    setPhotos(cameraService.getPhotos());
  };

  const takePhoto = async (options?: Partial<CameraOptions>) => {
    setIsLoading(true);
    try {
      const photo = await cameraService.takePropertyPhoto(options);
      setPhotos(cameraService.getPhotos());
      return photo;
    } finally {
      setIsLoading(false);
    }
  };

  const selectFromGallery = async (options?: Partial<CameraOptions>) => {
    setIsLoading(true);
    try {
      const photo = await cameraService.selectFromGallery(options);
      setPhotos(cameraService.getPhotos());
      return photo;
    } finally {
      setIsLoading(false);
    }
  };

  const scanDocument = async () => {
    setIsLoading(true);
    try {
      const document = await cameraService.scanDocument();
      setPhotos(cameraService.getPhotos());
      return document;
    } finally {
      setIsLoading(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    const success = await cameraService.deletePhoto(photoId);
    if (success) {
      setPhotos(cameraService.getPhotos());
    }
    return success;
  };

  const sharePhoto = async (photoId: string) => {
    return await cameraService.sharePhoto(photoId);
  };

  const clearPhotos = async () => {
    await cameraService.clearAllPhotos();
    setPhotos([]);
  };

  return {
    isLoading,
    photos,
    hasPermission,
    takePhoto,
    selectFromGallery,
    scanDocument,
    deletePhoto,
    sharePhoto,
    clearPhotos,
    getPhotosByType: cameraService.getPhotosByType.bind(cameraService),
    requestPermissions: cameraService.requestCameraPermissions.bind(cameraService),
  };
}