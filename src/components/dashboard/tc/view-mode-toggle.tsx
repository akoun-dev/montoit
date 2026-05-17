'use client'

import { LayoutGrid, LayoutList } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ViewMode = 'card' | 'list'

interface ViewModeToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => onViewModeChange('card')}
        className={cn(
          'p-2 transition-colors',
          viewMode === 'card'
            ? 'bg-brand-500 text-white'
            : 'bg-background text-muted-foreground hover:bg-muted'
        )}
        title="Vue carte"
      >
        <LayoutGrid className="size-4" />
      </button>
      <button
        onClick={() => onViewModeChange('list')}
        className={cn(
          'p-2 transition-colors',
          viewMode === 'list'
            ? 'bg-brand-500 text-white'
            : 'bg-background text-muted-foreground hover:bg-muted'
        )}
        title="Vue liste"
      >
        <LayoutList className="size-4" />
      </button>
    </div>
  )
}
