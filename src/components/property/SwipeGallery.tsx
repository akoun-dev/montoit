import { useState, useEffect, useMemo, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';
import { triggerHapticFeedback } from '@/utils/haptics';
import { Button } from '@/components/ui/button';

interface SwipeGalleryProps {
  images: string[];
  onImageChange?: (index: number) => void;
  className?: string;
}

export const SwipeGallery = ({ images, onImageChange, className }: SwipeGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [lastTap, setLastTap] = useState(0);

  // Preload adjacent images
  useEffect(() => {
    [currentIndex - 1, currentIndex + 1, currentIndex + 2].forEach(idx => {
      if (idx >= 0 && idx < images.length) {
        const img = new Image();
        img.src = images[idx];
      }
    });
  }, [currentIndex, images]);

  // Virtual scrolling for performance
  const visibleRange = useMemo(() => {
    const start = Math.max(0, currentIndex - 2);
    const end = Math.min(images.length, currentIndex + 3);
    return { start, end, images: images.slice(start, end) };
  }, [currentIndex, images]);

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      triggerHapticFeedback('medium');
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      onImageChange?.(newIndex);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      triggerHapticFeedback('medium');
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      onImageChange?.(newIndex);
    }
  };

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleNext,
    onSwipedRight: handlePrevious,
    trackMouse: false,
    delta: 50,
    preventScrollOnSwipe: true,
  });

  // Double tap to zoom
  const handleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      triggerHapticFeedback('light');
      setScale(scale === 1 ? 2 : 1);
      if (scale !== 1) {
        setPosition({ x: 0, y: 0 });
      }
    }
    setLastTap(now);
  };

  // Pinch to zoom with touch events
  const touchStartRef = useRef<{ distance: number; scale: number } | null>(null);

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      touchStartRef.current = {
        distance: getTouchDistance(e.touches),
        scale,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      const currentDistance = getTouchDistance(e.touches);
      const scaleChange = currentDistance / touchStartRef.current.distance;
      const newScale = Math.max(1, Math.min(3, touchStartRef.current.scale * scaleChange));
      setScale(newScale);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  return (
    <div 
      className="relative w-full"
      role="region"
      aria-label="Galerie de photos du bien"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="sr-only">
        Image {currentIndex + 1} sur {images.length}
      </span>
      
      {/* Main image container */}
      <div
        {...swipeHandlers}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleTap}
        className={`relative aspect-video w-full overflow-hidden rounded-lg bg-muted touch-none ${className || ''}`}
      >
        <div
          className="w-full h-full transition-transform duration-200"
          style={{
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
          }}
        >
          <OptimizedImage
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            className="w-full h-full object-cover"
            priority={currentIndex === 0}
          />
        </div>

        {/* Counter overlay */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
          {currentIndex + 1}/{images.length}
        </div>

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        {currentIndex < images.length - 1 && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Dots navigation */}
      <div className="flex justify-center gap-1.5 mt-3">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              triggerHapticFeedback('light');
              setCurrentIndex(idx);
              onImageChange?.(idx);
              setScale(1);
              setPosition({ x: 0, y: 0 });
            }}
            className={`h-2 rounded-full transition-all ${
              idx === currentIndex
                ? 'w-6 bg-primary'
                : 'w-2 bg-muted-foreground/30'
            }`}
            aria-label={`Voir image ${idx + 1}`}
          />
        ))}
      </div>

      {/* Zoom hint */}
      {scale === 1 && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Double tap pour zoomer • Pincer pour zoomer
        </p>
      )}
    </div>
  );
};
