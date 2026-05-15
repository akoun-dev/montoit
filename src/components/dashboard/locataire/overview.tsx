'use client'

import { useEffect, useState, useCallback } from 'react'
import { FileText, Eye, FileSignature, MessageSquare, ShieldCheck, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

interface DashboardData {
  stats: {
    totalRentalFiles: number
    activeLeases: number
    pendingVisits: number
    unreadMessages: number
  }
  rentalFiles: Array<{
    id: string
    status: string
    monthlyIncome: number | null
    createdAt: string
    documents: Array<{ status: string }>
  }>
  visitRequests: Array<{
    id: string
    status: string
    requestedDate: string
    timeSlot: string
    property: { title: string; city: string; images: Array<{ url: string }> }
  }>
  activeLeases: Array<{
    id: string
    monthlyRent: number
    startDate: string
    endDate: string
    property: { title: string; images: Array<{ url: string }> }
    owner: { firstName: string; lastName: string }
  }>
}

interface ApiDashboardResponse {
  stats?: Partial<DashboardData['stats']>
  rentalFiles?: DashboardData['rentalFiles']
  visitRequests?: DashboardData['visitRequests']
  activeLeases?: DashboardData['activeLeases']
}

interface ScoringSummary {
  score: number
  statusLabel: string
  statusColor: string
  status: string
  breakdown: {
    profile: { score: number; max: number; weight: number }
    neoface: { score: number; max: number; weight: number; verified: boolean }
    oneci: { score: number; max: number; weight: number; verified: boolean }
    rentalFile: { score: number; max: number; weight: number; approved: boolean; hasFile: boolean }
  }
}

const defaultData: DashboardData = {
  stats: { totalRentalFiles: 0, activeLeases: 0, pendingVisits: 0, unreadMessages: 0 },
  rentalFiles: [],
  visitRequests: [],
  activeLeases: [],
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Brouillon', className: 'bg-neutral-100 text-neutral-700' },
    SUBMITTED: { label: 'Soumis', className: 'bg-blue-100 text-blue-700' },
    TC_REVIEW: { label: 'En revue TC', className: 'bg-amber-100 text-amber-700' },
    VALIDATED: { label: 'Validé', className: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Rejeté', className: 'bg-red-100 text-red-700' },
    PENDING: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
    ACCEPTED: { label: 'Accepté', className: 'bg-green-100 text-green-700' },
    COMPLETED: { label: 'Complété', className: 'bg-blue-100 text-blue-700' },
    ACTIVE: { label: 'Actif', className: 'bg-green-100 text-green-700' },
  }
  const c = config[status] || { label: status, className: 'bg-neutral-100 text-neutral-700' }
  return <Badge className={c.className}>{c.label}</Badge>
}

export function LocataireOverview() {
  const { user, isAuthenticated, setDashboardSection } = useAuthStore()
  const [data, setData] = useState<DashboardData>(defaultData)
  const [scoring, setScoring] = useState<ScoringSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const [dashboardResult, scoringResult] = await Promise.allSettled([
        authFetch<ApiDashboardResponse>('/api/dashboard/locataire'),
        authFetch<ScoringSummary>('/api/scoring'),
      ])

      if (dashboardResult.status === 'fulfilled') {
        const d = dashboardResult.value
        setData({
          stats: { ...defaultData.stats, ...d.stats },
          rentalFiles: d.rentalFiles ?? [],
          visitRequests: d.visitRequests ?? [],
          activeLeases: d.activeLeases ?? [],
        })
      }

      if (scoringResult.status === 'fulfilled') {
        setScoring(scoringResult.value)
      }
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setData(defaultData)
        return
      }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setData(defaultData)
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
          <div key={i} className="h-32 rounded-xl bg-neutral-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-neutral-900">Bonjour, {user?.firstName} 👋</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Impossible de charger vos données. Veuillez réessayer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = [
    { label: 'Dossiers locatifs', value: data.stats.totalRentalFiles, icon: FileText, color: 'text-blue-600 bg-blue-50' },
    { label: 'Baux actifs', value: data.stats.activeLeases, icon: FileSignature, color: 'text-green-600 bg-green-50' },
    { label: 'Visites en attente', value: data.stats.pendingVisits, icon: Eye, color: 'text-amber-600 bg-amber-50' },
    { label: 'Messages non lus', value: data.stats.unreadMessages, icon: MessageSquare, color: 'text-brand-600 bg-brand-50' },
  ]

  // Scoring status colors
  const scoreColor = scoring?.statusColor === 'emerald' ? '#10b981' : scoring?.statusColor === 'amber' ? '#f59e0b' : '#ef4444'
  const scoreBgClass = scoring?.statusColor === 'emerald'
    ? 'from-emerald-50 to-white border-emerald-100'
    : scoring?.statusColor === 'amber'
      ? 'from-amber-50 to-white border-amber-100'
      : 'from-red-50/50 to-white border-red-100'
  const scoreTextClass = scoring?.statusColor === 'emerald'
    ? 'text-emerald-600'
    : scoring?.statusColor === 'amber'
      ? 'text-amber-600'
      : 'text-red-500'
  const scoreBadgeClass = scoring?.statusColor === 'emerald'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : scoring?.statusColor === 'amber'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-red-50 text-red-600 border-red-200'

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-neutral-900">
          Bonjour, {user?.firstName} 👋
        </h1>
        <p className="text-neutral-500 mt-1">Voici un aperçu de votre espace locataire</p>
      </motion.div>

      {/* Trust Score Mini Card — prominent at top */}
      {scoring && (
        <motion.div variants={itemVariants}>
          <Card className={`border bg-gradient-to-r ${scoreBgClass} cursor-pointer hover:shadow-md transition-all group`}
            onClick={() => setDashboardSection('settings')}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-4">
                {/* Mini score circle */}
                <div className="relative size-16 shrink-0">
                  <svg className="size-full -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#f0f0f0" strokeWidth="5" />
                    <circle
                      cx="28" cy="28" r="22" fill="none"
                      stroke={scoreColor} strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 22}
                      strokeDashoffset={2 * Math.PI * 22 - (scoring.score / 100) * 2 * Math.PI * 22}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-bold ${scoreTextClass}`}>{scoring.score}</span>
                  </div>
                </div>
                {/* Score info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className={`size-4 ${scoreTextClass}`} />
                    <span className="text-sm font-semibold text-neutral-900">Trust Score</span>
                    <Badge className={`border text-[10px] font-semibold px-2 py-0 ${scoreBadgeClass}`}>
                      {scoring.statusLabel}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-500 mb-2">Score de confiance locataire</p>
                  {/* Mini progress bars for each component */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Profil', pct: scoring.breakdown.profile.max > 0 ? (scoring.breakdown.profile.score / scoring.breakdown.profile.max) * 100 : 0, weight: 5 },
                      { label: 'NEOFACE', pct: scoring.breakdown.neoface.verified ? 100 : 0, weight: 20 },
                      { label: 'ONECI', pct: scoring.breakdown.oneci.verified ? 100 : 0, weight: 25 },
                      { label: 'Dossier', pct: scoring.breakdown.rentalFile.approved ? 100 : scoring.breakdown.rentalFile.hasFile ? 50 : 0, weight: 50 },
                    ].map((comp) => (
                      <div key={comp.label}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[9px] text-neutral-400">{comp.label}</span>
                          <span className="text-[9px] font-semibold text-neutral-500">{comp.weight}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-neutral-200/60 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${comp.pct >= 100 ? 'bg-emerald-500' : comp.pct > 0 ? 'bg-amber-400' : 'bg-neutral-200'}`}
                            style={{ width: `${comp.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <ArrowRight className="size-5 text-neutral-300 group-hover:text-brand-400 transition-colors shrink-0" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-neutral-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${stat.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
                    <p className="text-xs text-neutral-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rental Files */}
        <motion.div variants={itemVariants}>
          <Card className="border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Mes dossiers locatifs</CardTitle>
              <CardDescription>Suivi de vos dossiers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-64 overflow-y-auto">
              {data.rentalFiles.length === 0 ? (
                <p className="text-sm text-neutral-400 py-4 text-center">Aucun dossier pour le moment</p>
              ) : (
                data.rentalFiles.map((rf) => (
                  <div key={rf.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50">
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-neutral-400" />
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          Dossier du {new Date(rf.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {rf.documents.length} document(s)
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={rf.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Visit Requests */}
        <motion.div variants={itemVariants}>
          <Card className="border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Demandes de visite</CardTitle>
              <CardDescription>Vos visites planifiées</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-64 overflow-y-auto">
              {data.visitRequests.length === 0 ? (
                <p className="text-sm text-neutral-400 py-4 text-center">Aucune visite pour le moment</p>
              ) : (
                data.visitRequests.map((vr) => (
                  <div key={vr.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50">
                    <div className="flex items-center gap-3">
                      <Eye className="size-4 text-neutral-400" />
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{vr.property.title}</p>
                        <p className="text-xs text-neutral-500">
                          {new Date(vr.requestedDate).toLocaleDateString('fr-FR')} — {vr.timeSlot}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={vr.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Active Leases */}
      {data.activeLeases.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Baux actifs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.activeLeases.map((lease) => (
                <div key={lease.id} className="flex items-center justify-between p-4 rounded-lg border border-neutral-100 hover:bg-neutral-50">
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-green-50">
                      <FileSignature className="size-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{lease.property.title}</p>
                      <p className="text-xs text-neutral-500">
                        Propriétaire : {lease.owner.firstName} {lease.owner.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-neutral-900">
                      {lease.monthlyRent.toLocaleString('fr-FR')} FCFA/mois
                    </p>
                    <p className="text-xs text-neutral-500">
                      jusqu&apos;au {new Date(lease.endDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
