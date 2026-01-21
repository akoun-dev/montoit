import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Download, Share2 } from 'lucide-react';
import { toast } from '@/hooks/shared/useToast';

interface ImageGalleryProps {
  images: string[];
  propertyTitle?: string;
}

export default function ImageGallery({ images, propertyTitle }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const defaultImage = 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg';
  const galleryImages = images.length > 0 ? images : [defaultImage];

  const goToPrevious = () => {
    setSelectedImage((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const goToNext = () => {
    setSelectedImage((prev) => (prev + 1) % galleryImages.length);
  };

  const openFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setShowFullscreen(true);
  };

  const closeFullscreen = () => {
    setShowFullscreen(false);
  };

  const goToPreviousFullscreen = () => {
    setFullscreenIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const goToNextFullscreen = () => {
    setFullscreenIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: propertyTitle || 'Propriété sur Mon Toit',
          text: 'Découvrez cette propriété sur Mon Toit',
          url: window.location.href,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Lien copié !', {
      description: 'Le lien a été copié dans le presse-papier',
    });
  };

  const handleDownload = async () => {
    try {
      const image = galleryImages[selectedImage];
      if (!image) return;
      const response = await fetch(image);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `propriete-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image téléchargée !');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  return (
    <>
      {/* Main Gallery */}
      <div className="space-y-4">
        {/* Main Image */}
        <div className="relative aspect-video md:aspect-[16/9] bg-gray-200 rounded-2xl overflow-hidden group">
          <img
            src={galleryImages[selectedImage]}
            alt={`Image ${selectedImage + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Navigation Arrows */}
          {galleryImages.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                aria-label="Image précédente"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                aria-label="Image suivante"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Action Buttons */}
          <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => openFullscreen(selectedImage)}
              className="p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all duration-200 transform hover:scale-110"
              aria-label="Plein écran"
            >
              <Maximize2 className="h-5 w-5" />
            </button>
            <button
              onClick={handleDownload}
              className="p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all duration-200 transform hover:scale-110"
              aria-label="Télécharger"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={handleShare}
              className="p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all duration-200 transform hover:scale-110"
              aria-label="Partager"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>

          {/* Image Counter */}
          <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/50 text-white text-sm font-medium rounded-lg backdrop-blur-sm">
            {selectedImage + 1} / {galleryImages.length}
          </div>
        </div>

        {/* Thumbnails */}
        {galleryImages.length > 1 && (
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3">
            {galleryImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`relative aspect-square rounded-lg overflow-hidden transition-all duration-200 ${
                  index === selectedImage
                    ? 'ring-4 ring-blue-500 scale-95'
                    : 'hover:ring-2 hover:ring-blue-300 opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={image}
                  alt={`Miniature ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {showFullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={closeFullscreen}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-all duration-200 z-10"
            aria-label="Fermer"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Image */}
          <img
            src={galleryImages[fullscreenIndex]}
            alt={`Image ${fullscreenIndex + 1}`}
            className="max-w-full max-h-full object-contain p-4"
          />

          {/* Navigation */}
          {galleryImages.length > 1 && (
            <>
              <button
                onClick={goToPreviousFullscreen}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-all duration-200"
                aria-label="Image précédente"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>

              <button
                onClick={goToNextFullscreen}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-all duration-200"
                aria-label="Image suivante"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg backdrop-blur-sm">
            {fullscreenIndex + 1} / {galleryImages.length}
          </div>
        </div>
      )}
    </>
  );
}
