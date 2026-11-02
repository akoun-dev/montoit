/**
 * Composant pour l'upload de documents de verification
 *
 * Affiche une carte pour uploader un type de document spécifique.
 */

import { useRef, useState, ChangeEvent } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import type { DocumentVerificationStatus } from '@/features/verification/services/verificationApplications.service';

export interface DocumentUploadCardProps {
  documentType: string;
  documentLabel: string;
  documentDescription?: string;
  required?: boolean;
  existingUrl?: string;
  fileName?: string;
  fileSize?: number;
  status?: DocumentVerificationStatus;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  accept?: string;
  maxSize?: number; // in bytes
  uploading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function DocumentUploadCard({
  documentType,
  documentLabel,
  documentDescription,
  required = false,
  existingUrl,
  fileName,
  fileSize,
  status = 'pending',
  onUpload,
  onDelete,
  accept = 'application/pdf,image/*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  uploading = false,
  disabled = false,
  icon,
}: DocumentUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localUploading, setLocalUploading] = useState(false);

  const isUploading = uploading || localUploading;
  const hasFile = !!existingUrl;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation de la taille
    if (maxSize && file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
      toast.error(`Le fichier ne doit pas dépasser ${maxSizeMB}Mo`);
      return;
    }

    try {
      setLocalUploading(true);
      await onUpload(file);
      toast.success('Document uploadé avec succès');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erreur lors de l\'upload du document');
    } finally {
      setLocalUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      await onDelete();
      toast.success('Document supprimé');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDownload = () => {
    if (existingUrl) {
      window.open(existingUrl, '_blank');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Octets';
    const k = 1024;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'verified':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          label: 'Vérifié',
        };
      case 'rejected':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          label: 'Rejeté',
        };
      default:
        return {
          icon: Clock,
          color: 'text-amber-600',
          bgColor: 'bg-amber-100',
          borderColor: 'border-amber-200',
          label: 'En attente',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={cn(
        'relative group border-2 rounded-xl p-5 transition-all duration-200',
        hasFile
          ? `${statusConfig.borderColor} border-solid bg-white`
          : 'border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50/30',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Upload Zone */}
      {!hasFile ? (
        <button
          type="button"
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="w-full text-left"
        >
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className={cn(
                'p-3 rounded-xl flex-shrink-0 transition-transform group-hover:scale-110',
                statusConfig.bgColor,
                statusConfig.color
              )}
            >
              {icon || <FileText className="w-6 h-6" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">
                  {documentLabel}
                </h4>
                {required && (
                  <span className="text-red-500 text-xs">*</span>
                )}
              </div>
              {documentDescription && (
                <p className="text-sm text-gray-500 mt-1">
                  {documentDescription}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {accept.includes('pdf') ? 'PDF uniquement' : 'Image ou PDF'} - Max {maxSize / (1024 * 1024)}Mo
              </p>
            </div>

            {/* Upload Icon */}
            <div className="flex-shrink-0">
              {isUploading ? (
                <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
              ) : (
                <Upload className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
              )}
            </div>
          </div>
        </button>
      ) : (
        /* File Display */
        <div className="flex items-center gap-4">
          {/* Status Icon */}
          <div
            className={cn(
              'p-3 rounded-xl flex-shrink-0',
              statusConfig.bgColor,
              statusConfig.color
            )}
          >
            <StatusIcon className="w-6 h-6" />
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900 truncate">
                {fileName || documentLabel}
              </h4>
              {required && (
                <span className="text-red-500 text-xs">*</span>
              )}
            </div>
            {fileSize && (
              <p className="text-sm text-gray-500">
                {formatFileSize(fileSize)}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Status Badge */}
            <span
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap',
                statusConfig.bgColor,
                statusConfig.color
              )}
            >
              {statusConfig.label}
            </span>

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={disabled}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Télécharger"
            >
              <Download className="w-4 h-4 text-gray-600" />
            </button>

            {/* Delete Button */}
            {onDelete && !disabled && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isUploading}
                className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Supprimer"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 text-red-600" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
}

export default DocumentUploadCard;
