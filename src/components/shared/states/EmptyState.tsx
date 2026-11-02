'use client'

import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateAction {
  label: string
  onClick?: () => void
  variant?: 'default' | 'outline'
}

interface EmptyStateProps {
  /** Titre principal (ex. "Aucun bien enregistré") */
  title: string
  /** Description courte optionnelle sous le titre */
  description?: string
  /** Icône Lucide (défaut : Inbox) */
  icon?: LucideIcon
  /** Action principale optionnelle (bouton) */
  action?: EmptyStateAction
  className?: string
}

/**
 * État vide mutualisé pour toutes les sections du dashboard.
 * Remplace les blocs "Aucun X trouvé…" écrits à la main.
 */
export function EmptyState({ title, description, icon: Icon = Inbox, action, className }: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed border-border bg-muted/50', className)}>
      <CardContent className="flex flex-col items-center justify-center gap-1 py-12 text-center">
        <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
          <Icon className="size-7 text-brand-500" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
        {action && (
          <Button className="mt-4" variant={action.variant ?? 'default'} onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
