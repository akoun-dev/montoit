'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ClipboardCheck, BadgeCheck, Clock, AlertTriangle, FileText,
  Home, ArrowRight, Shield, Building2, CheckCircle2, XCircle,
  MessageSquare, TrendingUp, ChevronRight, User, Activity,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

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
}

interface RentalFileSummary {
  id: string
  status: string
  monthlyIncome: number | null
  employer: string | null
  createdAt: string
  tenant: { firstName: string; lastName: string; phone: string }
  documents: Array<{ type: string; status: string; name: string }>
}

interface OwnershipDocSummary {
  id: string
  type: string
  name: string
  status: string
  createdAt: string
  owner: { firstName: string; lastName: string; phone: string }
}

interface RecentActivity {
  entity: string
  action: string
  createdAt: string
}

interface ApiTcResponse {
  stats?: TcStats
  pendingRentalFiles?: RentalFileSummary[]
  pendingOwnershipDocs?: OwnershipDocSummary[]
  recentActivities?: RecentActivity[]
}

const defaultStats: TcStats = {
  pendingRentalFiles: 0,
  pendingOwnershipDocs: 0,
  pendingProperties: 0,
  totalReviewed: 0,
  overdueSlas: 0,
  slaCompliance: 100,
  pendingAgencyDocs: 0,
  pendingOwnerDocs: 0,
  rentalFilesByStatus: { SUBMITTED: 0, TC_REVIEW: 0 },
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const docTypeLabels: Record<string, string> = {
  TITRE_FONCIER: 'Titre foncier',
  ACTE_NOTARIE: 'Acte notarié',
  ATTESTATION_PROPRIETE: 'Attestation de propriété',
  RCCM: 'RCCM',
  AGREMENT: 'Agrément',
}

const actionLabels: Record<string, string> = {
  RENTAL_FILE_APPROVED: 'Dossier locatif validé',
  RENTAL_FILE_REJECTED: 'Dossier locatif rejeté',
  RENTAL_FILE_INFO_REQUESTED: 'Info demandée (dossier)',
  OWNERSHIP_DOC_APPROVED: 'Document validé',
  OWNERSHIP_DOC_REJECTED: 'Document rejeté',
  OWNERSHIP_DOC_INFO_REQUESTED: 'Info demandée (document)',
  PROPERTY_APPROVED: 'Bien approuvé',
  PROPERTY_REJECTED: 'Bien rejeté',
  INVENTORY_REPORT_CREATED: 'État des lieux créé',
  INVENTORY_REPORT_UPDATED: 'État des lieux modifié',
}

const actionIcons: Record<string, React.ElementType> = {
  RENTAL_FILE_APPROVED: CheckCircle2,
  RENTAL_FILE_REJECTED: XCircle,
  RENTAL_FILE_INFO_REQUESTED: MessageSquare,
  OWNERSHIP_DOC_APPROVED: CheckCircle2,
  OWNERSHIP_DOC_REJECTED: XCircle,
  OWNERSHIP_DOC_INFO_REQUESTED: MessageSquare,
  PROPERTY_APPROVED: CheckCircle2,
  PROPERTY_REJECTED: XCircle,
  INVENTORY_REPORT_CREATED: FileText,
  INVENTORY_REPORT_UPDATED: FileText,
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TcOverview() {
  const { user, isAuthenticated, setDashboardSection } = useAuthStore()
  const [stats, setStats] = useState<TcStats>(defaultStats)
  const [pendingRentalFiles, setPendingRentalFiles] = useState<RentalFileSummary[]>([])
  const [pendingOwnershipDocs, setPendingOwnershipDocs] = useState<OwnershipDocSummary[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const [d, pendingProps] = await Promise.all([
        authFetch<ApiTcResponse>('/api/dashboard/tc'),
        authFetch<{ pagination: { total: number } }>('/api/tc/verifications?limit=1'),
      ])

      const mergedStats: TcStats = {
        ...defaultStats,
        ...d.stats,
        pendingProperties: pendingProps.pagination?.total || 0,
      }

      setStats(mergedStats)
      setPendingRentalFiles(d.pendingRentalFiles ?? [])
      setPendingOwnershipDocs(d.pendingOwnershipDocs ?? [])
      setRecentActivities(d.recentActivities ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setStats(defaultStats)
        return
      }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setStats(defaultStats)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Bonjour, {user?.firstName} 👋</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Impossible de charger vos données. Veuillez réessayer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Main status cards ──────────────────────────────────────────────────

  const mainCards = [
    {
      id: 'rental-files-queue',
      label: 'Dossiers locataires',
      count: stats.pendingRentalFiles,
      icon: ClipboardCheck,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      hoverBg: 'hover:border-amber-300',
      breakdown: [
        { label: 'Soumis', count: stats.rentalFilesByStatus?.SUBMITTED ?? 0, color: 'text-amber-600' },
        { label: 'En revue TC', count: stats.rentalFilesByStatus?.TC_REVIEW ?? 0, color: 'text-orange-600' },
      ],
    },
    {
      id: 'owner-validations',
      label: 'Validations propriétaires',
      count: stats.pendingOwnerDocs,
      icon: BadgeCheck,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      hoverBg: 'hover:border-emerald-300',
      breakdown: [
        { label: 'Titre foncier', count: 0, color: 'text-emerald-600' },
        { label: 'Acte notarié', count: 0, color: 'text-emerald-600' },
      ],
    },
    {
      id: 'agency-validations',
      label: 'Validations agences',
      count: stats.pendingAgencyDocs,
      icon: Building2,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      hoverBg: 'hover:border-rose-300',
      breakdown: [
        { label: 'Agrément', count: 0, color: 'text-rose-600' },
        { label: 'RCCM', count: 0, color: 'text-rose-600' },
      ],
    },
  ]

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground">Bonjour, {user?.firstName} 👋</h1>
        <p className="text-muted-foreground mt-1">Espace Tiers de Confiance — Validation et contrôle</p>
      </motion.div>

      {/* ─── 3 Main Status Cards ──────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mainCards.map((card) => {
          const Icon = card.icon
          return (
            <Card
              key={card.id}
              className={cn(
                'border-2 cursor-pointer transition-all duration-200',
                card.borderColor,
                card.hoverBg,
                'hover:shadow-lg'
              )}
              onClick={() => setDashboardSection(card.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('flex size-12 items-center justify-center rounded-xl', card.bgColor)}>
                    <Icon className={cn('size-6', card.color)} />
                  </div>
                  <div className="text-right">
                    <p className={cn('text-3xl font-bold', card.color)}>{card.count}</p>
                    <p className="text-xs text-muted-foreground">en attente</p>
                  </div>
                </div>

                <h3 className="text-base font-semibold text-foreground mb-2">{card.label}</h3>

                {/* Breakdown */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {card.breakdown.map((item) => (
                    <div key={item.label} className="flex items-center gap-1 text-xs">
                      <span className={cn('font-semibold', item.color)}>{item.count}</span>
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-xs font-medium text-brand-500">
                  Voir les détails <ArrowRight className="size-3" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* ─── Secondary Stats Row ──────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Biens à vérifier */}
        <Card
          className="border-border cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setDashboardSection('property-verifications')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-brand-50">
                <Home className="size-5 text-brand-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.pendingProperties}</p>
                <p className="text-xs text-muted-foreground">Biens à vérifier</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SLA en retard */}
        <Card
          className="border-border cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setDashboardSection('sla-monitoring')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('flex size-10 items-center justify-center rounded-lg', stats.overdueSlas > 0 ? 'bg-red-50' : 'bg-green-50')}>
                <AlertTriangle className={cn('size-5', stats.overdueSlas > 0 ? 'text-red-600' : 'text-green-600')} />
              </div>
              <div>
                <p className={cn('text-2xl font-bold', stats.overdueSlas > 0 ? 'text-red-600' : 'text-green-600')}>
                  {stats.overdueSlas}
                </p>
                <p className="text-xs text-muted-foreground">SLA en retard</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dossiers traités */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50">
                <TrendingUp className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalReviewed}</p>
                <p className="text-xs text-muted-foreground">Dossiers traités</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SLA Compliance */}
        <Card
          className="border-border cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setDashboardSection('sla-monitoring')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-brand-50">
                <Shield className="size-5 text-brand-500" />
              </div>
              <div>
                <p className={cn('text-2xl font-bold', stats.slaCompliance >= 90 ? 'text-green-600' : stats.slaCompliance >= 70 ? 'text-amber-600' : 'text-red-600')}>
                  {stats.slaCompliance}%
                </p>
                <p className="text-xs text-muted-foreground">Conformité SLA</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── SLA Compliance Bar ─────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-brand-50 shrink-0">
                  <Shield className="size-5 text-brand-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Conformité SLA</p>
                  <p className="text-xs text-muted-foreground">Objectif : 100% sous 48h</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {stats.slaCompliance >= 90 ? (
                  <Badge className="bg-green-100 text-green-700">✓ Conforme</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700">⚠ En dessous</Badge>
                )}
                <span className="text-2xl font-bold text-foreground">{stats.slaCompliance}%</span>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  stats.slaCompliance >= 90 ? 'bg-green-500' : stats.slaCompliance >= 70 ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ width: `${stats.slaCompliance}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Quick Action: Property Verifications ────────────────────────────── */}
      {stats.pendingProperties > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-brand-200 bg-brand-50/30">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-brand-500 text-white shrink-0">
                  <Home className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{stats.pendingProperties} bien(s) en attente de vérification</p>
                  <p className="text-xs text-muted-foreground">Ces annonces nécessitent votre validation avant publication</p>
                </div>
              </div>
              <Button
                onClick={() => setDashboardSection('property-verifications')}
                className="bg-brand-500 hover:bg-brand-600 text-white shrink-0"
              >
                Vérifier
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Two-column layout: Recent items + Activities ──────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Rental Files */}
        <motion.div variants={itemVariants}>
          <Card className="border-border h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Dossiers locataires récents</CardTitle>
                  <CardDescription>{pendingRentalFiles.length} en attente de validation</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-brand-500 gap-1" onClick={() => setDashboardSection('rental-files-queue')}>
                  Voir tout <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-72 overflow-y-auto">
              {pendingRentalFiles.length === 0 ? (
                <div className="py-8 text-center">
                  <ClipboardCheck className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun dossier en attente</p>
                </div>
              ) : (
                pendingRentalFiles.slice(0, 5).map((rf) => (
                  <div
                    key={rf.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setDashboardSection('rental-files-queue')}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                        <User className="size-4 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {rf.tenant.firstName} {rf.tenant.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{rf.documents.length} document(s)</p>
                      </div>
                    </div>
                    <Badge className={rf.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'}>
                      {rf.status === 'SUBMITTED' ? 'Soumis' : 'En revue TC'}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activities */}
        <motion.div variants={itemVariants}>
          <Card className="border-border h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Activité récente</CardTitle>
                  <CardDescription>Vos dernières actions de vérification</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-brand-500 gap-1" onClick={() => setDashboardSection('history')}>
                  Historique <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-72 overflow-y-auto">
              {recentActivities.length === 0 ? (
                <div className="py-8 text-center">
                  <Activity className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune activité récente</p>
                </div>
              ) : (
                recentActivities.map((activity, idx) => {
                  const Icon = actionIcons[activity.action] || FileText
                  const label = actionLabels[activity.action] || activity.action
                  const isApproved = activity.action.includes('APPROVED')
                  const isRejected = activity.action.includes('REJECTED')
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <div className={cn(
                        'size-8 rounded-full flex items-center justify-center shrink-0',
                        isApproved ? 'bg-green-50' : isRejected ? 'bg-red-50' : 'bg-amber-50'
                      )}>
                        <Icon className={cn(
                          'size-4',
                          isApproved ? 'text-green-600' : isRejected ? 'text-red-600' : 'text-amber-600'
                        )} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Pending Ownership Docs ──────────────────────────────────────────── */}
      {pendingOwnershipDocs.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Documents propriétaire en attente</CardTitle>
                  <CardDescription>{pendingOwnershipDocs.length} document(s) à valider</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-brand-500 gap-1" onClick={() => setDashboardSection('owner-validations')}>
                  Voir tout <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-48 overflow-y-auto">
              {pendingOwnershipDocs.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => setDashboardSection('owner-validations')}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <BadgeCheck className="size-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.owner.firstName} {doc.owner.lastName} · {docTypeLabels[doc.type] || doc.type}</p>
                    </div>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">En attente</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Quick Links ─────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Accès rapide</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'property-verifications', label: 'Vérification biens', icon: Home, color: 'bg-brand-50 text-brand-600' },
                { id: 'inventory-reports', label: 'État des lieux', icon: FileText, color: 'bg-amber-50 text-amber-600' },
                { id: 'sla-monitoring', label: 'Suivi SLA', icon: Clock, color: 'bg-emerald-50 text-emerald-600' },
                { id: 'history', label: 'Historique', icon: Activity, color: 'bg-rose-50 text-rose-600' },
              ].map((link) => {
                const Icon = link.icon
                return (
                  <button
                    key={link.id}
                    onClick={() => setDashboardSection(link.id)}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent hover:shadow-sm transition-all"
                  >
                    <div className={cn('flex size-10 items-center justify-center rounded-lg', link.color)}>
                      <Icon className="size-5" />
                    </div>
                    <span className="text-xs font-medium text-foreground text-center">{link.label}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
