'use client'

import {
  FileText,
  Calendar,
  CheckCircle2,
  PenLine,
  ShieldCheck,
  Key,
  Building2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface InventoryReportItem {
  id: string
  designation: string
  designationOrder: number
  kitchen: string | null
  mainBathroom: string | null
  otherBathroom: string | null
  otherRoom1: string | null
  otherRoom2: string | null
  observations: string | null
}

export interface InventoryReport {
  id: string
  propertyId: string
  type: 'INVENTORY_ENTRANCE' | 'INVENTORY_EXIT'
  status: 'DRAFT' | 'COMPLETED' | 'SIGNED_OWNER' | 'SIGNED_TENANT' | 'SIGNED_BOTH'
  totalKeys: number | null
  generalObservations: string | null
  createdAt: string
  updatedAt: string
  property: {
    id: string
    title: string
    address: string
    city: string
    commune: string | null
  } | null
  items: InventoryReportItem[]
}

// ─── Constants ───────────────────────────────────────────────────────────────────

export const typeLabels: Record<string, string> = {
  INVENTORY_ENTRANCE: 'Entrée des lieux',
  INVENTORY_EXIT: 'Sortie des lieux',
}

export const statusConfig: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  DRAFT: {
    label: 'Brouillon',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: PenLine,
  },
  COMPLETED: {
    label: 'Complété',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Calendar,
  },
  SIGNED_OWNER: {
    label: 'Signé propriétaire',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  SIGNED_TENANT: {
    label: 'Signé locataire',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  SIGNED_BOTH: {
    label: 'Signé par les deux',
    className: 'bg-green-100 text-green-700 border-green-200',
    icon: ShieldCheck,
  },
}

export const ROOM_COLUMNS = [
  { key: 'kitchen', label: 'Cuisine', shortLabel: 'Cuis.' },
  { key: 'mainBathroom', label: 'Salle de bain principale', shortLabel: 'SdB princ.' },
  { key: 'otherBathroom', label: 'Salle de bain autres', shortLabel: 'SdB autres' },
  { key: 'otherRoom1', label: 'Autre pièce 1', shortLabel: 'Pièce 1' },
  { key: 'otherRoom2', label: 'Autre pièce 2', shortLabel: 'Pièce 2' },
] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────────

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function renderConditionCell(value: string | null) {
  if (!value) return <span className="text-muted-foreground">—</span>

  const upper = value.toUpperCase().trim()
  if (upper === 'BON') {
    return (
      <span className="inline-flex items-center justify-center rounded px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[11px] font-bold bg-green-500 text-white leading-tight">
        BON
      </span>
    )
  }
  if (upper === 'MAUVAIS') {
    return (
      <span className="inline-flex items-center justify-center rounded px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[11px] font-bold bg-red-500 text-white leading-tight">
        MAUVAIS
      </span>
    )
  }
  return <span className="text-[9px] sm:text-sm">{value}</span>
}

// ─── Component ───────────────────────────────────────────────────────────────────

interface ReportDetailDialogProps {
  report: InventoryReport | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportDetailDialog({
  report,
  open,
  onOpenChange,
}: ReportDetailDialogProps) {
  if (!report) return null

  const config = statusConfig[report.status] || statusConfig.DRAFT
  const StatusIcon = config.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-full max-h-[90vh] flex flex-col p-3 sm:p-6">
        <DialogHeader className="gap-1">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-sm sm:text-lg">
            <FileText className="size-4 sm:size-5 text-brand-500 shrink-0" />
            <span className="truncate text-sm sm:text-base">{report.property?.title || 'Bien sans titre'}</span>
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <Badge variant="outline" className="text-[9px] sm:text-xs leading-tight">
              {typeLabels[report.type] || report.type}
            </Badge>
            <Badge className={cn('text-[9px] sm:text-xs leading-tight', config.className)}>
              <StatusIcon className="size-2.5 sm:size-3 mr-0.5 sm:mr-1" />
              {config.label}
            </Badge>
            {report.totalKeys != null && report.totalKeys > 0 && (
              <Badge variant="outline" className="text-[9px] sm:text-xs leading-tight gap-0.5 sm:gap-1">
                <Key className="size-2.5 sm:size-3" />
                {report.totalKeys} clé(s)
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[9px] sm:text-xs text-muted-foreground leading-tight">
            <span className="flex items-center gap-1">
              <Building2 className="size-2.5 sm:size-3 shrink-0" />
              <span className="truncate max-w-[180px] sm:max-w-none">{report.property?.address}, {report.property?.city}{report.property?.commune ? ` — ${report.property.commune}` : ''}</span>
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Calendar className="size-2.5 sm:size-3" />
              Créé le {formatDate(report.createdAt)}
            </span>
          </div>
        </DialogHeader>

        {/* Inventory Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {report.items && report.items.length > 0 ? (
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              <table className="w-full min-w-[550px] sm:min-w-[700px] border-collapse text-[10px] sm:text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-1 sm:px-2 py-1 sm:py-2.5 text-left text-[9px] sm:text-xs font-bold text-foreground border-b border-r border-border w-5 sm:w-8">
                      N°
                    </th>
                    <th className="px-1 sm:px-2 py-1 sm:py-2.5 text-left text-[9px] sm:text-xs font-bold text-foreground border-b border-r border-border min-w-[80px] sm:min-w-[130px]">
                      DÉSIGNATIONS
                    </th>
                    {ROOM_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className="px-1 py-1 sm:py-2.5 text-center text-[8px] sm:text-[10px] font-bold text-foreground border-b border-r border-border min-w-[55px] sm:min-w-[90px] leading-tight"
                      >
                        <span className="hidden sm:inline">{col.label}</span>
                        <span className="sm:hidden">{col.shortLabel}</span>
                      </th>
                    ))}
                    <th className="px-1 sm:px-2 py-1 sm:py-2.5 text-left text-[9px] sm:text-xs font-bold text-foreground border-b border-border min-w-[70px] sm:min-w-[120px]">
                      OBS.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.items
                    .sort((a, b) => a.designationOrder - b.designationOrder)
                    .map((item, idx) => {
                      const isKeyRow =
                        item.designation.toUpperCase().includes('CLÉ') ||
                        item.designation.toUpperCase().includes('CLEF')
                      return (
                        <tr
                          key={item.id}
                          className={cn(
                            'hover:bg-muted/30 transition-colors',
                            isKeyRow && 'bg-amber-50/50'
                          )}
                        >
                          <td className="px-1 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-sm text-muted-foreground border-b border-r border-border text-center font-medium">
                            {idx + 1}
                          </td>
                          <td className="px-1 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-sm font-semibold text-foreground border-b border-r border-border whitespace-nowrap">
                            {isKeyRow && (
                              <Key className="size-2.5 sm:size-3 inline mr-0.5 sm:mr-1 text-brand-500" />
                            )}
                            {item.designation}
                          </td>
                          {ROOM_COLUMNS.map((col) => (
                            <td
                              key={col.key}
                              className="px-0.5 sm:px-2 py-1 sm:py-2 border-b border-r border-border text-center"
                            >
                              {renderConditionCell(
                                item[col.key as keyof InventoryReportItem] as string | null
                              )}
                            </td>
                          ))}
                          <td className="px-1 sm:px-2 py-1 sm:py-2 border-b border-border text-[10px] sm:text-sm text-muted-foreground">
                            {item.observations || '—'}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
              <FileText className="size-8 sm:size-10 text-muted-foreground/40 mb-2 sm:mb-3" />
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                Aucun élément d&apos;inventaire
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground/60 mt-1 max-w-[200px] sm:max-w-xs">
                Ce rapport a été créé mais aucun élément (pièces, équipements) n&apos;a encore été renseigné.
              </p>
            </div>
          )}
        </div>

        {/* General observations */}
        {report.generalObservations && (
          <div className="mt-3 rounded-lg border border-border bg-muted/30 p-2 sm:p-3">
            <p className="text-[9px] sm:text-xs font-semibold text-foreground mb-0.5 sm:mb-1">
              Observations générales
            </p>
            <p className="text-[10px] sm:text-sm text-muted-foreground whitespace-pre-wrap">
              {report.generalObservations}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
