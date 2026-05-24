'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  FolderOpen, User, Home, Building2,
  ClipboardCheck, Check, Clock,
  ArrowRight, Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { RentalFilesQueue } from './rental-files-queue'
import { OwnerValidations } from './owner-validations'
import { AgencyValidations } from './agency-validations'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TcStats {
  pendingRentalFiles: number
  pendingOwnerDocs: number
  pendingAgencyDocs: number
  pendingProperties: number
  totalReviewed: number
  overdueSlas: number
  slaCompliance: number
  rentalFilesByStatus: { SUBMITTED: number; TC_REVIEW: number }
  pendingOwnerDocsByType?: { TITRE_FONCIER: number; ACTE_NOTARIE: number; ATTESTATION_PROPRIETE: number }
  pendingAgencyDocsByType?: { AGREMENT: number; RCCM: number }
}

interface PendingRentalFile {
  id: string
  status: string
  monthlyIncome: number | null
  employer: string | null
  createdAt: string
  tenant: { firstName: string; lastName: string; phone: string }
  documents: Array<{ type: string; status: string; name: string }>
}

interface PendingOwnershipDoc {
  id: string
  type: string
  name: string
  status: string
  createdAt: string
  owner: { firstName: string; lastName: string; phone: string }
}

interface ApiTcResponse {
  stats?: TcStats
  pendingRentalFiles?: PendingRentalFile[]
  pendingOwnershipDocs?: PendingOwnershipDoc[]
}

const defaultStats: TcStats = {
  pendingRentalFiles: 0,
  pendingOwnerDocs: 0,
  pendingAgencyDocs: 0,
  pendingProperties: 0,
  totalReviewed: 0,
  overdueSlas: 0,
  slaCompliance: 100,
  rentalFilesByStatus: { SUBMITTED: 0, TC_REVIEW: 0 },
  pendingOwnerDocsByType: { TITRE_FONCIER: 0, ACTE_NOTARIE: 0, ATTESTATION_PROPRIETE: 0 },
  pendingAgencyDocsByType: { AGREMENT: 0, RCCM: 0 },
}

// ─── Category config ────────────────────────────────────────────────────────

type CategoryKey = 'locataire' | 'proprietaire' | 'agence'

const categoryConfig: Record<CategoryKey, {
  label: string
  icon: typeof User
  color: string
  bgColor: string
  dotColor: string
  hoverBorder: string
  borderColor: string
  tab: CategoryKey
}> = {
  locataire: {
    label: 'Dossiers locataires',
    icon: User,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    dotColor: 'bg-amber-400',
    hoverBorder: 'hover:border-amber-300',
    borderColor: 'border-amber-200',
    tab: 'locataire',
  },
  proprietaire: {
    label: 'Validations propriétaires',
    icon: Home,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    dotColor: 'bg-emerald-400',
    hoverBorder: 'hover:border-emerald-300',
    borderColor: 'border-emerald-200',
    tab: 'proprietaire',
  },
  agence: {
    label: 'Validations agences',
    icon: Building2,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    dotColor: 'bg-rose-400',
    hoverBorder: 'hover:border-rose-300',
    borderColor: 'border-rose-200',
    tab: 'agence',
  },
}

interface RecentItem {
  id: string
  category: CategoryKey
  displayName: string
  detail: string
  createdAt: string
}

