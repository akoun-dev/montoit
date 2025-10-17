import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Shimmer } from "@/components/ui/shimmer";
import { Home } from "lucide-react";

interface LazyIllustrationProps {
  src: string | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  animate?: boolean;
}

export const LazyIllustration = ({ 
  src, 
  alt, 
  className, 
  fallback,
  animate = true 
}: LazyIllustrationProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      {
        rootMargin: "50px",
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
  };

  if (!src || error) {
    return (
      <div className={cn("bg-primary/5 flex items-center justify-center", className)}>
        {fallback || (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Home className="h-12 w-12 text-primary/40" />
            <span className="text-sm font-medium">Illustration à venir</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5">
          <Shimmer className="absolute inset-0" />
        </div>
      )}
      
      {isInView && (
        <picture>
          <source
            srcSet={src.replace('.png', '.webp')}
            type="image/webp"
          />
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              "w-full h-full object-cover transition-all duration-700",
              isLoaded ? "opacity-100 image-loaded" : "opacity-0",
              animate && isLoaded && "animate-fade-in-up"
            )}
            loading="lazy"
            fetchPriority="auto"
            decoding="async"
          />
        </picture>
      )}
    </div>
  );
};
