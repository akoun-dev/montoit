'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  FileText,
  Eye,
  Calendar,
  CheckCircle2,
  Clock,
  PenLine,
  ShieldCheck,
  Key,
  Building2,
  MapPin,
  Filter,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { ViewModeToggle, type ViewMode } from './view-mode-toggle'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface InventoryReportItem {
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

interface InventoryReport {
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
  }
  items: InventoryReportItem[]
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ReportsResponse {
  reports: InventoryReport[]
  pagination: PaginationInfo
}

// ─── Constants ───────────────────────────────────────────────────────────────────

const typeLabels: Record<string, string> = {
  INVENTORY_ENTRANCE: 'Entrée des lieux',
  INVENTORY_EXIT: 'Sortie des lieux',
}

const statusConfig: Record<
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
    icon: Clock,
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

const ROOM_COLUMNS = [
  { key: 'kitchen', label: 'Cuisine' },
  { key: 'mainBathroom', label: 'SdB principale' },
  { key: 'otherBathroom', label: 'SdB autres' },
  { key: 'otherRoom1', label: 'Autre pièce 1' },
  { key: 'otherRoom2', label: 'Autre pièce 2' },
] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
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
      <span className="inline-flex items-center justify-center rounded px-2 py-0.5 text-[11px] font-bold bg-green-500 text-white">
        BON
      </span>
    )
  }
  if (upper === 'MAUVAIS') {
    return (
      <span className="inline-flex items-center justify-center rounded px-2 py-0.5 text-[11px] font-bold bg-red-500 text-white">
        MAUVAIS
      </span>
    )
  }
  // For key counts or other text
  return <span className="text-sm">{value}</span>
}

// ─── Detail Dialog ───────────────────────────────────────────────────────────────

