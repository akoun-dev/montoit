'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Building2, FileSignature, Users, TrendingUp, Eye, CreditCard,
  AlertTriangle, Plus, Calendar, Clock, ChevronRight, Home, User
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface AgenceData {
  stats: {
    totalProperties: number
    activeProperties: number
    activeMandats: number
    activeLeases: number
    totalAgents: number
    totalCommissions: number
    paidCommissions: number
    pendingCommissions: number
    totalRevenue: number
    pendingVisits: number
    latePaymentsCount: number
    expiringMandatsCount: number
  }
  properties: Array<{
    id: string; title: string; type: string; price: number; city: string; status: string
    images: Array<{ url: string }>; hasMandat: boolean; viewsCount: number
  }>
  visitRequests: Array<{
    id: string; status: string; createdAt: string; requestedDate: string; timeSlot: string
    tenant: { firstName: string; lastName: string; phone: string }
    property: { title: string; city: string }
  }>
  activeLeases: Array<{
    id: string; status: string; monthlyRent: number; startDate: string; endDate: string
    tenant: { id: string; firstName: string; lastName: string; avatarUrl: string | null; phone: string }
    property: { title: string; city: string; images: Array<{ url: string }> }
  }>
  expiringMandats: Array<{
    id: string; endDate: string
    property: { title: string }; owner: { firstName: string; lastName: string }
  }>
}

