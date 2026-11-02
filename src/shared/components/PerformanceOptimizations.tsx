import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// Composant de loading générique
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message = 'Chargement...',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600 mb-3`} />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );
};

// Wrapper pour les composants lazy avec suspense
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback,
  errorFallback: _errorFallback,
}) => {
  return (
    <Suspense fallback={fallback || <LoadingSpinner message="Chargement du contenu..." />}>
      {children}
    </Suspense>
  );
};

// Composant d'erreur pour les lazy imports
interface LazyErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LazyErrorBoundary: React.FC<LazyErrorBoundaryProps> = ({ children, fallback }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = () => setHasError(true);

    // Écouter les erreurs de chargement des modules
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (hasError) {
    return (
      fallback || (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</h3>
          <p className="text-sm text-gray-600 mb-4">
            Une erreur s'est produite lors du chargement de ce contenu.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Recharger la page
          </button>
        </div>
      )
    );
  }

  return <>{children}</>;
};

// Fonction helper pour créer des composants lazy avec erreur handling
export const createLazyComponent = (
  importFunc: () => Promise<{ default: React.ComponentType<any> }>,
  fallback?: React.ReactNode,
  errorFallback?: React.ReactNode
) => {
  const LazyComponent = lazy(importFunc);

  return (props: any) => (
    <LazyErrorBoundary fallback={errorFallback}>
      <LazyWrapper fallback={fallback}>
        <LazyComponent {...props} />
      </LazyWrapper>
    </LazyErrorBoundary>
  );
};

// Composants pré-chargés pour optimisation
// Note: Ces imports sont commentés car les composants n'existent pas encore
export const preloadComponents = {
  // PropertyForm: () => import('./PropertyForm'),
  // PropertyImageUpload: () => import('./PropertyImageUpload'),
  // CitySelector: () => import('./CitySelector'),
  // ContactForm: () => import('../../shared/components/ContactForm')
};

// Hook pour pré-charger les composants
// Note: Désactivé car les composants n'existent pas encore
export const useComponentPreloader = () => {
  const preload = React.useCallback((_componentName: keyof typeof preloadComponents) => {
    // Désactivé temporairement
    // if ('requestIdleCallback' in window) {
    //   requestIdleCallback(() => {
    //     preloadComponents[componentName]();
    //   });
    // } else {
    //   setTimeout(() => {
    //     preloadComponents[componentName]();
    //   }, 100);
    // }
  }, []);

  return { preload };
};

// Optimisation des images avec lazy loading
export interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  placeholder = '/placeholder-image.jpg',
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Intersection Observer pour lazy loading
  React.useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset['src']) {
              img.src = img.dataset['src'];
              img.removeAttribute('data-src');
            }
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px', // Commencer à charger 50px avant que l'image soit visible
      }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}

      {hasError ? (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">Image non disponible</p>
          </div>
        </div>
      ) : (
        <img
          ref={imgRef}
          data-src={src}
          src={isLoaded ? src : placeholder}
          alt={alt}
          className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}
    </div>
  );
};

export default LoadingSpinner;
