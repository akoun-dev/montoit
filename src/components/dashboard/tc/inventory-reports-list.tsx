'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileText, Eye, ArrowRight, Calendar, CheckCircle2, Clock, PenLine, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface InventoryReport {
  id: string
  propertyId: string
  type: 'INVENTORY_ENTRANCE' | 'INVENTORY_EXIT'
  status: 'DRAFT' | 'COMPLETED' | 'SIGNED_OWNER' | 'SIGNED_TENANT' | 'SIGNED_BOTH'
  totalKeys: number
  generalObservations: string
  createdAt: string
  updatedAt: string
  property: {
    title: string
    commune: string
    type: string
  }
  items: Array<{
    designation: string
    room: string
    condition: string | null
    keyCount: number | null
    observation: string
  }>
}

interface ReportsResponse {
  reports: InventoryReport[]
  total: number
}

const typeLabels: Record<string, string> = {
  INVENTORY_ENTRANCE: 'Entrée des lieux',
  INVENTORY_EXIT: 'Sortie des lieux',
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  DRAFT: {
    label: 'Brouillon',
    className: 'bg-gray-100 text-gray-700',
    icon: PenLine,
  },
  COMPLETED: {
    label: 'Complété',
    className: 'bg-amber-100 text-amber-700',
    icon: Clock,
  },
  SIGNED_OWNER: {
    label: 'Signé propriétaire',
    className: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle2,
  },
  SIGNED_TENANT: {
    label: 'Signé locataire',
    className: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle2,
  },
  SIGNED_BOTH: {
    label: 'Signé par les deux',
    className: 'bg-green-100 text-green-700',
    icon: ShieldCheck,
  },
}

export function InventoryReportsList() {
  const { isAuthenticated, setSelectedItemId, setDashboardSection } = useAuthStore()
  const [reports, setReports] = useState<InventoryReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'ALL' | 'INVENTORY_ENTRANCE' | 'INVENTORY_EXIT'>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

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

  const handleViewReport = (report: InventoryReport) => {
    // For DRAFT reports, allow editing
    if (report.status === 'DRAFT') {
      setSelectedItemId(report.propertyId)
      setDashboardSection('inventory-report-form')
    } else {
      // For completed/signed reports, show a toast with info (or could navigate to a read-only view)
      toast.info(`Rapport "${report.property.title}" — ${statusConfig[report.status]?.label || report.status}`)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Rapports d&apos;état des lieux</h1>
        <p className="text-muted-foreground mt-1">Consultez et gérez les rapports existants</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
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

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground mr-1">Statut:</span>
          {(['ALL', 'DRAFT', 'COMPLETED', 'SIGNED_OWNER', 'SIGNED_TENANT', 'SIGNED_BOTH'] as const).map((status) => (
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

      {/* Count */}
      <Badge variant="secondary" className="bg-brand-50 text-brand-700">
        {reports.length} rapport{reports.length !== 1 ? 's' : ''}
      </Badge>

      {/* Empty state */}
      {reports.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <FileText className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Aucun rapport d&apos;état des lieux</p>
            <p className="text-sm text-muted-foreground mt-1">Les rapports créés apparaîtront ici</p>
          </CardContent>
        </Card>
      ) : (
        /* Report cards */
        <div className="space-y-4">
          {reports.map((report, idx) => {
            const config = statusConfig[report.status] || statusConfig.DRAFT
            const StatusIcon = config.icon

            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
              >
                <Card className="border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left — Report info */}
                      <div className="flex items-start gap-3 flex-1">
                        <div className="size-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="size-5 text-brand-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {report.property?.title || 'Bien sans titre'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <Badge variant="outline" className="text-[11px]">
                              {typeLabels[report.type] || report.type}
                            </Badge>
                            <Badge className={cn('text-[11px]', config.className)}>
                              <StatusIcon className="size-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              Créé le {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                            <span>
                              {report.items?.length || 0} élément(s)
                            </span>
                            {report.totalKeys > 0 && (
                              <span>
                                🔑 {report.totalKeys} clé(s)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right — Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => handleViewReport(report)}
                        >
                          <Eye className="size-4" />
                          {report.status === 'DRAFT' ? 'Modifier' : 'Voir'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
