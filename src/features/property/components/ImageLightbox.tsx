import React, { useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}) => {
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < images.length - 1;

  const goToPrev = useCallback(() => {
    if (canGoPrev) {
      onNavigate(currentIndex - 1);
    }
  }, [canGoPrev, currentIndex, onNavigate]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      onNavigate(currentIndex + 1);
    }
  }, [canGoNext, currentIndex, onNavigate]);

  // Gestion des touches clavier
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrev();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToPrev, goToNext, onClose]);

  if (!isOpen || !images[currentIndex]) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden">
        {/* Header avec compteur et bouton fermer */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="text-white font-medium">
            {currentIndex + 1} / {images.length}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image principale */}
        <div className="relative w-full h-[85vh] flex items-center justify-center">
          <img
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
          />

          {/* Bouton précédent */}
          {canGoPrev && (
            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all backdrop-blur-sm"
              aria-label="Image précédente"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Bouton suivant */}
          {canGoNext && (
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all backdrop-blur-sm"
              aria-label="Image suivante"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Miniatures en bas */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex gap-2 justify-center overflow-x-auto max-w-full px-4 scrollbar-hide">
            {images.map((url, index) => (
              <button
                key={index}
                onClick={() => onNavigate(index)}
                className={`
                  flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all
                  ${
                    index === currentIndex
                      ? 'border-primary ring-2 ring-primary/50 scale-110'
                      : 'border-white/30 hover:border-white/60 opacity-70 hover:opacity-100'
                  }
                `}
              >
                <img
                  src={url}
                  alt={`Miniature ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageLightbox;
