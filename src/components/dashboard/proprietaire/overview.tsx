'use client'

import { useEffect, useState, useCallback } from 'react'
import { Building2, Eye, FileSignature, TrendingUp, Home, User, CheckCircle2, AlertTriangle, Hourglass, Users, ShieldCheck, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

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

interface ProprietaireData {
  stats: {
    totalProperties: number
    activeProperties: number
    pendingVisits: number
    activeLeases: number
    totalRevenue: number
    totalRevenueFromPayments: number
    latePaymentsCount: number
  }
  properties: Array<{
    id: string; title: string; type: string; price: number; city: string; status: string; bedrooms: number | null; area: number
    images: Array<{ url: string }>
  }>
  visitRequests: Array<{
    id: string; status: string; createdAt: string; requestedDate: string; timeSlot: string
    tenant: { firstName: string; lastName: string; phone: string }
    property: { title: string; city: string }
  }>
  activeLeases: Array<{
    id: string; status: string; monthlyRent: number; charges: number; startDate: string; endDate: string
    tenant: { id: string; firstName: string; lastName: string; avatarUrl: string | null; phone: string }
    property: { title: string; city: string; address: string; images: Array<{ url: string }> }
    paymentStatus: 'up_to_date' | 'late' | 'pending'
    latePaymentsCount: number
    totalPaid: number
    nextPayment: {
      id: string
      amount: number
      dueDate: string
      status: string
    } | null
    payments: Array<{
      id: string
      amount: number
      status: string
      dueDate: string
      paidAt: string | null
    }>
  }>
}

interface ApiProprietaireResponse {
  stats?: {
    totalProperties?: number
    activeProperties?: number
    pendingVisits?: number
    activeLeases?: number
    totalRevenue?: number
    totalRevenueFromPayments?: number
    latePaymentsCount?: number
  }
  properties?: Array<{
    id: string; title: string; type: string; price: number; city: string; status: string; bedrooms: number | null; area: number
    images: Array<{ url: string }>
  }>
  visitRequests?: Array<{
    id: string; status: string; createdAt: string; requestedDate: string; timeSlot: string
    tenant: { firstName: string; lastName: string; phone: string }
    property: { title: string; city: string }
  }>
  activeLeases?: Array<{
    id: string; status: string; monthlyRent: number; charges: number; startDate: string; endDate: string
    tenant: { id: string; firstName: string; lastName: string; avatarUrl: string | null; phone: string }
    property: { title: string; city: string; address: string; images: Array<{ url: string }> }
    paymentStatus: 'up_to_date' | 'late' | 'pending'
    latePaymentsCount: number
    totalPaid: number
    nextPayment: {
      id: string
      amount: number
      dueDate: string
      status: string
    } | null
    payments: Array<{
      id: string
      amount: number
      status: string
      dueDate: string
      paidAt: string | null
    }>
  }>
}

const defaultData: ProprietaireData = {
  stats: { totalProperties: 0, activeProperties: 0, pendingVisits: 0, activeLeases: 0, totalRevenue: 0, totalRevenueFromPayments: 0, latePaymentsCount: 0 },
  properties: [],
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

export function ProprietaireOverview() {
  const { user, isAuthenticated, setDashboardSection } = useAuthStore()
  const [data, setData] = useState<ProprietaireData>(defaultData)
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
        authFetch<ApiProprietaireResponse>('/api/dashboard/proprietaire'),
        authFetch<ScoringSummary>('/api/scoring'),
      ])

      if (dashboardResult.status === 'fulfilled') {
        const d = dashboardResult.value
        setData({
          stats: { ...defaultData.stats, ...d.stats },
          properties: d.properties ?? [],
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

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

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

  const stats = [
    { label: 'Biens totaux', value: data.stats.totalProperties, icon: Building2, color: 'text-teal-600 bg-teal-50' },
    { label: 'Biens actifs', value: data.stats.activeProperties, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
    { label: 'Visites en attente', value: data.stats.pendingVisits, icon: Eye, color: 'text-amber-600 bg-amber-50' },
    { label: 'Revenus mensuels', value: `${(data.stats.totalRevenue / 1000).toFixed(0)}k`, icon: FileSignature, color: 'text-brand-600 bg-brand-50' },
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

  // Filter only ACTIVE leases for the "Mes locations en cours" section
  const activeLeasesOnly = data.activeLeases.filter((l) => l.status === 'ACTIVE')

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground">Bonjour, {user?.firstName} 👋</h1>
        <p className="text-muted-foreground mt-1">Voici un aperçu de votre espace propriétaire</p>
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
                  <p className="text-xs text-muted-foreground mb-2">Score de confiance {scoring.roleLabel || 'propriétaire'}</p>
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
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* ─── Mes locations en cours ──────────────────────────────────────────── */}
      {activeLeasesOnly.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-border overflow-hidden">
            {/* Header gradient */}
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="size-5 text-white" />
                  <h2 className="text-base font-semibold text-white">Mes locations en cours</h2>
                </div>
                <Badge className="bg-white/20 text-white border-0 text-xs px-2.5 py-1">
                  {data.stats.totalRevenue.toLocaleString('fr-FR')} FCFA/mois
                </Badge>
              </div>
            </div>
            <CardContent className="p-4 sm:p-5 space-y-3">
              {activeLeasesOnly.map((lease) => (
                <div key={lease.id} className="rounded-xl border border-border p-3 sm:p-4 hover:bg-accent/50 transition-colors space-y-3">
                  {/* Top: Tenant + Property */}
                  <div className="flex gap-3">
                    {/* Tenant avatar */}
                    <div className="shrink-0">
                      {lease.tenant.avatarUrl ? (
                        <img
                          src={lease.tenant.avatarUrl}
                          alt={`${lease.tenant.firstName} ${lease.tenant.lastName}`}
                          className="size-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-11 rounded-full bg-brand-50 flex items-center justify-center">
                          <User className="size-5 text-brand-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {lease.tenant.firstName} {lease.tenant.lastName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="size-7 rounded bg-muted overflow-hidden shrink-0">
                          {lease.property.images?.[0]?.url ? (
                            <img src={lease.property.images[0].url} alt="" className="size-full object-cover" />
                          ) : (
                            <div className="size-full flex items-center justify-center">
                              <Building2 className="size-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate">{lease.property.title}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Key metrics in a row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-muted/60">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Loyer</p>
                      <p className="text-xs font-bold text-foreground">{lease.monthlyRent.toLocaleString('fr-FR')} <span className="text-[9px] font-normal text-muted-foreground">FCFA</span></p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/60">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Période</p>
                      <p className="text-[11px] font-semibold text-foreground">
                        {new Date(lease.startDate).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })} → {new Date(lease.endDate).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/60">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Paiement</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        <PaymentStatusIndicator status={lease.paymentStatus} />
                        {lease.latePaymentsCount > 0 && (
                          <Badge className="bg-red-50 text-red-600 text-[9px] px-1 py-0 leading-none">
                            {lease.latePaymentsCount} retard{lease.latePaymentsCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs gap-1 text-brand-600 hover:text-brand-700 hover:bg-brand-50 border border-dashed border-brand-200"
                    onClick={() => setDashboardSection('my-tenants')}
                  >
                    <Users className="size-3" />
                    Voir le locataire
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Properties */}
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Mes biens récents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-64 overflow-y-auto">
              {data.properties.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun bien pour le moment</p>
              ) : (
                data.properties.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <img src={p.images[0].url} alt="" className="size-10 rounded-lg object-cover" />
                      ) : (
                        <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="size-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.city} · {p.price.toLocaleString('fr-FR')} FCFA</p>
                      </div>
                    </div>
                    <Badge className={p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}>
                      {p.status === 'ACTIVE' ? 'Actif' : p.status}
                    </Badge>
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
            </CardHeader>
            <CardContent className="space-y-3 max-h-64 overflow-y-auto">
              {data.visitRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune demande</p>
              ) : (
                data.visitRequests.slice(0, 5).map((vr) => (
                  <div key={vr.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent">
                    <div>
                      <p className="text-sm font-medium text-foreground">{vr.tenant.firstName} {vr.tenant.lastName}</p>
                      <p className="text-xs text-muted-foreground">{vr.property.title} · {new Date(vr.requestedDate).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <Badge className={vr.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}>
                      {vr.status === 'PENDING' ? 'En attente' : vr.status === 'ACCEPTED' ? 'Accepté' : vr.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
