'use client'

import { Badge } from '@/components/ui/badge'
import { rentalFileTypeLabel } from '@/lib/rental-file-types'
import { cn } from '@/lib/utils'

/**
 * FUN-002 — Badge du type de dossier locatif (Personnel / Familial / Colocation).
 *
 * Extrait du badge inline de `rental-files-list.tsx` (spec FUN-002 §5.3) pour
 * être réutilisé sans duplication par : la liste des dossiers, les candidatures
 * (liste + détail) et la carte d'aperçu de l'overview.
 *
 * Le libellé FR reste dans `rental-file-types.ts` (source de vérité unique) ;
 * toute valeur absente/inconnue retombe sur STANDARD (dossiers pré-migration).
 */
export function RentalFileTypeBadge({
  fileType,
  className,
}: {
  fileType: unknown
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] bg-muted text-muted-foreground border-border', className)}
    >
      {rentalFileTypeLabel(fileType)}
    </Badge>
  )
}