function ReportDetailDialog({
  report,
  open,
  onOpenChange,
}: {
  report: InventoryReport | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!report) return null

  const config = statusConfig[report.status] || statusConfig.DRAFT
  const StatusIcon = config.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="size-5 text-brand-500" />
            État des lieux — {report.property?.title || 'Bien sans titre'}
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {typeLabels[report.type] || report.type}
            </Badge>
            <Badge className={cn('text-xs', config.className)}>
              <StatusIcon className="size-3 mr-1" />
              {config.label}
            </Badge>
            {report.totalKeys != null && report.totalKeys > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Key className="size-3" />
                {report.totalKeys} clé(s)
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="size-3" />
              {report.property?.address}, {report.property?.city}
              {report.property?.commune ? ` — ${report.property.commune}` : ''}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              Créé le {formatDate(report.createdAt)}
            </span>
          </div>
        </DialogHeader>

        {/* Inventory Grid */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full max-h-[55vh]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-foreground border-b border-r border-border w-8">
                      N°
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-foreground border-b border-r border-border min-w-[130px]">
                      DÉSIGNATIONS
                    </th>
                    {ROOM_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className="px-2 py-2.5 text-center text-[10px] font-bold text-foreground border-b border-r border-border min-w-[90px] leading-tight"
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-foreground border-b border-border min-w-[120px]">
                      OBSERVATIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.items
                    ?.sort((a, b) => a.designationOrder - b.designationOrder)
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
                          <td className="px-3 py-2 text-sm text-muted-foreground border-b border-r border-border text-center font-medium">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 text-sm font-semibold text-foreground border-b border-r border-border whitespace-nowrap">
                            {isKeyRow && (
                              <Key className="size-3.5 inline mr-1.5 text-brand-500" />
                            )}
                            {item.designation}
                          </td>
                          {ROOM_COLUMNS.map((col) => (
                            <td
                              key={col.key}
                              className="px-2 py-2 border-b border-r border-border text-center"
                            >
                              {renderConditionCell(
                                item[col.key as keyof InventoryReportItem] as string | null
                              )}
                            </td>
                          ))}
                          <td className="px-2 py-2 border-b border-border text-sm text-muted-foreground">
                            {item.observations || '—'}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </div>

        {/* General observations */}
        {report.generalObservations && (
          <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold text-foreground mb-1">
              Observations générales
            </p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {report.generalObservations}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────────

export function InventoryReportsList() {
  const { isAuthenticated, setSelectedItemId, setDashboardSection, setSelectedPropertyId } =
    useAuthStore()
  const [reports, setReports] = useState<InventoryReport[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [filterType, setFilterType] = useState<'ALL' | 'INVENTORY_ENTRANCE' | 'INVENTORY_EXIT'>(
    'ALL'
  )
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [detailReport, setDetailReport] = useState<InventoryReport | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // ─── Fetch ───────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams()
      if (filterType !== 'ALL') params.set('type', filterType)
      if (filterStatus !== 'ALL') params.set('status', filterStatus)
      const qs = params.toString()
      const url = `/api/tc/inventory-reports${qs ? `?${qs}` : ''}`

      const d = await authFetch<ReportsResponse>(url)
      setReports(d.reports || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setReports([])
        return
      }
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, filterType, filterStatus])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleEditDraft = (report: InventoryReport) => {
    // Pass the report ID so the form can load existing data via PATCH
    setSelectedItemId(report.id)
    setSelectedPropertyId(report.propertyId)
    setDashboardSection('inventory-report-form')
  }

  const handleViewDetail = (report: InventoryReport) => {
    setDetailReport(report)
    setDetailOpen(true)
  }

  const handleReportClick = (report: InventoryReport) => {
    if (report.status === 'DRAFT') {
      handleEditDraft(report)
    } else {
      handleViewDetail(report)
    }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header + View toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Rapports d&apos;état des lieux
          </h1>
          <p className="text-muted-foreground mt-1">
            Consultez et gérez les rapports existants
          </p>
        </div>
        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Type filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="size-3.5 text-muted-foreground mr-1" />
              <span className="text-xs font-medium text-muted-foreground mr-1">Type:</span>
              {(['ALL', 'INVENTORY_ENTRANCE', 'INVENTORY_EXIT'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    filterType === type
                      ? 'bg-brand-500 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {type === 'ALL' ? 'Tous' : typeLabels[type]}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground mr-1">Statut:</span>
              {(
                ['ALL', 'DRAFT', 'COMPLETED', 'SIGNED_OWNER', 'SIGNED_TENANT', 'SIGNED_BOTH'] as const
              ).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    filterStatus === status
                      ? 'bg-brand-500 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {status === 'ALL' ? 'Tous' : statusConfig[status]?.label || status}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Count */}
      <Badge variant="secondary" className="bg-brand-50 text-brand-700">
        {reports.length} rapport{reports.length !== 1 ? 's' : ''}
      </Badge>

      {/* Empty state */}
      {reports.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <FileText className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">
              Aucun rapport d&apos;état des lieux
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Les rapports créés apparaîtront ici
            </p>
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'card' ? (
            <motion.div
              key="card-view"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {reports.map((report, idx) => {
                const config = statusConfig[report.status] || statusConfig.DRAFT
                const StatusIcon = config.icon
                const isDraft = report.status === 'DRAFT'

                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                  >
                    <Card className="border-border hover:shadow-md transition-all duration-200 h-full">
                      <CardContent className="p-4 flex flex-col h-full">
                        {/* Top — Icon + Title */}
                        <div className="flex items-start gap-3 flex-1">
                          <div className="size-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                            <FileText className="size-5 text-brand-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate text-sm">
                              {report.property?.title || 'Bien sans titre'}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                              <MapPin className="size-3 shrink-0" />
                              <span className="truncate">
                                {report.property?.address}
                                {report.property?.city ? `, ${report.property.city}` : ''}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Badge variant="outline" className="text-[11px]">
                            {typeLabels[report.type] || report.type}
                          </Badge>
                          <Badge className={cn('text-[11px]', config.className)}>
                            <StatusIcon className="size-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {formatDate(report.createdAt)}
                          </span>
                          <span>
                            {report.items?.length || 0} élément(s)
                          </span>
                          {report.totalKeys != null && report.totalKeys > 0 && (
                            <span className="flex items-center gap-1">
                              <Key className="size-3" />
                              {report.totalKeys} clé(s)
                            </span>
                          )}
                        </div>

                        {/* Action */}
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                          <Button
                            size="sm"
                            variant={isDraft ? 'default' : 'outline'}
                            className={cn(
                              'gap-1.5 text-xs h-8',
                              isDraft &&
                                'bg-brand-500 hover:bg-brand-600 text-white'
                            )}
                            onClick={() => handleReportClick(report)}
                          >
                            {isDraft ? (
                              <>
                                <PenLine className="size-3.5" />
                                Modifier
                              </>
                            ) : (
                              <>
                                <Eye className="size-3.5" />
                                Voir le détail
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </motion.div>
          ) : (
            <motion.div
              key="list-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs font-bold">Bien</TableHead>
                      <TableHead className="text-xs font-bold">Type</TableHead>
                      <TableHead className="text-xs font-bold">Statut</TableHead>
                      <TableHead className="text-xs font-bold">Date</TableHead>
                      <TableHead className="text-xs font-bold text-center">Éléments</TableHead>
                      <TableHead className="text-xs font-bold text-center">Clés</TableHead>
                      <TableHead className="text-xs font-bold text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report, idx) => {
                      const config = statusConfig[report.status] || statusConfig.DRAFT
                      const StatusIcon = config.icon
                      const isDraft = report.status === 'DRAFT'

                      return (
                        <motion.tr
                          key={report.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15, delay: idx * 0.03 }}
                          className="hover:bg-muted/30 transition-colors border-b border-border"
                        >
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="size-8 rounded-md bg-brand-50 flex items-center justify-center shrink-0">
                                <FileText className="size-4 text-brand-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                                  {report.property?.title || 'Bien sans titre'}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                  {report.property?.city}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px]">
                              {typeLabels[report.type] || report.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-[11px]', config.className)}>
                              <StatusIcon className="size-3 mr-1" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(report.createdAt)}
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {report.items?.length || 0}
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {report.totalKeys != null && report.totalKeys > 0 ? (
                              <span className="flex items-center justify-center gap-1">
                                <Key className="size-3" />
                                {report.totalKeys}
                              </span>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant={isDraft ? 'default' : 'outline'}
                              className={cn(
                                'gap-1.5 text-xs h-7',
                                isDraft &&
                                  'bg-brand-500 hover:bg-brand-600 text-white'
                              )}
                              onClick={() => handleReportClick(report)}
                            >
                              {isDraft ? (
                                <>
                                  <PenLine className="size-3" />
                                  Modifier
                                </>
                              ) : (
                                <>
                                  <Eye className="size-3" />
                                  Voir
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                  </TableBody>
                </Table>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Detail dialog for non-DRAFT reports */}
      <ReportDetailDialog
        report={detailReport}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </motion.div>
  )
}
