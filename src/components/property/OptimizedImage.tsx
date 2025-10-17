import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { logger } from '@/services/logger';

interface OptimizedImageProps {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

export const OptimizedImage = ({
  src,
  alt,
  priority = false,
  sizes,
  className
}: OptimizedImageProps) => {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // ✅ SÉCURITÉ : Validation de l'URL avant affichage
  const sanitizeUrl = (url: string): string => {
    try {
      // Debug log
      console.log('OptimizedImage: Processing URL', { url, type: typeof url });
      
      if (!url || typeof url !== 'string' || url.trim() === '') {
        logger.warn('Empty or invalid URL provided', { url });
        return '';
      }

      const urlObj = new URL(url);
      console.log('OptimizedImage: Parsed URL', { hostname: urlObj.hostname });
      
      // Permettre les URLs Supabase Storage, Unsplash, Picsum et autres sources légitimes
      const allowedHosts = [
        'supabase.co',
        'unsplash.com',
        'images.unsplash.com',
        'picsum.photos',
        'images.picsum.photos',
        'lovable.app' // Ajouté pour les URLs de l'app
      ];

      if (!allowedHosts.some(host => urlObj.hostname.includes(host))) {
        logger.warn('Unauthorized URL attempted', { hostname: urlObj.hostname, url });
        console.warn('OptimizedImage: Unauthorized URL', { hostname: urlObj.hostname, url });
        return '';
      }
      console.log('OptimizedImage: URL authorized', { url });
      return url;
    } catch (error) {
      logger.warn('Invalid URL format', { url, error });
      console.error('OptimizedImage: URL parse error', { url, error });
      return '';
    }
  };

  useEffect(() => {
    const safeSrc = sanitizeUrl(src);
    if (!safeSrc) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    setCurrentSrc(safeSrc);
    setIsLoading(true);
    setHasError(false);

    const img = new Image();
    img.onload = () => {
      setIsLoading(false);
    };
    img.onerror = () => {
      logger.warn('Image failed to load', { src: safeSrc });
      setIsLoading(false);
      setHasError(true);
    };
    img.src = safeSrc;
  }, [src]);

  const generateSrcSet = (url: string): string => {
    if (!url || !url.includes("supabase")) return url;
    try {
      const separator = url.includes("?") ? "&" : "?";
      return `
        ${url}${separator}width=480 480w,
        ${url}${separator}width=768 768w,
        ${url}${separator}width=1024 1024w,
        ${url}${separator}width=1280 1280w
      `.trim();
    } catch {
      return url;
    }
  };

  // Image de fallback simple
  const fallbackImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='200' y='150' text-anchor='middle' font-family='Arial' font-size='16' fill='%236b7280'%3EPas d'image%3C/text%3E%3C/svg%3E";

  if (hasError || !currentSrc) {
    return (
      <img
        src={fallbackImage}
        alt={alt}
        className={cn("w-full h-auto object-cover", className)}
      />
    );
  }

  return (
    <img
      ref={imgRef}
      src={currentSrc}
      srcSet={generateSrcSet(currentSrc)}
      sizes={sizes || "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn(
        "transition-opacity duration-500 w-full h-auto",
        isLoading ? "opacity-50" : "opacity-100",
        className
      )}
    />
  );
};
