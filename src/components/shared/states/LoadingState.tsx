'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type LoadingStateVariant = 'list' | 'grid' | 'table' | 'detail'

interface LoadingStateProps {
  /**
   * Forme du squelette :
   * - list   : rangées de cartes (défaut)
   * - grid   : grille de cartes (ex. biens, dossiers)
   * - table  : en-tête + lignes de tableau
   * - detail : page de détail (titre + blocs)
   */
  variant?: LoadingStateVariant
  /** Nombre d'éléments squelettes (défaut : 3) */
  rows?: number
  className?: string
}

/**
 * État de chargement mutualisé (squelettes) pour toutes les sections du dashboard.
 * Remplace les spinners `Loader2` ad-hoc — réservé le spinner aux actions boutons.
 */
export function LoadingState({ variant = 'list', rows = 3, className }: LoadingStateProps) {
  if (variant === 'table') {
    return (
      <div className={cn('space-y-3', className)} aria-busy="true" aria-live="polite" data-slot="loading-state">
        <Skeleton className="h-10 w-full rounded-xl" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (variant === 'grid') {
    return (
      <div
        className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}
        aria-busy="true"
        aria-live="polite"
        data-slot="loading-state"
      >
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (variant === 'detail') {
    return (
      <div className={cn('space-y-4', className)} aria-busy="true" aria-live="polite" data-slot="loading-state">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  // 'list' (défaut)
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-live="polite" data-slot="loading-state">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  )
}
