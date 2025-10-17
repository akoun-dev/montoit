import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FILE_LIMITS, ERROR_MESSAGES, validateImageType, validateVideoType } from '@/constants';
import { AppError, handleError, handleSuccess } from '@/lib/errorHandler';
import { logger } from '@/services/logger';

export interface MediaFiles {
  images: File[];
  video: File | null;
  panoramas: File[];
  floorPlans: File[];
  virtualTourUrl: string;
}

export interface MediaUrls {
  images: string[];
  mainImage: string | null;
  videoUrl: string | null;
  panoramas: { url: string; title: string }[];
  floorPlans: { url: string; title: string }[];
}

/**
 * Hook for managing media uploads to Supabase Storage
 * Handles images, videos, panoramas, and floor plans
 */
export const useMediaUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  /**
   * Validate media files before upload
   */
  const validateMediaFiles = (files: MediaFiles): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // At least one image is required
    if (files.images.length === 0) {
      errors.push(ERROR_MESSAGES.FILE_REQUIRED);
    }

    // Validate image count
    if (files.images.length > FILE_LIMITS.MAX_IMAGES_PER_PROPERTY) {
      errors.push(`Maximum ${FILE_LIMITS.MAX_IMAGES_PER_PROPERTY} images autorisées`);
    }

    // Validate image sizes and types
    files.images.forEach((img, idx) => {
      if (img.size > FILE_LIMITS.MAX_IMAGE_SIZE) {
        errors.push(`Image ${idx + 1}: ${ERROR_MESSAGES.IMAGE_TOO_LARGE}`);
      }
      if (!validateImageType(img)) {
        errors.push(`Image ${idx + 1}: Format non autorisé (JPG, PNG, WEBP uniquement)`);
      }
    });

    // Validate video
    if (files.video) {
      if (files.video.size > FILE_LIMITS.MAX_VIDEO_SIZE) {
        errors.push(ERROR_MESSAGES.VIDEO_TOO_LARGE);
      }
      if (!validateVideoType(files.video)) {
        errors.push('Format vidéo non autorisé (MP4, WEBM uniquement)');
      }
    }

    // Validate panoramas
    if (files.panoramas.length > FILE_LIMITS.MAX_PANORAMAS_PER_PROPERTY) {
      errors.push(`Maximum ${FILE_LIMITS.MAX_PANORAMAS_PER_PROPERTY} panoramas autorisés`);
    }
    files.panoramas.forEach((pano, idx) => {
      if (pano.size > FILE_LIMITS.MAX_PANORAMA_SIZE) {
        errors.push(`Panorama ${idx + 1}: Taille maximale 8MB`);
      }
    });

    // Validate floor plans
    if (files.floorPlans.length > FILE_LIMITS.MAX_FLOOR_PLANS_PER_PROPERTY) {
      errors.push(`Maximum ${FILE_LIMITS.MAX_FLOOR_PLANS_PER_PROPERTY} plans autorisés`);
    }
    files.floorPlans.forEach((plan, idx) => {
      if (plan.size > FILE_LIMITS.MAX_FLOOR_PLAN_SIZE) {
        errors.push(`Plan ${idx + 1}: Taille maximale 5MB`);
      }
    });

    return { valid: errors.length === 0, errors };
  };

  /**
   * Upload a single file to a specific bucket
   */
  const uploadFile = async (
    bucket: string,
    path: string,
    file: File
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (error) {
        logger.error(`Failed to upload to ${bucket}`, { error, path });
        throw new AppError('UPLOAD_FAILED');
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      logger.error('Upload file error', { error, bucket, path });
      return null;
    }
  };

  /**
   * Upload all media for a property
   */
  const uploadMedia = async (
    propertyId: string,
    files: MediaFiles,
    existingMedia?: MediaUrls
  ): Promise<MediaUrls> => {
    setUploading(true);
    setProgress(0);

    try {
      const totalFiles = 
        files.images.length + 
        (files.video ? 1 : 0) + 
        files.panoramas.length + 
        files.floorPlans.length;
      
      let uploadedCount = 0;

      // Upload images
      const imageUrls: string[] = existingMedia?.images || [];
      for (const image of files.images) {
        const timestamp = Date.now();
        const path = `${propertyId}/${timestamp}_${image.name}`;
        const url = await uploadFile('property-images', path, image);
        if (url) imageUrls.push(url);
        uploadedCount++;
        setProgress(Math.round((uploadedCount / totalFiles) * 100));
      }

      // Upload video
      let videoUrl = existingMedia?.videoUrl || null;
      if (files.video) {
        const timestamp = Date.now();
        const path = `${propertyId}/${timestamp}_${files.video.name}`;
        const url = await uploadFile('property-videos', path, files.video);
        if (url) videoUrl = url;
        uploadedCount++;
        setProgress(Math.round((uploadedCount / totalFiles) * 100));
      }

      // Upload panoramas
      const panoramaUrls: { url: string; title: string }[] = existingMedia?.panoramas || [];
      for (const panorama of files.panoramas) {
        const timestamp = Date.now();
        const path = `${propertyId}/${timestamp}_${panorama.name}`;
        const url = await uploadFile('property-360', path, panorama);
        if (url) {
          panoramaUrls.push({
            url,
            title: panorama.name.replace(/\.[^/.]+$/, '')
          });
        }
        uploadedCount++;
        setProgress(Math.round((uploadedCount / totalFiles) * 100));
      }

      // Upload floor plans
      const floorPlanUrls: { url: string; title: string }[] = existingMedia?.floorPlans || [];
      for (const plan of files.floorPlans) {
        const timestamp = Date.now();
        const path = `${propertyId}/${timestamp}_${plan.name}`;
        const url = await uploadFile('property-plans', path, plan);
        if (url) {
          floorPlanUrls.push({
            url,
            title: plan.name.replace(/\.[^/.]+$/, '')
          });
        }
        uploadedCount++;
        setProgress(Math.round((uploadedCount / totalFiles) * 100));
      }

      handleSuccess('MEDIA_UPLOADED');

    return {
      images: imageUrls,
      mainImage: imageUrls.length > 0 ? imageUrls[0] : (existingMedia?.mainImage || null),
      videoUrl,
      panoramas: panoramaUrls,
      floorPlans: floorPlanUrls,
    };
    } catch (error) {
      handleError(error, ERROR_MESSAGES.UPLOAD_FAILED);
      throw error;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  /**
   * Delete media from storage
   */
  const deleteMedia = async (urls: MediaUrls): Promise<void> => {
    try {
      const extractPath = (url: string) => {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        return pathParts.slice(pathParts.indexOf('object') + 2).join('/');
      };

      // Delete images
      if (urls.images.length > 0) {
        const paths = urls.images.map(extractPath);
        await supabase.storage.from('property-images').remove(paths);
      }

      // Delete video
      if (urls.videoUrl) {
        const path = extractPath(urls.videoUrl);
        await supabase.storage.from('property-videos').remove([path]);
      }

      // Delete panoramas
      if (urls.panoramas.length > 0) {
        const paths = urls.panoramas.map(p => extractPath(p.url));
        await supabase.storage.from('property-360').remove(paths);
      }

      // Delete floor plans
      if (urls.floorPlans.length > 0) {
        const paths = urls.floorPlans.map(p => extractPath(p.url));
        await supabase.storage.from('property-plans').remove(paths);
      }

      logger.info('Media deleted successfully');
    } catch (error) {
      logger.error('Failed to delete media', { error });
      throw error;
    }
  };

  return {
    uploading,
    progress,
    uploadMedia,
    deleteMedia,
    validateMediaFiles,
  };
};
