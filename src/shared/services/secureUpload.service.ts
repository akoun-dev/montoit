/**
 * Service d'upload sécurisé avec validation de propriété
 *
 * Ce service ajoute une couche de sécurité supplémentaire à l'upload de fichiers
 * en vérifiant la propriété de la ressource et les permissions utilisateur.
 */

import { supabase } from '@/services/supabase/client';
import { UploadService, STORAGE_BUCKETS } from '@/services/upload/uploadService';
import { requirePermission, requireOwnership, hasRole } from './roleValidation.service';
import { compressImage } from '@/services/upload/uploadService';

export interface SecureUploadOptions {
  bucket: keyof typeof STORAGE_BUCKETS;
  folder?: string;
  file: File;
  fileName?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  resourceType?: 'property' | 'contract' | 'application' | 'profile';
  resourceId?: string;
  compressImage?: boolean;
}

export interface SecureUploadResult {
  url: string;
  path: string;
  error?: string;
  metadata?: {
    uploaded_by: string;
    uploaded_at: string;
    resource_type?: string;
    resource_id?: string;
    file_type: string;
    file_size: number;
  };
}

/**
 * Validation avancée des fichiers avec scan de sécurité
 */
export class SecureUploadService {
  /**
   * Scan basique pour détecter les fichiers malveillants
   */
  private static async scanFile(file: File): Promise<{ clean: boolean; threat?: string }> {
    // Vérification de l'extension réelle vs le type MIME
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeToExt: Record<string, string[]> = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/webp': ['webp'],
      'application/pdf': ['pdf'],
      'text/plain': ['txt'],
      'application/msword': ['doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
    };

    const allowedExtensions = mimeToExt[file.type];
    if (allowedExtensions && (!extension || !allowedExtensions.includes(extension))) {
      return { clean: false, threat: 'Extension de fichier non correspondante au type MIME' };
    }

    // Vérification des signatures de fichiers (header bytes)
    const buffer = await file.slice(0, 10).arrayBuffer();
    const view = new Uint8Array(buffer);

    // Signatures communes de fichiers
    const signatures: Record<string, number[]> = {
      'image/jpeg': [0xff, 0xd8, 0xff],
      'image/png': [0x89, 0x50, 0x4e, 0x47],
      'image/webp': [0x52, 0x49, 0x46, 0x46],
      'application/pdf': [0x25, 0x50, 0x44, 0x46],
    };

    const signature = signatures[file.type];
    if (signature) {
      const fileSignature = Array.from(view.slice(0, signature.length));
      const isValidSignature = signature.every((byte, index) => fileSignature[index] === byte);

      if (!isValidSignature) {
        return { clean: false, threat: 'Signature de fichier invalide' };
      }
    }

    return { clean: true };
  }

