import { useEffect, useRef } from 'react';

interface PrefetchOptions {
  enabled?: boolean;
  priority?: 'high' | 'low' | 'auto';
}

export const usePanoramaPrefetch = (
  imageUrls: string[],
  options: PrefetchOptions = {}
) => {
  const { enabled = true, priority = 'low' } = options;
  const prefetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || imageUrls.length === 0) return;

    const prefetchImage = (url: string) => {
      if (prefetchedRef.current.has(url)) return;

      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      link.as = 'image';

      if (priority !== 'auto') {
        link.setAttribute('fetchpriority', priority);
      }

      document.head.appendChild(link);
      prefetchedRef.current.add(url);

      return () => {
        document.head.removeChild(link);
      };
    };

    const cleanupFns = imageUrls.map(prefetchImage);

    return () => {
      cleanupFns.forEach(cleanup => cleanup?.());
    };
  }, [imageUrls, enabled, priority]);

  const prefetchOnHover = (url: string) => {
    if (prefetchedRef.current.has(url)) return;

    const img = new Image();
    img.src = url;
    prefetchedRef.current.add(url);
  };

  return { prefetchOnHover };
};
