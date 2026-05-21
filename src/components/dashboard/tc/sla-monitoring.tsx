'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Clock, AlertTriangle, CheckCircle2, TrendingUp,
  ClipboardCheck, BadgeCheck, Home, BarChart3, Activity,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimeValidationSlas } from '@/hooks/use-realtime-validation-slas'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AuditBreakdown {
  validated: number
  rejected: number
  infoRequested: number
}

interface OverdueSla {
  id: string
  entityType: string
  entityId: string
  submittedAt: string
  deadlineAt: string
  daysOverdue: number
}

interface TcStats {
  pendingRentalFiles: number
  pendingOwnershipDocs: number
  pendingProperties: number
  totalReviewed: number
  overdueSlas: number
  slaCompliance: number
  pendingAgencyDocs: number
  pendingOwnerDocs: number
  rentalFilesByStatus: {
    SUBMITTED: number
    TC_REVIEW: number
  }
  auditBreakdown: AuditBreakdown
}

const defaultStats: TcStats = {
  pendingRentalFiles: 0,
  pendingOwnershipDocs: 0,
  pendingProperties: 0,
  totalReviewed: 0,
  overdueSlas: 0,
  slaCompliance: 0,
  pendingAgencyDocs: 0,
  pendingOwnerDocs: 0,
  rentalFilesByStatus: { SUBMITTED: 0, TC_REVIEW: 0 },
  auditBreakdown: { validated: 0, rejected: 0, infoRequested: 0 },
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const entityTypeLabels: Record<string, string> = {
  RENTAL_FILE: 'Dossier locataire',
  OWNER_PROFILE: 'Profil propriétaire',
  AGENCY: 'Agence',
}

const entityTypeColors: Record<string, string> = {
  RENTAL_FILE: 'bg-amber-100 text-amber-700',
  OWNER_PROFILE: 'bg-emerald-100 text-emerald-700',
  AGENCY: 'bg-rose-100 text-rose-700',
}

export function SlaMonitoring() {
  const { user, isAuthenticated, setDashboardSection } = useAuthStore()
  const [stats, setStats] = useState<TcStats>(defaultStats)
  const [overdueList, setOverdueList] = useState<OverdueSla[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<{
        stats?: TcStats
        overdueSlasList?: OverdueSla[]
      }>('/api/dashboard/tc')
      setStats(d.stats || defaultStats)
      setOverdueList(d.overdueSlasList || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setStats(defaultStats)
        return
      }
      setStats(defaultStats)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useRealtimeValidationSlas({
    userId: user?.id,
    watchAll: true,
    onValidationSlaChange: () => { fetchData() },
  })

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  const totalPending = stats.pendingRentalFiles + stats.pendingOwnershipDocs + stats.pendingProperties
  const approvalRate = stats.totalReviewed > 0 ? Math.round(((stats.totalReviewed - stats.overdueSlas) / stats.totalReviewed) * 100) : 100

  // Audit breakdown totals
  const totalAuditActions = stats.auditBreakdown.validated + stats.auditBreakdown.rejected + stats.auditBreakdown.infoRequested

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Suivi SLA & Statistiques</h1>
        <p className="text-muted-foreground mt-1">Respect des délais de traitement et indicateurs de performance</p>
      </motion.div>

      {/* SLA Compliance - Main Card */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-brand-50 shrink-0">
                  <BarChart3 className="size-6 text-brand-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Conformité SLA</h2>
                  <p className="text-sm text-muted-foreground">Objectif : 100% des dossiers traités sous 48h</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {stats.slaCompliance >= 90 ? (
                  <Badge className="bg-green-100 text-green-700">✓ Conforme</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700">⚠ En dessous</Badge>
                )}
                <span className={cn(
                  'text-3xl font-bold',
                  stats.slaCompliance >= 90 ? 'text-green-600' : stats.slaCompliance >= 70 ? 'text-amber-600' : 'text-red-600'
                )}>
                  {stats.slaCompliance}%
                </span>
              </div>
            </div>
            <Progress value={stats.slaCompliance} className="h-3" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Performance Metrics */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex size-9 sm:size-10 items-center justify-center rounded-lg bg-amber-50 shrink-0">
                <Clock className="size-4 sm:size-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-foreground">{totalPending}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total en attente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex size-9 sm:size-10 items-center justify-center rounded-lg bg-green-50 shrink-0">
                <TrendingUp className="size-4 sm:size-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.totalReviewed}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Dossiers traités</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex size-9 sm:size-10 items-center justify-center rounded-lg bg-emerald-50 shrink-0">
                <CheckCircle2 className="size-4 sm:size-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className={cn('text-xl sm:text-2xl font-bold', approvalRate >= 90 ? 'text-green-600' : 'text-amber-600')}>
                  {approvalRate}%
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Taux d&apos;approbation</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn('flex size-9 sm:size-10 items-center justify-center rounded-lg shrink-0', stats.overdueSlas > 0 ? 'bg-red-50' : 'bg-green-50')}>
                <AlertTriangle className={cn('size-4 sm:size-5', stats.overdueSlas > 0 ? 'text-red-600' : 'text-green-600')} />
              </div>
              <div className="min-w-0">
                <p className={cn('text-xl sm:text-2xl font-bold', stats.overdueSlas > 0 ? 'text-red-600' : 'text-green-600')}>
                  {stats.overdueSlas}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">SLA dépassés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Audit Breakdown (US-TA-062) ─────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Répartition des actions</CardTitle>
          </CardHeader>
          <CardContent>
            {totalAuditActions === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune action enregistrée</p>
            ) : (
              <div className="space-y-4">
                {/* Breakdown cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-center">
                    <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.auditBreakdown.validated}</p>
                    <p className="text-xs text-green-700 font-medium">Validés</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
                    <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.auditBreakdown.rejected}</p>
                    <p className="text-xs text-red-700 font-medium">Rejetés</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                    <p className="text-xl sm:text-2xl font-bold text-amber-600">{stats.auditBreakdown.infoRequested}</p>
                    <p className="text-xs text-amber-700 font-medium">Info demandée</p>
                  </div>
                </div>

                {/* Stacked bar */}
                <div className="h-4 rounded-full bg-muted overflow-hidden flex">
                  {stats.auditBreakdown.validated > 0 && (
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: totalAuditActions > 0 ? `${(stats.auditBreakdown.validated / totalAuditActions) * 100}%` : '0%' }}
                    />
                  )}
                  {stats.auditBreakdown.rejected > 0 && (
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{ width: totalAuditActions > 0 ? `${(stats.auditBreakdown.rejected / totalAuditActions) * 100}%` : '0%' }}
                    />
                  )}
                  {stats.auditBreakdown.infoRequested > 0 && (
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: totalAuditActions > 0 ? `${(stats.auditBreakdown.infoRequested / totalAuditActions) * 100}%` : '0%' }}
                    />
                  )}
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <div className="size-2.5 rounded-full bg-green-500" /> Validés
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="size-2.5 rounded-full bg-red-500" /> Rejetés
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="size-2.5 rounded-full bg-amber-500" /> Info demandée
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Breakdown by Category */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Répartition par catégorie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dossiers locataires */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="size-4 text-amber-600" />
                  <span className="text-sm font-medium text-foreground">Dossiers locataires</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{stats.pendingRentalFiles}</span>
                  <span className="text-xs text-muted-foreground">en attente</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: totalPending > 0 ? `${(stats.pendingRentalFiles / totalPending) * 100}%` : '0%' }} />
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">{stats.rentalFilesByStatus?.SUBMITTED ?? 0}</Badge>
                  Soumis
                </span>
                <span className="flex items-center gap-1">
                  <Badge className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0">{stats.rentalFilesByStatus?.TC_REVIEW ?? 0}</Badge>
                  En revue TC
                </span>
              </div>
            </div>

            {/* Validations propriétaires */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="size-4 text-emerald-600" />
                  <span className="text-sm font-medium text-foreground">Validations propriétaires</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{stats.pendingOwnerDocs}</span>
                  <span className="text-xs text-muted-foreground">en attente</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: totalPending > 0 ? `${(stats.pendingOwnerDocs / totalPending) * 100}%` : '0%' }} />
              </div>
            </div>

            {/* Validations agences */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="size-4 text-rose-600" />
                  <span className="text-sm font-medium text-foreground">Validations agences</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{stats.pendingAgencyDocs}</span>
                  <span className="text-xs text-muted-foreground">en attente</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-rose-500 transition-all"
                  style={{ width: totalPending > 0 ? `${(stats.pendingAgencyDocs / totalPending) * 100}%` : '0%' }} />
              </div>
            </div>

            {/* Vérification biens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-brand-500" />
                  <span className="text-sm font-medium text-foreground">Vérification biens</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{stats.pendingProperties}</span>
                  <span className="text-xs text-muted-foreground">en attente</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: totalPending > 0 ? `${(stats.pendingProperties / totalPending) * 100}%` : '0%' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Overdue Dossier List (US-TA-094) ─────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="size-4 text-red-600" />
                Dossiers en retard SLA
              </CardTitle>
              <Badge className="bg-red-100 text-red-700">{overdueList.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {overdueList.length === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="size-10 text-green-500/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucun dossier en retard — félicitations !</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {overdueList.map((sla) => (
                  <div key={sla.id} className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-red-100 shrink-0">
                        <AlertTriangle className="size-4 text-red-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge className={cn('text-[10px] px-1.5 py-0', entityTypeColors[sla.entityType] || 'bg-gray-100 text-gray-600')}>
                            {entityTypeLabels[sla.entityType] || sla.entityType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Soumis : {new Date(sla.submittedAt).toLocaleDateString('fr-FR')}</span>
                          <span>Deadline : {new Date(sla.deadlineAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-center">
                        <p className="text-lg font-bold text-red-600">{sla.daysOverdue}</p>
                        <p className="text-[10px] text-red-500">jours</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-brand-500 hover:text-brand-600 hover:bg-brand-50 h-8 w-8 p-0"
                        onClick={() => {
                          // Navigate to relevant section based on entity type
                          if (sla.entityType === 'RENTAL_FILE') {
                            setDashboardSection('rental-files-queue')
                          } else if (sla.entityType === 'OWNER_PROFILE') {
                            setDashboardSection('owner-validations')
                          } else if (sla.entityType === 'AGENCY') {
                            setDashboardSection('agency-validations')
                          }
                        }}
                        title="Aller au dossier"
                      >
                        <ExternalLink className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Performance Indicators */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Indicateurs de performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Délai moyen de traitement</span>
              <Badge variant="outline" className="text-xs">
                {stats.slaCompliance >= 90 ? '< 48h' : stats.slaCompliance >= 70 ? '48-72h' : '> 72h'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Taux de conformité SLA</span>
              <span className={cn('text-sm font-bold', stats.slaCompliance >= 90 ? 'text-green-600' : 'text-amber-600')}>
                {stats.slaCompliance}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Taux d&apos;approbation</span>
              <span className={cn('text-sm font-bold', approvalRate >= 80 ? 'text-green-600' : 'text-amber-600')}>
                {approvalRate}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">SLA en retard</span>
              <span className={cn('text-sm font-bold', stats.overdueSlas > 0 ? 'text-red-600' : 'text-green-600')}>
                {stats.overdueSlas}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Volume de travail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dossiers traités (total)</span>
              <span className="text-sm font-bold text-foreground">{stats.totalReviewed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">En attente (total)</span>
              <span className="text-sm font-bold text-foreground">{totalPending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dossiers locataires</span>
              <span className="text-sm font-bold text-amber-600">{stats.pendingRentalFiles}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Docs propriétaire</span>
              <span className="text-sm font-bold text-emerald-600">{stats.pendingOwnerDocs}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Docs agences</span>
              <span className="text-sm font-bold text-rose-600">{stats.pendingAgencyDocs}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Biens à vérifier</span>
              <span className="text-sm font-bold text-brand-500">{stats.pendingProperties}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
