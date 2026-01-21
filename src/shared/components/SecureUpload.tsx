/**
 * Composant d'upload sécurisé
 *
 * Ce composant encapsule l'upload de fichiers avec validation
 * de sécurité et feedback utilisateur.
 */

import React, { useCallback, useState, useRef } from 'react';
import { Upload, X, File, AlertCircle, Shield, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  SecureUploadService,
  type SecureUploadOptions,
} from '@/shared/services/secureUpload.service';
import { useRateLimiter } from '@/shared/services/rateLimiter.service';
import { cn } from '@/shared/lib/utils';

interface SecureUploadProps {
  bucket: 'PROPERTIES' | 'DOCUMENTS' | 'AVATARS' | 'VERIFICATIONS' | 'MAINTENANCE' | 'REVIEWS';
  onUploadComplete?: (url: string, metadata?: any) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  maxSizeMB?: number;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  resourceType?: 'property' | 'contract' | 'application' | 'profile';
  resourceId?: string;
  compressImage?: boolean;
  showPreview?: boolean;
  label?: string;
  helperText?: string;
  description?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export function SecureUpload({
  bucket,
  onUploadComplete,
  onUploadError,
  accept,
  maxSizeMB = 10,
  maxFiles = 1,
  disabled = false,
  className,
  resourceType,
  resourceId,
  compressImage = false,
  showPreview = true,
  label,
  helperText,
  description,
  ...props
}: SecureUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { checkRateLimit } = useRateLimiter();

  const validateFile = useCallback(
    (file: File): string | null => {
      // Taille du fichier
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `Le fichier ne doit pas dépasser ${maxSizeMB} MB`;
      }

      // Type de fichier
      if (
        accept &&
        !accept.split(',').some((type) => {
          const [mainType] = type.trim().split('/');
          return file.type.startsWith(mainType);
        })
      ) {
        return `Type de fichier non autorisé. Formats acceptés: ${accept}`;
      }

      // Nom du fichier (vérifier les caractères suspects)
      if (/[\x00-\x1f\x80-\x9f]/.test(file.name)) {
        return 'Le nom du fichier contient des caractères non valides';
      }

      return null;
    },
    [accept, maxSizeMB]
  );

  const handleFileUpload = useCallback(
    async (fileList: FileList) => {
      if (disabled) return;

      // Vérifier le rate limit
      const rateLimitResult = await checkRateLimit('upload:file');
      if (!rateLimitResult.allowed) {
        toast.error(rateLimitResult.message || 'Téléversement limité');
        return;
      }

      // Vérifier le nombre maximum de fichiers
      if (files.length + fileList.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} fichier(s) autorisé(s)`);
        return;
      }

      const validFiles: File[] = [];
      const errors: string[] = [];

      Array.from(fileList).forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      });

      if (errors.length > 0) {
        toast.error(errors.join('\n'));
      }

      if (validFiles.length === 0) return;

      // Ajouter les fichiers à l'état avec statut 'uploading'
      const newFiles: UploadedFile[] = validFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        url: '',
        size: file.size,
        type: file.type,
        status: 'uploading',
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      // Uploader chaque fichier
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const fileState = newFiles[i];

        try {
          const result = await SecureUploadService.uploadSecure({
            bucket,
            file,
            folder: `${bucket.toLowerCase()}-${Date.now()}`,
            resourceType,
            resourceId,
            compressImage,
          });

          if (result.error) {
            throw new Error(result.error);
          }

          // Mettre à jour le statut du fichier
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileState.id ? { ...f, status: 'success', url: result.url } : f
            )
          );

          onUploadComplete?.(result.url, result.metadata);
        } catch (error: any) {
          // Mettre à jour le statut avec erreur
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileState.id ? { ...f, status: 'error', error: error.message } : f
            )
          );

          onUploadError?.(error.message);
          toast.error(`Erreur lors du téléchargement: ${error.message}`);
        }
      }
    },
    [
      disabled,
      files.length,
      maxFiles,
      bucket,
      resourceType,
      resourceId,
      compressImage,
      validateFile,
      checkRateLimit,
      onUploadComplete,
      onUploadError,
    ]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileUpload(e.target.files);
      }
    },
    [handleFileUpload]
  );

  const removeFile = useCallback(
    (fileId: string) => {
      setFiles((prev) => {
        const file = prev.find((f) => f.id === fileId);
        if (file && file.status === 'success' && file.url) {
          // Supprimer du stockage
          SecureUploadService.deleteSecure(bucket, file.url).catch(console.error);
        }
        return prev.filter((f) => f.id !== fileId);
      });
    },
    [bucket]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('w-full space-y-4', className)}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}

      {/* Zone de drop */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
          {...props}
        />

        <Upload
          className={cn('mx-auto h-12 w-12 text-gray-400 mb-4', isDragging && 'text-blue-500')}
        />

        <p className="text-gray-600 mb-2">
          {isDragging
            ? 'Lâchez les fichiers ici'
            : `Glissez-déposez les fichiers ici ou cliquez pour sélectionner`}
        </p>

        {description && <p className="text-sm text-gray-500 mb-2">{description}</p>}

        {helperText && (
          <p className="text-xs text-gray-500">
            {helperText}
            {maxSizeMB && ` • Max ${maxSizeMB} MB`}
            {maxFiles > 1 && ` • Max ${maxFiles} fichiers`}
          </p>
        )}

        {accept && <p className="text-xs text-gray-500">Formats acceptés: {accept}</p>}
      </div>

      {/* Badge de sécurité */}
      <div className="flex items-center gap-2 text-xs text-green-600">
        <Shield className="h-4 w-4" />
        <span>Upload sécurisé avec scan antivirus</span>
      </div>

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border',
                file.status === 'error' && 'border-red-200 bg-red-50',
                file.status === 'success' && 'border-green-200 bg-green-50',
                file.status === 'uploading' && 'border-blue-200 bg-blue-50'
              )}
            >
              {/* Icône de statut */}
              {file.status === 'uploading' && (
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              )}
              {file.status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {file.status === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}

              {/* Info du fichier */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                {file.status === 'error' && file.error && (
                  <p className="text-xs text-red-600 mt-1">{file.error}</p>
                )}
              </div>

              {/* Preview */}
              {showPreview &&
                file.status === 'success' &&
                file.url &&
                file.type.startsWith('image/') && (
                  <img src={file.url} alt={file.name} className="h-10 w-10 object-cover rounded" />
                )}

              {/* Bouton supprimer */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(file.id);
                }}
                disabled={file.status === 'uploading'}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Export du composant par défaut
export default SecureUpload;
