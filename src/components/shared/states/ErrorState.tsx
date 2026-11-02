'use client'

import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  /** Titre de l'erreur (défaut : "Une erreur est survenue") */
  title?: string
  /** Détail optionnel (message technique, consigne…) */
  description?: string
  /** Icône Lucide (défaut : AlertTriangle) */
  icon?: LucideIcon
  /** Si fourni, affiche un bouton "Réessayer" */
  retry?: () => void
  className?: string
}

/**
 * État d'erreur mutualisé pour toutes les sections du dashboard.
 * Utilise le token sémantique `error` du thème (compatible dark mode).
 */
export function ErrorState({
  title = 'Une erreur est survenue',
  description,
  icon: Icon = AlertTriangle,
  retry,
  className,
}: ErrorStateProps) {
  return (
    <Card className={cn('border-border', className)} role="alert">
      <CardContent className="flex flex-col items-center justify-center gap-1 py-12 text-center">
        <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-error/10">
          <Icon className="size-7 text-error" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
        {retry && (
          <Button variant="outline" className="mt-4 gap-1.5" onClick={retry}>
            <RotateCw className="size-4" aria-hidden="true" />
            Réessayer
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
