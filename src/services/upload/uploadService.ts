import { supabase } from '@/services/supabase/client';

export interface UploadOptions {
  bucket: string;
  folder?: string;
  file: File;
  fileName?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

export class UploadService {
  static async uploadFile(options: UploadOptions): Promise<UploadResult> {
    const { bucket, folder = '', file, fileName, maxSizeMB = 10, allowedTypes = [] } = options;

    try {
      if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
        return {
          url: '',
          path: '',
          error: `Le fichier ne doit pas dépasser ${maxSizeMB} MB`,
        };
      }

      if (allowedTypes.length > 0) {
        const fileType = file.type;
        if (!allowedTypes.some((type) => fileType.includes(type))) {
          return {
            url: '',
            path: '',
            error: `Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(', ')}`,
          };
        }
      }

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExt = file.name.split('.').pop();
      const finalFileName = fileName || `${timestamp}_${randomString}.${fileExt}`;
      const filePath = folder ? `${folder}/${finalFileName}` : finalFileName;

      const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        console.error('Upload error:', error);
        return {
          url: '',
          path: '',
          error: 'Erreur lors du téléchargement du fichier',
        };
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(data.path);

      return {
        url: publicUrl,
        path: data.path,
        error: undefined,
      };
    } catch (err: any) {
      console.error('Upload exception:', err);
      return {
        url: '',
        path: '',
        error: err.message || 'Erreur inattendue',
      };
    }
  }

  static async uploadMultiple(
    files: File[],
    options: Omit<UploadOptions, 'file'>
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadFile({ ...options, file }));
    return Promise.all(uploadPromises);
  }

  static async deleteFile(bucket: string, path: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);

      if (error) {
        console.error('Delete error:', error);
        return { error: 'Erreur lors de la suppression du fichier' };
      }

      return {};
    } catch (err: any) {
      console.error('Delete exception:', err);
      return { error: err.message || 'Erreur inattendue' };
    }
  }

  static async replaceFile(
    bucket: string,
    oldPath: string,
    newFile: File,
    options: Omit<UploadOptions, 'bucket' | 'file'>
  ): Promise<UploadResult> {
    await this.deleteFile(bucket, oldPath);

    return this.uploadFile({
      bucket,
      file: newFile,
      ...options,
    });
  }

  static getFileUrl(bucket: string, path: string): string {
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  }

  static validateImageFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Seuls les fichiers JPEG, PNG et WebP sont autorisés',
      };
    }

    if (file.size > 5 * 1024 * 1024) {
      return {
        valid: false,
        error: "L'image ne doit pas dépasser 5 MB",
      };
    }

    return { valid: true };
  }

  static validateDocumentFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Seuls les fichiers PDF, JPEG et PNG sont autorisés',
      };
    }

    if (file.size > 10 * 1024 * 1024) {
      return {
        valid: false,
        error: 'Le document ne doit pas dépasser 10 MB',
      };
    }

    return { valid: true };
  }

  static async compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Compression failed'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  }
}

export const STORAGE_BUCKETS = {
  PROPERTIES: 'property-images',
  DOCUMENTS: 'documents',
  AVATARS: 'avatars',
  VERIFICATIONS: 'verifications',
  MAINTENANCE: 'maintenance-photos',
  REVIEWS: 'review-photos',
} as const;
