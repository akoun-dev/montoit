'use client'

import { useEffect, useState, useCallback } from 'react'
import { Building2, Eye, FileSignature, TrendingUp, FileText, ClipboardCheck, Home, User, CheckCircle2, AlertTriangle, Hourglass, CreditCard, Calendar, ChevronRight, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<ApiProprietaireResponse>('/api/dashboard/proprietaire')
      setData({
        stats: { ...defaultData.stats, ...d.stats },
        properties: d.properties ?? [],
        visitRequests: d.visitRequests ?? [],
        activeLeases: d.activeLeases ?? [],
      })
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
    { label: 'Biens totaux', value: data.stats.totalProperties, icon: Building2, color: 'text-blue-600 bg-blue-50' },
    { label: 'Biens actifs', value: data.stats.activeProperties, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
    { label: 'Visites en attente', value: data.stats.pendingVisits, icon: Eye, color: 'text-amber-600 bg-amber-50' },
    { label: 'Revenus mensuels', value: `${(data.stats.totalRevenue / 1000).toFixed(0)}k`, icon: FileSignature, color: 'text-brand-600 bg-brand-50' },
  ]

  // Filter only ACTIVE leases for the "Mes locations en cours" section
  const activeLeasesOnly = data.activeLeases.filter((l) => l.status === 'ACTIVE')

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground">Bonjour, {user?.firstName} 👋</h1>
        <p className="text-muted-foreground mt-1">Voici un aperçu de votre espace propriétaire</p>
      </motion.div>

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
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Home className="size-5 text-white" />
                    <h2 className="text-base font-semibold text-white">Mes locations en cours</h2>
                  </div>
                  <p className="text-sm text-white/80">
                    {activeLeasesOnly.length} bail{activeLeasesOnly.length > 1 ? 'x' : ''} actif{activeLeasesOnly.length > 1 ? 's' : ''}
                  </p>
                </div>
                <Badge className="bg-white/20 text-white border-0 text-sm px-3 py-1">
                  {data.stats.totalRevenue.toLocaleString('fr-FR')} FCFA/mois
                </Badge>
              </div>
            </div>
            <CardContent className="p-4 sm:p-5 space-y-4">
              {activeLeasesOnly.map((lease) => (
                <div key={lease.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors">
                  {/* Tenant info + Property image */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Tenant avatar */}
                    <div className="shrink-0">
                      {lease.tenant.avatarUrl ? (
                        <img
                          src={lease.tenant.avatarUrl}
                          alt={`${lease.tenant.firstName} ${lease.tenant.lastName}`}
                          className="size-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-10 rounded-full bg-brand-50 flex items-center justify-center">
                          <User className="size-5 text-brand-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {lease.tenant.firstName} {lease.tenant.lastName}
                      </p>
                      {/* Property image + title */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="size-8 rounded bg-muted overflow-hidden shrink-0">
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

                  {/* Lease details */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="size-3.5 text-brand-500 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Loyer</p>
                        <p className="text-sm font-semibold text-foreground">{lease.monthlyRent.toLocaleString('fr-FR')} FCFA</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Période</p>
                        <p className="text-xs font-medium text-foreground">
                          {new Date(lease.startDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} → {new Date(lease.endDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <PaymentStatusIndicator status={lease.paymentStatus} />
                      {lease.latePaymentsCount > 0 && (
                        <Badge className="bg-red-50 text-red-600 text-[10px] px-1.5 py-0">
                          {lease.latePaymentsCount} retard{lease.latePaymentsCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1 text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                      onClick={() => setDashboardSection('my-tenants')}
                    >
                      <Users className="size-3" />
                      Voir le locataire
                    </Button>
                  </div>
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