const docTypeShortLabels: Record<string, string> = {
  TITRE_FONCIER: 'Titre foncier',
  ACTE_NOTARIE: 'Acte notarié',
  ATTESTATION_PROPRIETE: 'Attestation',
  RCCM: 'RCCM',
  AGREMENT: 'Agrément',
  SUBMITTED: 'Soumis',
  TC_REVIEW: 'En revue',
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DossierValidations() {
  const { isAuthenticated } = useAuthStore()
  const [tab, setTab] = useState('locataire')
  const [stats, setStats] = useState<TcStats>(defaultStats)
  const [pendingRentalFiles, setPendingRentalFiles] = useState<PendingRentalFile[]>([])
  const [pendingOwnershipDocs, setPendingOwnershipDocs] = useState<PendingOwnershipDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // ─── Fetch aggregated data ──────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    try {
      const d = await authFetch<ApiTcResponse>('/api/dashboard/tc')
      setStats(prev => ({ ...prev, ...d.stats }))
      setPendingRentalFiles(d.pendingRentalFiles ?? [])
      setPendingOwnershipDocs(d.pendingOwnershipDocs ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      console.error('Erreur chargement stats:', err)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Derived data ───────────────────────────────────────────────────────

  const pendingOwnerDocs = pendingOwnershipDocs.filter(
    d => !['AGREMENT', 'RCCM'].includes(d.type)
  )
  const pendingAgencyDocs = pendingOwnershipDocs.filter(
    d => ['AGREMENT', 'RCCM'].includes(d.type)
  )

  const totalPending = stats.pendingRentalFiles + stats.pendingOwnerDocs + stats.pendingAgencyDocs

  const tabs = [
    { value: 'locataire', label: 'Locataires', icon: User, count: stats.pendingRentalFiles },
    { value: 'proprietaire', label: 'Propriétaires', icon: Home, count: stats.pendingOwnerDocs },
    { value: 'agence', label: 'Agences', icon: Building2, count: stats.pendingAgencyDocs },
  ]

  // ─── Quick action handlers ──────────────────────────────────────────────

  const handleQuickValidate = async (category: string, id: string) => {
    setActionLoading(id)
    try {
      if (category === 'locataire') {
        await authFetch('/api/tc/rental-files', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileIds: [id], action: 'APPROVE', comment: '' }),
        })
      } else {
        await authFetch('/api/tc/ownership-docs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docIds: [id], action: 'APPROVE', comment: '' }),
        })
      }
      toast.success('Document validé avec succès')
      fetchData()
    } catch {
      toast.error('Erreur lors de la validation')
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
        <div className="h-10 rounded-xl bg-muted animate-pulse" />
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* ─── Header Card (intégré avec les stats, catégories, feed et SLA) ─── */}
      <Card className="border-border bg-gradient-to-br from-brand-500/5 via-transparent to-transparent overflow-hidden">
        {/* Top section: icon + title + badges */}
        <CardContent className="p-4 sm:p-6 pb-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-brand-100 shrink-0">
              <FolderOpen className="size-6 text-brand-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dossiers de validation</h1>
              <p className="text-muted-foreground text-sm">Validez et suivez les dossiers locataires, propriétaires et agences</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 border text-[10px]">
                  <ClipboardCheck className="size-3 mr-0.5" /> {totalPending} en attente
                </Badge>
                <Badge className={cn(
                  'border text-[10px]',
                  stats.overdueSlas > 0
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-green-50 text-green-700 border-green-200'
                )}>
                  <Clock className="size-3 mr-0.5" />
                  {stats.overdueSlas} SLA dépassé{stats.overdueSlas > 1 ? 's' : ''}
                </Badge>
                <Badge className="bg-brand-50 text-brand-700 border-brand-200 border text-[10px]">
                  {stats.slaCompliance}% conformité
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Integrated content: 3 category cards */}
        <CardContent className="px-4 sm:px-6 pb-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.entries(categoryConfig) as [keyof typeof categoryConfig, typeof categoryConfig['locataire']][]).map(([key, cfg]) => {
              const Icon = cfg.icon
              const count = key === 'locataire'
                ? stats.pendingRentalFiles
                : key === 'proprietaire'
                  ? stats.pendingOwnerDocs
                  : stats.pendingAgencyDocs
              return (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md',
                    cfg.borderColor, cfg.hoverBorder, 'bg-white/60'
                  )}
                  onClick={() => setTab(cfg.tab)}
                >
                  <div className={cn('flex size-10 items-center justify-center rounded-lg shrink-0', cfg.bgColor)}>
                    <Icon className={cn('size-5', cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground truncate">{cfg.label}</span>
                      <span className={cn('text-lg font-bold ml-2', cfg.color)}>{count}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-brand-500 mt-0.5">
                      Voir <ArrowRight className="size-3" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>

        {/* Recent feed (compact) — max 3 items typesafe */}
        <CardContent className="px-4 sm:px-6 pb-0 pt-3">
          {(() => {
            const recentItems: RecentItem[] = [
              ...pendingRentalFiles.slice(0, 2).map(rf => ({
                id: rf.id,
                category: 'locataire' as CategoryKey,
                displayName: `${rf.tenant.firstName} ${rf.tenant.lastName}`,
                detail: 'Dossier locataire',
                createdAt: rf.createdAt,
              })),
              ...pendingOwnerDocs.slice(0, 1).map(doc => ({
                id: doc.id,
                category: 'proprietaire' as CategoryKey,
                displayName: `${doc.owner.firstName} ${doc.owner.lastName}`,
                detail: docTypeShortLabels[doc.type] || doc.type,
                createdAt: doc.createdAt,
              })),
              ...pendingAgencyDocs.slice(0, 1).map(doc => ({
                id: doc.id,
                category: 'agence' as CategoryKey,
                displayName: `${doc.owner.firstName} ${doc.owner.lastName}`,
                detail: docTypeShortLabels[doc.type] || doc.type,
                createdAt: doc.createdAt,
              })),
            ].slice(0, 3)

            if (recentItems.length === 0) {
              return (
                <div className="py-3 text-center">
                  <p className="text-xs text-muted-foreground">Aucun dossier en attente ✅</p>
                </div>
              )
            }

            return (
              <>
                {recentItems.map((item) => {
                  const cfg = categoryConfig[item.category]
                  const Icon = cfg.icon
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2.5 py-2 border-b border-border/40 last:border-b-0 group"
                    >
                      <div className={cn('flex size-7 items-center justify-center rounded-md shrink-0', cfg.bgColor)}>
                        <Icon className={cn('size-3.5', cfg.color)} />
                      </div>
                      <span className={cn('size-1.5 rounded-full shrink-0', cfg.dotColor)} />
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground truncate">
                          {item.displayName}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                          {item.detail}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 hidden xs:inline">
                        {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={actionLoading === item.id}
                        onClick={(e) => { e.stopPropagation(); handleQuickValidate(item.category, item.id) }}
                        title="Valider"
                      >
                        {actionLoading === item.id
                          ? <Loader2 className="size-3 animate-spin" />
                          : <Check className="size-3" />
                        }
                      </Button>
                    </div>
                  )
                })}
                {totalPending > 3 && (
                  <div className="text-[10px] text-muted-foreground text-center pt-1.5 pb-0.5">
                    +{totalPending - 3} autre{totalPending - 3 > 1 ? 's' : ''} dossier{totalPending - 3 > 1 ? 's' : ''} en attente
                  </div>
                )}
              </>
            )
          })()}
        </CardContent>

        {/* SLA bar at the bottom */}
        <CardContent className="p-4 sm:p-6 pt-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <ClipboardCheck className="size-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium">SLA</span>
            </div>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  stats.slaCompliance >= 90 ? 'bg-green-500' : stats.slaCompliance >= 70 ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ width: `${stats.slaCompliance}%` }}
              />
            </div>
            <span className={cn(
              'text-[10px] font-bold shrink-0',
              stats.slaCompliance >= 90 ? 'text-green-600' : stats.slaCompliance >= 70 ? 'text-amber-600' : 'text-red-600'
            )}>
              {stats.slaCompliance}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ─── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto -mx-1 pb-1">
          <TabsList className="w-max sm:w-auto inline-flex sm:grid sm:grid-cols-3 gap-1 min-w-full sm:min-w-0">
            {tabs.map((t) => {
              const Icon = t.icon
              const isActive = tab === t.value
              return (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-4 relative"
                >
                  <Icon className="size-3.5 sm:size-4 shrink-0" />
                  <span>{t.label}</span>
                  <Badge
                    className={cn(
                      'text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {t.count}
                  </Badge>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        <TabsContent value="locataire" className="mt-6">
          <RentalFilesQueue showHeaderAndStats={false} />
        </TabsContent>

        <TabsContent value="proprietaire" className="mt-6">
          <OwnerValidations showHeaderAndStats={false} />
        </TabsContent>

        <TabsContent value="agence" className="mt-6">
          <AgencyValidations showHeaderAndStats={false} />
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