const defaultData: AgenceData = {
  stats: { totalProperties: 0, activeProperties: 0, activeMandats: 0, activeLeases: 0, totalAgents: 0, totalCommissions: 0, paidCommissions: 0, pendingCommissions: 0, totalRevenue: 0, pendingVisits: 0, latePaymentsCount: 0, expiringMandatsCount: 0 },
  properties: [], visitRequests: [], activeLeases: [], expiringMandats: [],
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export function AgenceOverview() {
  const { user, isAuthenticated, setDashboardSection } = useAuthStore()
  const [data, setData] = useState<AgenceData>(defaultData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const d = await authFetch<AgenceData>('/api/dashboard/agence')
      setData(d)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) { setData(defaultData); return }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally { setLoading(false) }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Bonjour, {user?.firstName} 👋</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4"><p className="text-sm text-amber-700">Impossible de charger vos données. Veuillez réessayer.</p></CardContent>
        </Card>
      </div>
    )
  }

  const kpis = [
    { label: 'Biens gérés', value: data.stats.totalProperties, icon: Building2, color: 'text-orange-600 bg-orange-50' },
    { label: 'Mandats actifs', value: data.stats.activeMandats, icon: FileSignature, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Baux signés', value: data.stats.activeLeases, icon: Home, color: 'text-teal-600 bg-teal-50' },
    { label: 'CA mensuel', value: `${(data.stats.totalRevenue / 1000).toFixed(0)}k`, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
    { label: 'Agents', value: data.stats.totalAgents, icon: Users, color: 'text-rose-600 bg-rose-50' },
    { label: 'Commissions', value: `${(data.stats.totalCommissions / 1000).toFixed(0)}k`, icon: CreditCard, color: 'text-violet-600 bg-violet-50' },
  ]

  const activeLeasesOnly = data.activeLeases.filter((l) => l.status === 'ACTIVE')

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Bonjour, {user?.firstName} 👋</h1>
        <p className="text-muted-foreground mt-1">Voici un aperçu de votre espace agence</p>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} className="border-border">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <div className={`flex size-9 items-center justify-center rounded-lg ${kpi.color}`}>
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl font-bold text-foreground">{kpi.value}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{kpi.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
        <Button onClick={() => setDashboardSection('portfolio')} className="bg-[#FF6C2F] hover:bg-[#e55e27] text-white gap-2">
          <Plus className="size-4" /> Ajouter un bien
        </Button>
        <Button onClick={() => setDashboardSection('mandats')} variant="outline" className="gap-2 border-[#FF6C2F] text-[#FF6C2F] hover:bg-orange-50">
          <FileSignature className="size-4" /> Nouveau mandat
        </Button>
        <Button onClick={() => setDashboardSection('visits')} variant="outline" className="gap-2">
          <Calendar className="size-4" /> Planifier visite
        </Button>
      </motion.div>

      {/* Alerts */}
      {(data.stats.expiringMandatsCount > 0 || data.stats.latePaymentsCount > 0) && (
        <motion.div variants={itemVariants} className="space-y-2">
          {data.stats.expiringMandatsCount > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertTriangle className="size-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">{data.stats.expiringMandatsCount} mandat(s) expirant bientôt</p>
                  <p className="text-xs text-amber-600">Pensez à les renouveler pour éviter toute interruption</p>
                </div>
                <Button size="sm" variant="outline" className="ml-auto text-amber-700 border-amber-300 hover:bg-amber-100" onClick={() => setDashboardSection('mandats')}>
                  Voir
                </Button>
              </CardContent>
            </Card>
          )}
          {data.stats.latePaymentsCount > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertTriangle className="size-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">{data.stats.latePaymentsCount} paiement(s) en retard</p>
                  <p className="text-xs text-red-600">Un suivi est nécessaire pour les loyers impayés</p>
                </div>
                <Button size="sm" variant="outline" className="ml-auto text-red-700 border-red-300 hover:bg-red-100" onClick={() => setDashboardSection('finances')}>
                  Voir
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Properties */}
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Derniers biens</CardTitle>
                <Button variant="ghost" size="sm" className="text-[#FF6C2F] gap-1" onClick={() => setDashboardSection('portfolio')}>
                  Voir tout <ChevronRight className="size-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {data.properties.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun bien pour le moment</p>
              ) : (
                data.properties.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <img src={p.images[0].url} alt="" className="size-10 rounded-lg object-cover" />
                      ) : (
                        <div className="size-10 rounded-lg bg-orange-50 flex items-center justify-center">
                          <Building2 className="size-4 text-[#FF6C2F]" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.title || 'Sans titre'}</p>
                        <p className="text-xs text-muted-foreground">{p.city} · {p.price.toLocaleString('fr-FR')} FCFA</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : p.status === 'RENTED' ? 'bg-orange-100 text-orange-700' : 'bg-neutral-100 text-neutral-600'}>
                        {p.status === 'ACTIVE' ? 'Actif' : p.status === 'RENTED' ? 'Loué' : p.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pending Visits */}
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Visites en attente</CardTitle>
                <Button variant="ghost" size="sm" className="text-[#FF6C2F] gap-1" onClick={() => setDashboardSection('visits')}>
                  Voir tout <ChevronRight className="size-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {data.visitRequests.filter((v) => v.status === 'PENDING').length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune visite en attente</p>
              ) : (
                data.visitRequests.filter((v) => v.status === 'PENDING').slice(0, 5).map((vr) => (
                  <div key={vr.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{vr.tenant.firstName} {vr.tenant.lastName}</p>
                      <p className="text-xs text-muted-foreground">{vr.property.title} · {new Date(vr.requestedDate).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700">En attente</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Active Leases */}
      {activeLeasesOnly.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-border overflow-hidden">
            <div className="bg-gradient-to-r from-[#FF6C2F] to-[#ff8a55] p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Home className="size-5 text-white" />
                    <h2 className="text-base font-semibold text-white">Locations en cours</h2>
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
            <CardContent className="p-4 sm:p-5 space-y-3 max-h-64 overflow-y-auto">
              {activeLeasesOnly.slice(0, 5).map((lease) => (
                <div key={lease.id} className="flex flex-col sm:flex-row gap-3 p-3 rounded-xl border border-border hover:bg-accent/50 transition-colors">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="shrink-0">
                      {lease.tenant.avatarUrl ? (
                        <img src={lease.tenant.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
                      ) : (
                        <div className="size-9 rounded-full bg-orange-50 flex items-center justify-center">
                          <User className="size-4 text-[#FF6C2F]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{lease.tenant.firstName} {lease.tenant.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{lease.property.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="size-3.5 text-[#FF6C2F] shrink-0" />
                      <p className="text-sm font-semibold text-foreground">{lease.monthlyRent.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        {new Date(lease.startDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} → {new Date(lease.endDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
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
