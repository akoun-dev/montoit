import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, ImagePlus, X, Upload, Loader2, Clipboard } from 'lucide-react';
import { CameraResultType } from '@capacitor/camera';
import { Button } from '@/shared/ui/Button';
import { useNativeCamera } from '@/hooks/native/useNativeCamera';
import { processNativeImage, fileToDataUrl } from '@/lib/helpers/imageUtils';
import { UploadService } from '@/services/upload/uploadService';
import { cn } from '@/shared/lib/utils';

interface NativeCameraUploadProps {
  onImageCaptured: (file: File, preview: string) => void;
  onMultipleImages?: (files: File[], previews: string[]) => void;
  multiple?: boolean;
  maxImages?: number;
  maxSizeMB?: number;
  compressionQuality?: number;
  compressionMaxWidth?: number;
  showPreview?: boolean;
  accept?: string;
  label?: string;
  variant?: 'button' | 'card' | 'inline';
  disabled?: boolean;
  className?: string;
}

export function NativeCameraUpload({
  onImageCaptured,
  onMultipleImages,
  multiple = false,
  maxImages = 10,
  maxSizeMB = 10,
  compressionQuality = 0.8,
  compressionMaxWidth = 1920,
  showPreview = true,
  accept = 'image/*',
  label = 'Ajouter une photo',
  variant = 'card',
  disabled = false,
  className,
}: NativeCameraUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteSupported, setPasteSupported] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const { isNative, takePhoto, pickFromGallery, pickMultiple, isLoading, error } = useNativeCamera({
    quality: 90,
    resultType: CameraResultType.DataUrl,
  });

  // Détecter si le paste est supporté
  useEffect(() => {
    setPasteSupported(
      navigator.clipboard && typeof navigator.clipboard.read === 'function'
    );
  }, []);

  // Handler pour le paste depuis le presse-papier
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      // Ignorer si le focus est dans un input de fichier
      if ((e.target as HTMLElement).tagName === 'INPUT') {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      e.preventDefault();
      setIsProcessing(true);

      try {
        const newFiles: File[] = [];
        const newPreviews: string[] = [];

        for (const item of Array.from(items)) {
          if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (!file) continue;

            // Validate file size
            if (file.size > maxSizeMB * 1024 * 1024) {
              console.warn(`File too large: ${file.name} (${file.size} bytes)`);
              continue;
            }

            // Compress the image
            const compressedFile = await UploadService.compressImage(
              file,
              compressionMaxWidth,
              compressionQuality
            );
            const preview = await fileToDataUrl(compressedFile);

            newFiles.push(compressedFile);
            newPreviews.push(preview);
          }
        }

        if (newFiles.length > 0) {
          if (multiple) {
            setFiles((prev) => [...prev, ...newFiles]);
            setPreviews((prev) => [...prev, ...newPreviews]);
            onMultipleImages?.([...files, ...newFiles], [...previews, ...newPreviews]);
          } else {
            setFiles(newFiles);
            setPreviews(newPreviews);
            onImageCaptured(newFiles[0], newPreviews[0]);
          }
        }
      } catch (err) {
        console.error('Error handling paste:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [files, previews, multiple, compressionMaxWidth, compressionQuality, maxSizeMB, onImageCaptured, onMultipleImages]
  );

  // Activer le paste sur le drop zone
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    if (pasteSupported) {
      dropZone.addEventListener('paste', handlePaste as EventListener);
    }

    return () => {
      if (pasteSupported && dropZone) {
        dropZone.removeEventListener('paste', handlePaste as EventListener);
      }
    };
  }, [pasteSupported, handlePaste]);

  // Handlers pour le drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer?.files || []) as File[];
      const imageFiles = droppedFiles.filter((f) => f.type.startsWith('image/'));

      if (imageFiles.length === 0) return;

      setIsProcessing(true);
      try {
        const newFiles: File[] = [];
        const newPreviews: string[] = [];

        for (const file of imageFiles) {
          // Validate file size
          if (file.size > maxSizeMB * 1024 * 1024) {
            console.warn(`File too large: ${file.name} (${file.size} bytes)`);
            continue;
          }

          // Compress the image
          const compressedFile = await UploadService.compressImage(
            file,
            compressionMaxWidth,
            compressionQuality
          );
          const preview = await fileToDataUrl(compressedFile);

          newFiles.push(compressedFile);
          newPreviews.push(preview);

          if (!multiple) {
            setFiles([compressedFile]);
            setPreviews([preview]);
            onImageCaptured(compressedFile, preview);
            break;
          }
        }

        if (multiple && newFiles.length > 0) {
          setFiles((prev) => [...prev, ...newFiles]);
          setPreviews((prev) => [...prev, ...newPreviews]);
          onMultipleImages?.([...files, ...newFiles], [...previews, ...newPreviews]);
        }
      } catch (err) {
        console.error('Error handling drop:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [files, previews, multiple, compressionMaxWidth, compressionQuality, maxSizeMB, onImageCaptured, onMultipleImages]
  );

  const processAndAddImage = useCallback(
    async (dataUrl: string) => {
      setIsProcessing(true);
      try {
        const { file, preview } = await processNativeImage(dataUrl, {
          maxWidth: compressionMaxWidth,
          quality: compressionQuality,
        });

        if (multiple) {
          const newFiles = [...files, file];
          const newPreviews = [...previews, preview];
          setFiles(newFiles);
          setPreviews(newPreviews);
          onMultipleImages?.(newFiles, newPreviews);
        } else {
          setFiles([file]);
          setPreviews([preview]);
          onImageCaptured(file, preview);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [
      files,
      previews,
      multiple,
      compressionMaxWidth,
      compressionQuality,
      onImageCaptured,
      onMultipleImages,
    ]
  );

  const handleTakePhoto = async () => {
    setShowSourceMenu(false);
    const result = await takePhoto();
    if (result?.dataUrl) {
      await processAndAddImage(result.dataUrl);
    }
  };

  const handlePickGallery = async () => {
    setShowSourceMenu(false);
    if (multiple) {
      const results = await pickMultiple(maxImages - files.length);
      for (const result of results) {
        if (result.webPath) {
          const response = await fetch(result.webPath);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onload = async () => {
            await processAndAddImage(reader.result as string);
          };
          reader.readAsDataURL(blob);
        }
      }
    } else {
      const result = await pickFromGallery();
      if (result?.dataUrl) {
        await processAndAddImage(result.dataUrl);
      }
    }
  };

  const handleWebFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    try {
      // Accumulate new files and previews locally
      const newFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of selectedFiles) {
        // Validate file size
        if (file.size > maxSizeMB * 1024 * 1024) {
          continue;
        }

        // Compress the image
        const compressedFile = await UploadService.compressImage(
          file,
          compressionMaxWidth,
          compressionQuality
        );
        const preview = await fileToDataUrl(compressedFile);

        newFiles.push(compressedFile);
        newPreviews.push(preview);

        if (!multiple) {
          setFiles([compressedFile]);
          setPreviews([preview]);
          onImageCaptured(compressedFile, preview);
          break;
        }
      }

      // Update state with new files and notify parent
      if (multiple && newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
        setPreviews((prev) => [...prev, ...newPreviews]);
        // Notify parent with the complete new lists
        onMultipleImages?.([...files, ...newFiles], [...previews, ...newPreviews]);
      }
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
    if (multiple) {
      onMultipleImages?.(newFiles, newPreviews);
    }
  };

  const isDisabled = disabled || isLoading || isProcessing;
  const canAddMore = multiple ? files.length < maxImages : files.length === 0;

  // Render preview grid
  const renderPreviews = () => {
    if (!showPreview || previews.length === 0) return null;

    return (
      <div className="grid grid-cols-3 gap-2 mt-3">
        {previews.map((preview, index) => (
          <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <img
              src={preview}
              alt={`Preview ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  // Native source selection menu
  const renderSourceMenu = () => {
    if (!showSourceMenu) return null;

    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-lg shadow-lg overflow-hidden z-50">
        <button
          type="button"
          onClick={handleTakePhoto}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
        >
          <Camera className="h-5 w-5 text-primary" />
          <span>Prendre une photo</span>
        </button>
        <button
          type="button"
          onClick={handlePickGallery}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-t border-border"
        >
          <ImagePlus className="h-5 w-5 text-primary" />
          <span>{multiple ? 'Choisir depuis la galerie' : 'Choisir une image'}</span>
        </button>
      </div>
    );
  };

  // Button variant
  if (variant === 'button') {
    return (
      <div className={cn('relative', className)}>
        {isNative ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="small"
              onClick={() => setShowSourceMenu(!showSourceMenu)}
              disabled={isDisabled || !canAddMore}
              className="rounded-full p-2"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </Button>
            {renderSourceMenu()}
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="small"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled || !canAddMore}
              className="rounded-full p-2"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              multiple={multiple}
              onChange={handleWebFileChange}
              className="hidden"
            />
          </>
        )}
        {renderPreviews()}
      </div>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <div className={cn('relative', className)}>
        {isNative ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSourceMenu(!showSourceMenu)}
              disabled={isDisabled || !canAddMore}
              className="gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {label}
            </Button>
            {renderSourceMenu()}
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled || !canAddMore}
              className="gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {label}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              multiple={multiple}
              onChange={handleWebFileChange}
              className="hidden"
            />
          </>
        )}
        {renderPreviews()}
      </div>
    );
  }

  // Card variant (default)
  return (
    <div className={cn('relative', className)}>
      {isNative ? (
        <>
          <div
            onClick={() => !isDisabled && canAddMore && setShowSourceMenu(!showSourceMenu)}
            className={cn(
              'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
              isDisabled || !canAddMore
                ? 'border-muted bg-muted/50 cursor-not-allowed'
                : 'border-primary/30 hover:border-primary hover:bg-primary/5'
            )}
          >
            <div className="flex flex-col items-center gap-3">
              {isProcessing ? (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              ) : (
                <Camera className="h-10 w-10 text-primary" />
              )}
              <div>
                <p className="font-medium text-foreground">{label}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Appuyez pour prendre une photo ou choisir depuis la galerie
                </p>
              </div>
              {multiple && (
                <p className="text-xs text-muted-foreground">
                  {files.length}/{maxImages} images
                </p>
              )}
            </div>
          </div>
          {renderSourceMenu()}
        </>
      ) : (
        <>
          <div
            ref={dropZoneRef}
            onClick={() => !isDisabled && canAddMore && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors relative',
              isDisabled || !canAddMore
                ? 'border-muted bg-muted/50 cursor-not-allowed'
                : isDragging
                  ? 'border-primary bg-primary/10 scale-[1.02]'
                  : 'border-primary/30 hover:border-primary hover:bg-primary/5',
              pasteSupported && 'cursor-copy'
            )}
          >
            <div className="flex flex-col items-center gap-3">
              {isProcessing ? (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              ) : (
                <>
                  <Upload className="h-10 w-10 text-primary" />
                  {pasteSupported && (
                    <Clipboard className="h-6 w-6 text-muted-foreground absolute top-2 right-2" />
                  )}
                </>
              )}
              <div>
                <p className="font-medium text-foreground">{label}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Cliquez, glissez-déposez ou collez vos images ici
                </p>
                {pasteSupported && (
                  <p className="text-xs text-primary mt-1">
                    📋 Ctrl+V pour coller depuis le presse-papier
                  </p>
                )}
              </div>
              {multiple && (
                <p className="text-xs text-muted-foreground">
                  {files.length}/{maxImages} images • Max {maxSizeMB}MB par image
                </p>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleWebFileChange}
            className="hidden"
          />
        </>
      )}
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      {renderPreviews()}
    </div>
  );
}
