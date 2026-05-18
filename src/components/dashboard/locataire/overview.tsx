'use client'

import { useEffect, useState, useCallback } from 'react'
import { FileText, Eye, FileSignature, MessageSquare, ShieldCheck, ArrowRight, Home, MapPin, User, CreditCard, Calendar, Clock, CheckCircle2, AlertTriangle, Hourglass, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { ContactDialog } from '@/components/messaging/contact-dialog'
import { motion } from 'framer-motion'

interface NextPayment {
  id: string
  amount: number
  dueDate: string
  status: string
  leaseId?: string
}

interface DashboardData {
  stats: {
    totalRentalFiles: number
    activeLeases: number
    pendingVisits: number
    unreadMessages: number
    latePaymentsCount: number
    totalPaid: number
    nextPayment: NextPayment | null
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
    charges: number
    startDate: string
    endDate: string
    property: {
      title: string
      address?: string
      city: string
      images: Array<{ url: string }>
    }
    owner: { id: string; firstName: string; lastName: string; avatarUrl?: string }
    paymentStatus: 'up_to_date' | 'late' | 'pending'
    nextPayment: {
      id: string
      amount: number
      dueDate: string
      status: string
    } | null
    latePaymentsCount: number
    totalPaid: number
    payments: Array<{
      id: string
      amount: number
      status: string
      dueDate: string
      paidAt: string | null
    }>
  }>
}

interface ApiDashboardResponse {
  stats?: Partial<DashboardData['stats']> & {
    latePaymentsCount?: number
    totalPaid?: number
    nextPayment?: NextPayment | null
  }
  rentalFiles?: DashboardData['rentalFiles']
  visitRequests?: DashboardData['visitRequests']
  activeLeases?: DashboardData['activeLeases']
}

interface ScoringSummary {
  score: number
  statusLabel: string
  statusColor: string
  status: string
  roleLabel: string
  breakdown: {
    profile: { score: number; max: number; weight: number }
    neoface: { score: number; max: number; weight: number; verified: boolean }
    oneci: { score: number; max: number; weight: number; verified: boolean }
    roleSpecific: { score: number; max: number; weight: number; approved: boolean; hasFile: boolean; label: string }
  }
}

const defaultData: DashboardData = {
  stats: { totalRentalFiles: 0, activeLeases: 0, pendingVisits: 0, unreadMessages: 0, latePaymentsCount: 0, totalPaid: 0, nextPayment: null },
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
    DRAFT: { label: 'Brouillon', className: 'bg-muted text-foreground' },
    SUBMITTED: { label: 'Soumis', className: 'bg-amber-100 text-amber-700' },
    TC_REVIEW: { label: 'En revue TC', className: 'bg-amber-100 text-amber-700' },
    VALIDATED: { label: 'Validé', className: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Rejeté', className: 'bg-red-100 text-red-700' },
    PENDING: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
    ACCEPTED: { label: 'Accepté', className: 'bg-green-100 text-green-700' },
    COMPLETED: { label: 'Complété', className: 'bg-teal-100 text-teal-700' },
    ACTIVE: { label: 'Actif', className: 'bg-green-100 text-green-700' },
  }
  const c = config[status] || { label: status, className: 'bg-muted text-foreground' }
  return <Badge className={c.className}>{c.label}</Badge>
}

function PaymentStatusIndicator({ status }: { status: 'up_to_date' | 'late' | 'pending' }) {
  if (status === 'up_to_date') {
    return (
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="size-4 text-emerald-500" />
        <span className="text-xs font-medium text-emerald-600">À jour</span>
      </div>
    )
  }
  if (status === 'late') {
    return (
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="size-4 text-red-500" />
        <span className="text-xs font-medium text-red-600">En retard</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <Hourglass className="size-4 text-amber-500" />
      <span className="text-xs font-medium text-amber-600">En attente</span>
    </div>
  )
}

export function LocataireOverview() {
  const { user, isAuthenticated, setDashboardSection, setSelectedItemId } = useAuthStore()
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
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Bonjour, {user?.firstName} 👋</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Impossible de charger vos données. Veuillez réessayer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = [
    { label: 'Dossiers locatifs', value: data.stats.totalRentalFiles, icon: FileText, color: 'text-teal-600 bg-teal-50' },
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

  // The primary active lease for the "Ma location en cours" card
  const primaryLease = data.activeLeases[0] || null

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome */}
      <motion.div variants={itemVariants}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          Bonjour, {user?.firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Voici un aperçu de votre espace locataire</p>
      </motion.div>

      {/* Trust Score Mini Card — prominent at top */}
      {scoring && (
        <motion.div variants={itemVariants}>
          <Card className={`border bg-gradient-to-r ${scoreBgClass} cursor-pointer hover:shadow-md transition-all group`}
            onClick={() => setDashboardSection('trust-score')}
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
                    <span className="text-sm font-semibold text-foreground">Trust Score</span>
                    <Badge className={`border text-[10px] font-semibold px-2 py-0 ${scoreBadgeClass}`}>
                      {scoring.statusLabel}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Score de confiance {scoring.roleLabel || 'locataire'}</p>
                  {/* Mini progress bars for each component */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'Profil', pct: scoring.breakdown.profile.max > 0 ? (scoring.breakdown.profile.score / scoring.breakdown.profile.max) * 100 : 0, weight: 5 },
                      { label: 'KYC', pct: scoring.breakdown.neoface.verified ? 100 : 0, weight: 20 },
                      { label: 'ONECI', pct: scoring.breakdown.oneci.verified ? 100 : 0, weight: 25 },
                      { label: scoring.breakdown.roleSpecific.label || 'Dossier', pct: scoring.breakdown.roleSpecific.approved ? 100 : scoring.breakdown.roleSpecific.hasFile ? 50 : 0, weight: 50 },
                    ].map((comp) => (
                      <div key={comp.label}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[9px] text-muted-foreground">{comp.label}</span>
                          <span className="text-[9px] font-semibold text-muted-foreground">{comp.weight}%</span>
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

      {/* ─── Ma location en cours ──────────────────────────────────────────────── */}
      {primaryLease && (
        <motion.div variants={itemVariants}>
          <Card className="border-border overflow-hidden">
            {/* Header gradient */}
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="size-5 text-white" />
                  <h2 className="text-base font-semibold text-white">Ma location en cours</h2>
                </div>
                <Badge className="bg-white/20 text-white border-0 text-xs px-2.5 py-1">
                  {primaryLease.monthlyRent.toLocaleString('fr-FR')} FCFA/mois
                </Badge>
              </div>
            </div>

            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Property info — horizontal on all sizes */}
              <div className="flex gap-3 sm:gap-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-muted overflow-hidden shrink-0">
                  {primaryLease.property.images?.[0]?.url ? (
                    <img
                      src={primaryLease.property.images[0].url}
                      alt={primaryLease.property.title}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center bg-brand-50">
                      <Home className="size-8 text-brand-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{primaryLease.property.title}</h3>
                    {(primaryLease.property.address || primaryLease.property.city) && (
                      <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">{primaryLease.property.address || primaryLease.property.city}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted shrink-0">
                      <User className="size-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-xs sm:text-sm text-muted-foreground truncate">
                      {primaryLease.owner.firstName} {primaryLease.owner.lastName}
                    </span>
                    <ContactDialog
                      defaultRecipientId={primaryLease.owner.id}
                      onMessageSent={(convId) => {
                        setDashboardSection('messages')
                      }}
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] gap-1 ml-auto shrink-0"
                        >
                          <MessageSquare className="size-3" />
                          <span className="hidden sm:inline">Contacter</span>
                        </Button>
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Key metrics — 2 rows of 2 on mobile, 1 row of 4 on desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="p-2.5 sm:p-3 rounded-lg bg-muted/70">
                  <div className="flex items-center gap-1 mb-1">
                    <CreditCard className="size-3 text-brand-500" />
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Loyer</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-foreground">{primaryLease.monthlyRent.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-muted-foreground">FCFA</span></p>
                </div>
                <div className="p-2.5 sm:p-3 rounded-lg bg-muted/70">
                  <div className="flex items-center gap-1 mb-1">
                    <Calendar className="size-3 text-brand-500" />
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Période</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                    {new Date(primaryLease.startDate).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    → {new Date(primaryLease.endDate).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
                  </p>
                </div>
                <div className="p-2.5 sm:p-3 rounded-lg bg-muted/70">
                  <div className="flex items-center gap-1 mb-1">
                    <Clock className="size-3 text-brand-500" />
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Prochain paiement</span>
                  </div>
                  {primaryLease.nextPayment ? (
                    <>
                      <p className="text-xs sm:text-sm font-bold text-foreground">{primaryLease.nextPayment.amount.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-muted-foreground">FCFA</span></p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(primaryLease.nextPayment.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                </div>
                <div className="p-2.5 sm:p-3 rounded-lg bg-muted/70">
                  <div className="flex items-center gap-1 mb-1">
                    {primaryLease.paymentStatus === 'up_to_date' ? (
                      <CheckCircle2 className="size-3 text-emerald-500" />
                    ) : primaryLease.paymentStatus === 'late' ? (
                      <AlertTriangle className="size-3 text-red-500" />
                    ) : (
                      <Hourglass className="size-3 text-amber-500" />
                    )}
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Statut</span>
                  </div>
                  <PaymentStatusIndicator status={primaryLease.paymentStatus} />
                </div>
              </div>

              {/* View details button */}
              <Button
                className="w-full bg-brand-500 hover:bg-brand-600 text-white gap-2"
                onClick={() => {
                  setSelectedItemId(primaryLease.id)
                  setDashboardSection('my-leases')
                }}
              >
                Voir les détails du bail
                <ChevronRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${stat.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
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
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Mes dossiers locatifs</CardTitle>
              <CardDescription>Suivi de vos dossiers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-64 overflow-y-auto">
              {data.rentalFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun dossier pour le moment</p>
              ) : (
                data.rentalFiles.map((rf) => (
                  <div key={rf.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent">
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Dossier du {new Date(rf.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
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
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Demandes de visite</CardTitle>
              <CardDescription>Vos visites planifiées</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-64 overflow-y-auto">
              {data.visitRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune visite pour le moment</p>
              ) : (
                data.visitRequests.map((vr) => (
                  <div key={vr.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent">
                    <div className="flex items-center gap-3">
                      <Eye className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{vr.property.title}</p>
                        <p className="text-xs text-muted-foreground">
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

      {/* Active Leases list (for multiple leases) */}
      {data.activeLeases.length > 1 && (
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Autres baux actifs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.activeLeases.slice(1).map((lease) => (
                <div
                  key={lease.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedItemId(lease.id)
                    setDashboardSection('my-leases')
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-green-50">
                      <FileSignature className="size-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{lease.property.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Propriétaire : {lease.owner.firstName} {lease.owner.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {lease.monthlyRent.toLocaleString('fr-FR')} FCFA/mois
                    </p>
                    <p className="text-xs text-muted-foreground">
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
