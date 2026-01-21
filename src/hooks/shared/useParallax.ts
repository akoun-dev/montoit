import { useState, useEffect, useCallback, useMemo } from 'react';

interface UseParallaxOptions {
  /** Vitesse du parallax (0.1 = subtil, 0.5 = prononcé). Default: 0.25 */
  factor?: number;
  /** Activer/désactiver l'effet. Default: true */
  enabled?: boolean;
  /** Limite maximale de déplacement en pixels. Default: 150 */
  maxOffset?: number;
}

interface UseParallaxReturn {
  /** Décalage actuel en pixels */
  offset: number;
  /** Style à appliquer à l'élément parallax */
  style: React.CSSProperties;
  /** Indique si le parallax est actif */
  isEnabled: boolean;
}

/**
 * Hook pour créer un effet de parallax sur le scroll
 * Respecte prefers-reduced-motion pour l'accessibilité
 *
 * @example
 * const { style, offset, isEnabled } = useParallax({ factor: 0.25 });
 *
 * <img
 *   style={{
 *     ...style,
 *     transform: `translateY(${offset}px) scale(1.15)`
 *   }}
 * />
 */
export function useParallax(options: UseParallaxOptions = {}): UseParallaxReturn {
  const { factor = 0.25, enabled = true, maxOffset = 150 } = options;
  const [offset, setOffset] = useState(0);

  // Vérifier prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const isEnabled = enabled && !prefersReducedMotion;

  const handleScroll = useCallback(() => {
    if (!isEnabled) return;

    const scrollY = window.scrollY;
    const newOffset = Math.min(scrollY * factor, maxOffset);

    // Utiliser requestAnimationFrame pour des performances optimales
    requestAnimationFrame(() => {
      setOffset(newOffset);
    });
  }, [factor, maxOffset, isEnabled]);

  useEffect(() => {
    if (!isEnabled) {
      setOffset(0);
      return;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Appel initial pour définir la position correcte
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll, isEnabled]);

  const style: React.CSSProperties = useMemo(
    () => ({
      transform: isEnabled ? `translateY(${offset}px)` : 'none',
      willChange: isEnabled ? 'transform' : 'auto',
    }),
    [offset, isEnabled]
  );

  return {
    offset,
    style,
    isEnabled,
  };
}

export default useParallax;
