'use client'

import { useEffect, useState, useCallback } from 'react'
import { Eye, MessageSquare, ShieldCheck, Home, MapPin, User, CreditCard, Calendar, Clock, CheckCircle2, AlertTriangle, Hourglass, ChevronRight, FileSignature } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications'
import { useRealtimeLeases } from '@/hooks/use-realtime-leases'
import { useRealtimeVisits } from '@/hooks/use-realtime-visits'
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

  useRealtimeNotifications({
    userId: user?.id,
    onNotificationChange: () => fetchData(),
  })
  useRealtimeLeases({
    userId: user?.id,
    onLeaseChange: () => fetchData(),
  })
  useRealtimeVisits({
    userId: user?.id,
    onVisitChange: () => fetchData(),
  })

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
    { label: 'Ma location', value: data.stats.activeLeases, icon: Home, color: 'text-green-600 bg-green-50' },
    { label: 'Visites', value: data.stats.pendingVisits, icon: Eye, color: 'text-amber-600 bg-amber-50' },
    { label: 'Messages', value: data.stats.unreadMessages, icon: MessageSquare, color: 'text-brand-600 bg-brand-50' },
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
      {/* Welcome + Trust Score mini */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Bonjour, {user?.firstName} 👋
            </h1>
            <p className="text-muted-foreground mt-1">Voici un aperçu de votre espace locataire</p>
          </div>
          {scoring && (
            <button
              onClick={() => setDashboardSection('settings')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border ${scoreBadgeClass} text-xs font-medium hover:shadow-sm transition-all shrink-0`}
            >
              <ShieldCheck className="size-3.5" />
              {scoring.score}/100
            </button>
          )}
        </div>
      </motion.div>

      {/* ─── Ma location en cours ──────────────────────────────────────────────── */}
      {primaryLease && (
        <motion.div variants={itemVariants}>
          <Card className="border-border overflow-hidden">
            <CardContent className="p-0">
              {/* Hero image + overlay */}
              <div className="relative h-44 sm:h-52 bg-gradient-to-br from-brand-600 to-brand-800 overflow-hidden">
                {primaryLease.property.images?.[0]?.url ? (
                  <>
                    <img
                      src={primaryLease.property.images[0].url}
                      alt={primaryLease.property.title}
                      className="absolute inset-0 size-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Home className="size-16 text-white/30" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-white truncate">{primaryLease.property.title}</h3>
                      {(primaryLease.property.address || primaryLease.property.city) && (
                        <p className="text-xs sm:text-sm text-white/80 flex items-center gap-1 mt-0.5">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{primaryLease.property.address || primaryLease.property.city}</span>
                        </p>
                      )}
                    </div>
                    <Badge className="bg-white/20 text-white border-0 text-xs font-semibold px-3 py-1 shrink-0 backdrop-blur-sm">
                      {primaryLease.monthlyRent.toLocaleString('fr-FR')} FCFA/mois
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Info section */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* Owner + Contact */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                      <User className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Propriétaire</p>
                      <p className="text-sm font-medium text-foreground">{primaryLease.owner.firstName} {primaryLease.owner.lastName}</p>
                    </div>
                  </div>
                  <ContactDialog
                    defaultRecipientId={primaryLease.owner.id}
                    onMessageSent={() => setDashboardSection('messages')}
                    trigger={
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                        <MessageSquare className="size-3.5" />
                        Contacter
                      </Button>
                    }
                  />
                </div>

                <Separator />

                {/* Key metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-muted/60 border border-border/50">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CreditCard className="size-3.5 text-brand-500" />
                      <span className="text-[11px] font-medium text-muted-foreground">Loyer</span>
                    </div>
                    <p className="text-sm font-bold text-foreground">{primaryLease.monthlyRent.toLocaleString('fr-FR')}</p>
                    <p className="text-[10px] text-muted-foreground">FCFA/mois</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/60 border border-border/50">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Calendar className="size-3.5 text-brand-500" />
                      <span className="text-[11px] font-medium text-muted-foreground">Période</span>
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      {new Date(primaryLease.startDate).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      → {new Date(primaryLease.endDate).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/60 border border-border/50">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Clock className="size-3.5 text-brand-500" />
                      <span className="text-[11px] font-medium text-muted-foreground">Prochain</span>
                    </div>
                    {primaryLease.nextPayment ? (
                      <>
                        <p className="text-sm font-bold text-foreground">{primaryLease.nextPayment.amount.toLocaleString('fr-FR')}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(primaryLease.nextPayment.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-1.5 h-7 w-full text-[11px] gap-1 border-brand-200 text-brand-600 hover:bg-brand-50"
                          onClick={() => setDashboardSection('payments')}
                        >
                          Payer
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                  <div className={`p-3 rounded-xl border ${
                    primaryLease.paymentStatus === 'up_to_date'
                      ? 'bg-emerald-50/60 border-emerald-200/50'
                      : primaryLease.paymentStatus === 'late'
                        ? 'bg-red-50/60 border-red-200/50'
                        : 'bg-amber-50/60 border-amber-200/50'
                  }`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {primaryLease.paymentStatus === 'up_to_date' ? (
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                      ) : primaryLease.paymentStatus === 'late' ? (
                        <AlertTriangle className="size-3.5 text-red-600" />
                      ) : (
                        <Hourglass className="size-3.5 text-amber-600" />
                      )}
                      <span className="text-[11px] font-medium text-muted-foreground">Statut</span>
                    </div>
                    <PaymentStatusIndicator status={primaryLease.paymentStatus} />
                  </div>
                </div>

                {/* View details */}
                <Button
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white gap-2 h-11"
                  onClick={() => {
                    setSelectedItemId(primaryLease.id)
                    setDashboardSection('my-leases')
                  }}
                >
                  Gérer mon bail
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
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

      {/* Visit Requests */}
      {data.visitRequests.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Demandes de visite</CardTitle>
              <CardDescription>Vos visites récentes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-64 overflow-y-auto">
              {data.visitRequests.map((vr) => (
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
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

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
