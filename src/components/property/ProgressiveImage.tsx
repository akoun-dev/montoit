/**
 * @deprecated Use OptimizedImage instead for better security and performance
 * This component will be removed in a future version
 * OptimizedImage provides:
 * - URL validation (only Supabase Storage allowed)
 * - WebP format support
 * - Better security against malicious URLs
 */
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  thumbQuality?: number;
  onClick?: () => void;
}

export const ProgressiveImage = ({
  src,
  alt,
  className,
  thumbQuality = 10,
  onClick,
}: ProgressiveImageProps) => {
  const [currentSrc, setCurrentSrc] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Generate low-res URL by adding quality parameter if it's a Supabase URL
  const getLowResSrc = (url: string): string => {
    if (url.includes("supabase")) {
      // For Supabase storage, we can add transform parameters
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}quality=${thumbQuality}&width=50`;
    }
    return url;
  };

  useEffect(() => {
    setIsLoading(true);
    
    // First, load the low-res version
    const lowResImg = new Image();
    const lowResSrc = getLowResSrc(src);
    
    lowResImg.onload = () => {
      setCurrentSrc(lowResSrc);
      
      // Then load the high-res version
      const highResImg = new Image();
      highResImg.onload = () => {
        setCurrentSrc(src);
        setIsLoading(false);
      };
      highResImg.onerror = () => {
        setIsLoading(false);
      };
      highResImg.src = src;
    };

    lowResImg.onerror = () => {
      // If low-res fails, try loading high-res directly
      setCurrentSrc(src);
      setIsLoading(false);
    };

    lowResImg.src = lowResSrc;
  }, [src, thumbQuality]);

  return (
    <div className="relative overflow-hidden">
      <img
        src={currentSrc || src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(
          "transition-all duration-500",
          isLoading && currentSrc === getLowResSrc(src) 
            ? "blur-sm scale-105" 
            : "blur-0 scale-100",
          className
        )}
        onClick={onClick}
      />
      {isLoading && currentSrc === getLowResSrc(src) && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-muted/5 animate-pulse" />
      )}
    </div>
  );
};
