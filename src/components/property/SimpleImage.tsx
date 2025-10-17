import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SimpleImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
}

export const SimpleImage = ({
  src,
  alt,
  className,
  fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='200' y='150' text-anchor='middle' font-family='Arial' font-size='16' fill='%236b7280'%3EImage en chargement...%3C/text%3E%3C/svg%3E"
}: SimpleImageProps) => {
  const [currentSrc, setCurrentSrc] = useState<string>(fallback);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    console.log('SimpleImage: Processing image', { src });
    
    // Validation simple
    if (!src || typeof src !== 'string' || src.trim() === '') {
      console.warn('SimpleImage: Invalid src', { src });
      setCurrentSrc(fallback);
      setIsLoading(false);
      setHasError(true);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    
    // Tester si l'URL est accessible
    const img = new Image();
    img.onload = () => {
      console.log('SimpleImage: Image loaded successfully', { src });
      setCurrentSrc(src);
      setIsLoading(false);
    };
    img.onerror = (error) => {
      console.error('SimpleImage: Image failed to load', { src, error });
      setCurrentSrc(fallback);
      setIsLoading(false);
      setHasError(true);
    };
    
    // Commencer le chargement
    img.src = src;
  }, [src, fallback]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={cn(
        "transition-opacity duration-300 w-full h-auto object-cover",
        isLoading ? "opacity-50" : "opacity-100",
        hasError && "grayscale opacity-75",
        className
      )}
      onError={(e) => {
        console.error('SimpleImage: Image error in DOM', { src: currentSrc });
        if (!hasError) {
          setCurrentSrc(fallback);
          setHasError(true);
        }
      }}
    />
  );
};
