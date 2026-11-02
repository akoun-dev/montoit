'use client'

/**
 * Grille de contrôle cochable de la mission (spec TC-001 SC-1/SC-2 : checklist simple).
 * Zone de tap = toute la ligne (≥ 56 px), case 24 px, focus ring shadcn — navigation clavier native.
 */

import { Checkbox } from '@/components/ui/checkbox'
import type { MissionChecklistItemDTO } from '@/services/tc/mission-token'

interface MissionChecklistProps {
  items: MissionChecklistItemDTO[]
  checkedIds: string[]
  onToggle: (id: string, checked: boolean) => void
}

export function MissionChecklist({ items, checkedIds, onToggle }: MissionChecklistProps) {
  if (items.length === 0) return null

  return (
    <section
      aria-labelledby="mission-checklist-title"
      className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs"
    >
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 id="mission-checklist-title" className="text-base font-semibold text-neutral-900">
          Points de contrôle
        </h2>
        <p className="text-xs font-medium text-neutral-500" aria-live="polite">
          {checkedIds.length}/{items.length} cochés
        </p>
      </div>
      <p className="mb-3 text-sm text-neutral-500">
        Cochez chaque point que vous avez vérifié sur place.
      </p>

      <ul className="space-y-2.5">
        {items.map((item) => {
          const inputId = `mission-check-${item.id}`
          return (
            <li key={item.id}>
              <label
                htmlFor={inputId}
                className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 transition-colors has-[[data-state=checked]]:border-brand-300 has-[[data-state=checked]]:bg-brand-50/60"
              >
                <Checkbox
                  id={inputId}
                  checked={checkedIds.includes(item.id)}
                  onCheckedChange={(value) => onToggle(item.id, value === true)}
                  className="mt-0.5 size-6"
                />
                <span className="text-[15px] leading-snug text-neutral-800">{item.label}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