  /**
   * Vérifie les permissions pour l'upload dans un bucket spécifique
   */
  private static async checkBucketPermissions(
    bucket: keyof typeof STORAGE_BUCKETS,
    resourceType?: string,
    resourceId?: string
  ): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Vérifications par bucket
    switch (bucket) {
      case 'PROPERTIES':
        await requirePermission('canCreateProperty')();
        if (resourceType && resourceId) {
          await requireOwnership('property')(resourceId);
        }
        break;

      case 'DOCUMENTS':
        // Pour les documents de vérification
        if (resourceType === 'profile' && resourceId) {
          // Un utilisateur peut uploader ses propres documents
          if (resourceId !== user.id) {
            const canVerifyUsers = await hasRole(['admin', 'trust_agent']);
            if (!canVerifyUsers) {
              throw new Error('Non autorisé à uploader des documents pour cet utilisateur');
            }
          }
        }
        break;

      case 'AVATARS':
        // Un utilisateur ne peut modifier que son propre avatar
        if (resourceType === 'profile' && resourceId && resourceId !== user.id) {
          throw new Error('Non autorisé à modifier cet avatar');
        }
        break;

      case 'VERIFICATIONS':
        // Seuls les agents de vérification et admins peuvent uploader
        await hasRole(['admin', 'trust_agent']);
        break;

      case 'MAINTENANCE':
        // Vérifier que l'utilisateur est propriétaire ou locataire du bien
        if (resourceType === 'property' && resourceId) {
          const { data: property } = await supabase
            .from('properties')
            .select('owner_id')
            .eq('id', resourceId)
            .single();

          if (!property) throw new Error('Propriété non trouvée');

          // Vérifier si l'utilisateur est propriétaire ou locataire
          const isOwner = property.owner_id === user.id;
          let isTenant = false;

          if (!isOwner) {
            const { data: contract } = await supabase
              .from('contracts')
              .select('id')
              .eq('property_id', resourceId)
              .eq('tenant_id', user.id)
              .eq('status', 'active')
              .single();

            isTenant = !!contract;
          }

          if (!isOwner && !isTenant) {
            throw new Error('Non autorisé à uploader des photos pour cette propriété');
          }
        }
        break;

      case 'REVIEWS':
        // Vérifier que l'utilisateur a une réservation confirmée
        if (resourceType === 'property' && resourceId) {
          const { data: contract } = await supabase
            .from('contracts')
            .select('id')
            .eq('property_id', resourceId)
            .eq('tenant_id', user.id)
            .in('status', ['completed', 'terminated'])
            .single();

          if (!contract) {
            throw new Error('Non autorisé à uploader des photos pour cette propriété');
          }
        }
        break;

      default:
        throw new Error('Bucket non autorisé');
    }
  }

  /**
   * Upload sécurisé avec toutes les validations
   */
  static async uploadSecure(options: SecureUploadOptions): Promise<SecureUploadResult> {
    const {
      bucket,
      folder = '',
      file,
      fileName,
      maxSizeMB = 10,
      allowedTypes = [],
      resourceType,
      resourceId,
      compressImage: shouldCompress = false,
    } = options;

    try {
      // 1. Vérification des permissions
      await this.checkBucketPermissions(bucket, resourceType, resourceId);

      // 2. Scan de sécurité du fichier
      const scan = await this.scanFile(file);
      if (!scan.clean) {
        return {
          url: '',
          path: '',
          error: `Fichier non sécurisé: ${scan.threat}`,
        };
      }

      // 3. Compression si nécessaire
      let processedFile = file;
      if (shouldCompress && file.type.startsWith('image/')) {
        processedFile = await compressImage(file, 1920, 0.8);
      }

      // 4. Validation supplémentaire pour certains types
      if (bucket === 'PROPERTIES' || bucket === 'MAINTENANCE') {
        const imageValidation = UploadService.validateImageFile(processedFile);
        if (!imageValidation.valid) {
          return {
            url: '',
            path: '',
            error: imageValidation.error,
          };
        }
      }

      if (bucket === 'DOCUMENTS' || bucket === 'VERIFICATIONS') {
        const docValidation = UploadService.validateDocumentFile(processedFile);
        if (!docValidation.valid) {
          return {
            url: '',
            path: '',
            error: docValidation.error,
          };
        }
      }

      // 5. Upload via le service standard
      const uploadResult = await UploadService.uploadFile({
        bucket: STORAGE_BUCKETS[bucket],
        folder,
        file: processedFile,
        fileName,
        maxSizeMB,
        allowedTypes,
      });

      if (uploadResult.error) {
        return uploadResult;
      }

      // 6. Enregistrement des métadonnées pour audit
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const metadata = {
        uploaded_by: user?.id || '',
        uploaded_at: new Date().toISOString(),
        resource_type: resourceType,
        resource_id: resourceId,
        file_type: processedFile.type,
        file_size: processedFile.size,
      };

      // Sauvegarder les métadonnées dans une table de suivi
      await supabase.from('file_uploads').insert({
        file_path: uploadResult.path,
        bucket: STORAGE_BUCKETS[bucket],
        ...metadata,
      });

      return {
        ...uploadResult,
        metadata,
      };
    } catch (error: any) {
      console.error('Secure upload error:', error);
      return {
        url: '',
        path: '',
        error: error.message || "Erreur lors de l'upload sécurisé",
      };
    }
  }

  /**
   * Suppression sécurisée avec vérification de permissions
   */
  static async deleteSecure(
    bucket: keyof typeof STORAGE_BUCKETS,
    path: string
  ): Promise<{ error?: string }> {
    try {
      // Vérifier que l'utilisateur a le droit de supprimer ce fichier
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      // Récupérer les métadonnées du fichier
      const { data: fileUpload } = await supabase
        .from('file_uploads')
        .select('*')
        .eq('file_path', path)
        .single();

      if (!fileUpload) {
        return { error: 'Fichier non trouvé' };
      }

      // Vérifier si l'utilisateur est le propriétaire ou un admin
      const isAdmin = await hasRole(['admin']);
      if (!isAdmin && fileUpload.uploaded_by !== user.id) {
        return { error: 'Non autorisé à supprimer ce fichier' };
      }

      // Supprimer le fichier
      const deleteResult = await UploadService.deleteFile(STORAGE_BUCKETS[bucket], path);

      if (!deleteResult.error) {
        // Supprimer les métadonnées
        await supabase.from('file_uploads').delete().eq('file_path', path);
      }

      return deleteResult;
    } catch (error: any) {
      return { error: error.message || 'Erreur lors de la suppression' };
    }
  }

  /**
   * Génère une URL signée temporaire pour un fichier
   */
  static async getSignedUrl(
    bucket: keyof typeof STORAGE_BUCKETS,
    path: string,
    expiresIn = 60
  ): Promise<{ url?: string; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS[bucket])
        .createSignedUrl(path, expiresIn);

      if (error) throw error;

      return { url: data.signedUrl };
    } catch (error: any) {
      return { error: error.message };
    }
  }
}
