/**
 * Composant InfiniteScroll réutilisable
 *
 * Détecte automatiquement quand l'utilisateur atteint le bas de la page
 * et déclenche le chargement de plus de données
 *
 * Utilise l'API Intersection Observer pour une performance optimale
 */

import { useEffect, useRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollProps {
  /**
   * Fonction appelée pour charger plus de données
   */
  onLoadMore: () => void | Promise<void>;

  /**
   * Y a-t-il plus de données à charger ?
   */
  hasMore: boolean;

  /**
   * Chargement en cours ?
   */
  loading?: boolean;

  /**
   * Contenu à afficher
   */
  children: ReactNode;

  /**
   * Distance du bas (en px) avant de déclencher le chargement
   * @default 200
   */
  threshold?: number;

  /**
   * Message affiché quand il n'y a plus de données
   */
  endMessage?: ReactNode;

  /**
   * Composant de chargement personnalisé
   */
  loader?: ReactNode;

  /**
   * Classe CSS du container
   */
  className?: string;
}

export default function InfiniteScroll({
  onLoadMore,
  hasMore,
  loading = false,
  children,
  threshold = 200,
  endMessage,
  loader,
  className = '',
}: InfiniteScrollProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];

        // Si le sentinel est visible et qu'on peut charger plus
        if (entry && entry.isIntersecting && hasMore && !loadingRef.current && !loading) {
          loadingRef.current = true;

          try {
            await onLoadMore();
          } catch (error) {
            console.error('Error loading more:', error);
          } finally {
            // Délai pour éviter les déclenchements trop rapides
            setTimeout(() => {
              loadingRef.current = false;
            }, 500);
          }
        }
      },
      {
        root: null, // viewport
        rootMargin: `${threshold}px`, // Déclencher avant d'atteindre le bas
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, onLoadMore, threshold]);

  const defaultLoader = (
    <div className="flex justify-center items-center py-8">
      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      <span className="ml-3 text-gray-600">Chargement...</span>
    </div>
  );

  const defaultEndMessage = (
    <div className="flex justify-center items-center py-8 text-gray-500">
      <span>Vous avez tout vu ! 🎉</span>
    </div>
  );

  return (
    <div className={className}>
      {children}

      {/* Sentinel pour l'Intersection Observer */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* État de chargement */}
      {loading && (loader || defaultLoader)}

      {/* Message de fin */}
      {!loading && !hasMore && (endMessage || defaultEndMessage)}
    </div>
  );
}
