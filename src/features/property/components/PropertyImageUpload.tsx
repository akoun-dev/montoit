import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Upload, Camera, AlertCircle } from 'lucide-react';
import DraggableImageGrid from './DraggableImageGrid';

interface PropertyImageUploadProps {
  images: File[];
  mainImageIndex: number;
  onImagesAdd: (files: File[]) => void;
  onImageRemove: (index: number) => void;
  onMainImageSet: (index: number) => void;
  onImagesReorder: (fromIndex: number, toIndex: number) => void;
  disabled?: boolean;
  maxImages?: number;
}

const PropertyImageUpload: React.FC<PropertyImageUploadProps> = ({
  images,
  mainImageIndex,
  onImagesAdd,
  onImageRemove,
  onMainImageSet,
  onImagesReorder,
  disabled = false,
  maxImages = 20,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Générer les URLs de prévisualisation quand les images changent
  useEffect(() => {
    // Nettoyer les anciennes URLs
    previewUrls.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });

    // Générer les nouvelles URLs
    const newUrls = images.map((file) => URL.createObjectURL(file));
    setPreviewUrls(newUrls);

    // Cleanup au démontage
    return () => {
      newUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  // Gestion du drag & drop pour la zone d'upload principale
  const handleMainDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    },
    [disabled]
  );

  // Gestion des fichiers
  const handleFiles = useCallback(
    (files: File[]) => {
      const validFiles = files.filter((file) => {
        // Vérifier le type
        if (!file.type.startsWith('image/')) {
          alert(`Le fichier ${file.name} n'est pas une image valide`);
          return false;
        }

        // Vérifier la taille (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(`L'image ${file.name} dépasse la taille maximale de 5MB`);
          return false;
        }

        return true;
      });

      if (images.length + validFiles.length > maxImages) {
        alert(`Vous ne pouvez pas ajouter plus de ${maxImages} images`);
        return;
      }

      onImagesAdd(validFiles);
    },
    [images.length, maxImages, onImagesAdd]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      handleFiles(files);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  // Gestion du clic sur le bouton d'upload
  const handleUploadClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  return (
    <div className="space-y-6">
      {/* Zone d'upload */}
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300
          ${
            dragOver && !disabled
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragOver={handleMainDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="space-y-4">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
            <Camera className="w-7 h-7 text-primary" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Ajoutez des photos de votre propriété
            </h3>
            <p className="text-muted-foreground mb-4">
              Glissez-déposez vos images ici ou cliquez pour sélectionner
            </p>
            <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>Formats: JPG, PNG, WebP</span>
              <span className="hidden sm:inline">•</span>
              <span>Max: 5MB/image</span>
              <span className="hidden sm:inline">•</span>
              <span>Maximum {maxImages} images</span>
            </div>
          </div>

          <button
            type="button"
            disabled={disabled}
            className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            <Upload className="w-4 h-4 mr-2" />
            Sélectionner des images
          </button>
        </div>

        {dragOver && (
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-primary border-dashed">
            <div className="text-primary font-semibold text-lg flex items-center gap-2">
              <Upload className="w-6 h-6 animate-bounce" />
              Relâchez pour ajouter les images
            </div>
          </div>
        )}
      </div>

      {/* Avertissement */}
      {images.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Photos importantes
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Les propriétés avec des photos obtiennent 5x plus de vues. Ajoutez au minimum 3 photos
              de qualité.
            </p>
          </div>
        </div>
      )}

      {/* Galerie d'images avec drag-and-drop */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-foreground">Photos de votre propriété</h4>
            <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {images.length}/{maxImages}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            ✨ Glissez les images pour les réorganiser. Cliquez sur l'étoile pour définir l'image
            principale.
          </p>

          <DraggableImageGrid
            images={images}
            previewUrls={previewUrls}
            mainImageIndex={mainImageIndex}
            onImagesReorder={onImagesReorder}
            onImageRemove={onImageRemove}
            onMainImageSet={onMainImageSet}
            disabled={disabled}
          />

          {/* Conseils */}
          <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <h5 className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
              💡 Conseils pour de belles photos
            </h5>
            <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
              <li>• Utilisez un éclairage naturel</li>
              <li>• Prenez des photos de chaque pièce</li>
              <li>• Mettez en valeur les points forts (vue, jardin, etc.)</li>
              <li>• Définissez une photo principale attrayante</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyImageUpload;
