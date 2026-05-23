'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Building2, Eye, FileSignature, TrendingUp, Home, User,
  CheckCircle2, AlertTriangle, Hourglass, Users, CreditCard,
  ArrowRight, BarChart3, Calendar, Clock, Star, Heart
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useRealtimeProperties } from '@/hooks/use-realtime-properties'
import { useRealtimeVisits } from '@/hooks/use-realtime-visits'
import { useRealtimeLeases } from '@/hooks/use-realtime-leases'
import { useRealtimePayments } from '@/hooks/use-realtime-payments'
import { useRealtimeRentalFiles } from '@/hooks/use-realtime-rental-files'
import { useRealtimeMaintenance } from '@/hooks/use-realtime-maintenance'
import { useRealtimeMandats } from '@/hooks/use-realtime-mandats'
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications'

interface ProprietaireData {
  stats: {
    totalProperties: number; activeProperties: number; pendingVisits: number
    activeLeases: number; totalRevenue: number; totalRevenueFromPayments: number
    latePaymentsCount: number; totalViews: number; totalFavorites: number
    conversionRate: number; occupancyRate: number; expiringContractsCount: number
    occupiedProperties: number; availableProperties: number
    monthlyRevenue: Array<{ month: string; revenue: number }>
    recentPayments: Array<PayRecord>
    housingTypeDistribution: Record<string, number>
  }
  monthlyRevenue: Array<{ month: string; revenue: number }>
  properties: Array<PropSummary>
  visitRequests: Array<VisitSummary>
  activeLeases: Array<LeaseSummary>
  expiringContracts: Array<ContractSummary>
}

interface PropSummary {
  id: string; title: string; type: string; price: number
  city: string; status: string; rentalStatus?: string; bedrooms?: number
  images: Array<{ url: string }>
}
interface VisitSummary {
  id: string; status: string; requestedDate: string; timeSlot: string
  tenant: { firstName: string; lastName: string; phone: string }
  property: { title: string; city: string }
}
interface LeaseSummary {
  id: string; status: string; monthlyRent: number; charges: number
  startDate: string; endDate: string; paymentStatus: 'up_to_date' | 'late' | 'pending'
  latePaymentsCount: number; totalPaid: number
  nextPayment: { id: string; amount: number; dueDate: string; status: string } | null
  tenant: { id: string; firstName: string; lastName: string; avatarUrl: string | null; phone: string }
  property: { title: string; city: string; address: string; images: Array<{ url: string }> }
  payments: Array<{ id: string; amount: number; status: string; dueDate: string; paidAt: string | null }>
}
interface ContractSummary {
  id: string; monthlyRent: number; startDate: string; endDate: string
  property: { title: string } | null; tenant: { firstName: string; lastName: string } | null
  contractStatus: string
}
interface PayRecord {
  id: string; amount: number; status: string; dueDate: string; paidAt: string | null
  tenant: { firstName: string; lastName: string } | null
  property: { title: string } | null
}

const defaultData: ProprietaireData = {
  stats: {
    totalProperties: 0, activeProperties: 0, pendingVisits: 0, activeLeases: 0,
    totalRevenue: 0, totalRevenueFromPayments: 0, latePaymentsCount: 0,
    totalViews: 0, totalFavorites: 0, conversionRate: 0, occupancyRate: 0,
    expiringContractsCount: 0, occupiedProperties: 0, availableProperties: 0,
    monthlyRevenue: [], recentPayments: [], housingTypeDistribution: {}
  },
  monthlyRevenue: [], properties: [], visitRequests: [], activeLeases: [], expiringContracts: [],
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const monthLabels: Record<string, string> = {
  '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Juin',
  '07': 'Juil', '08': 'Août', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
}

function PaymentStatusIndicator({ status }: { status: 'up_to_date' | 'late' | 'pending' }) {
  if (status === 'up_to_date') return <div className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-500" /><span className="text-xs font-medium text-emerald-600">À jour</span></div>
  if (status === 'late') return <div className="flex items-center gap-1.5"><AlertTriangle className="size-4 text-red-500" /><span className="text-xs font-medium text-red-600">En retard</span></div>
  return <div className="flex items-center gap-1.5"><Hourglass className="size-4 text-amber-500" /><span className="text-xs font-medium text-amber-600">En attente</span></div>
}

export function ProprietaireOverview() {
  const { user, isAuthenticated, setDashboardSection } = useAuthStore()
  const [data, setData] = useState<ProprietaireData>(defaultData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const d = await authFetch<ProprietaireData>('/api/dashboard/proprietaire')
      setData(d)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) { setData(defaultData); return }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally { setLoading(false) }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  useRealtimeProperties({ userId: user?.id, onPropertyChange: () => { fetchData() } })
  useRealtimeVisits({ userId: user?.id, onVisitChange: () => { fetchData() } })
  useRealtimeLeases({ userId: user?.id, onLeaseChange: () => { fetchData() } })
  useRealtimePayments({ userId: user?.id, onPaymentChange: () => { fetchData() } })
  useRealtimeRentalFiles({ userId: user?.id, onRentalFileChange: () => { fetchData() } })
  useRealtimeMaintenance({ userId: user?.id, onMaintenanceChange: () => { fetchData() } })
  useRealtimeMandats({ userId: user?.id, onMandatChange: () => { fetchData() } })
  useRealtimeNotifications({ userId: user?.id, onNotificationChange: () => { fetchData() } })

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>
  if (error) return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground">Bonjour, {user?.firstName} 👋</h1>
      <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4"><p className="text-sm text-amber-700">Impossible de charger vos données.</p></CardContent></Card>
    </div>
  )

  const activeLeasesOnly = data.activeLeases.filter((l) => l.status === 'ACTIVE')
  const maxRevenue = Math.max(...data.monthlyRevenue.map(m => m.revenue), 1)

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header with gradient */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-6 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.08),transparent_50%)]" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Bonjour, {user?.firstName} 👋</h1>
          <p className="text-brand-100 mt-1.5 text-sm sm:text-base">Vue d&apos;ensemble de votre patrimoine immobilier</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm">
              <Building2 className="size-3.5" />
              {data.stats.totalProperties} bien{data.stats.totalProperties !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm">
              <TrendingUp className="size-3.5" />
              {data.stats.occupancyRate}% occupé{data.stats.occupancyRate !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm">
              <CreditCard className="size-3.5" />
              {data.stats.totalRevenue.toLocaleString('fr-FR')} FCFA/mois
            </span>
          </div>
        </div>
      </motion.div>

      {/* ─── KPI ─────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-border"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-teal-50"><Building2 className="size-5 text-teal-600" /></div>
          <div><p className="text-xl font-bold text-foreground">{data.stats.totalProperties}</p><p className="text-xs text-muted-foreground">Biens</p></div>
        </CardContent></Card>
        <Card className="border-border"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-green-50"><TrendingUp className="size-5 text-green-600" /></div>
          <div><p className="text-xl font-bold text-green-600">{data.stats.occupancyRate}%</p><p className="text-xs text-muted-foreground">Taux occup.</p></div>
        </CardContent></Card>
        <Card className="border-border"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-brand-50"><CreditCard className="size-5 text-brand-600" /></div>
          <div><p className="text-xl font-bold text-foreground">{(data.stats.totalRevenue / 1000).toFixed(0)}k</p><p className="text-xs text-muted-foreground">Revenus/mois</p></div>
        </CardContent></Card>
        <Card className="border-border"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50"><AlertTriangle className="size-5 text-amber-600" /></div>
          <div><p className="text-xl font-bold text-amber-600">{data.stats.latePaymentsCount}</p><p className="text-xs text-muted-foreground">Impayés</p></div>
        </CardContent></Card>
        <Card className="border-border"><CardContent className="p-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50"><FileSignature className="size-5 text-blue-600" /></div>
          <div><p className="text-xl font-bold text-foreground">{data.stats.activeLeases}</p><p className="text-xs text-muted-foreground">Contrats actifs</p></div>
        </CardContent></Card>
        <Card className="border-border cursor-pointer hover:shadow-sm transition-shadow"
          onClick={() => setDashboardSection('analytics')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-50"><BarChart3 className="size-5 text-purple-600" /></div>
            <div><p className="text-xl font-bold text-foreground">{data.stats.totalViews}</p><p className="text-xs text-muted-foreground">Vues annonces</p></div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 1. MES BIENS ─────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Building2 className="size-5 text-brand-500" /><h2 className="text-base font-semibold text-foreground">Mes biens</h2></div>
          <Button variant="ghost" size="sm" className="text-brand-500 gap-1" onClick={() => setDashboardSection('my-properties')}>
            Voir tout <ArrowRight className="size-3" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.properties.slice(0, 6).map((p) => (
            <Card key={p.id} className="border-border overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => setDashboardSection('my-properties')}>
              <div className="h-28 bg-gradient-to-br from-brand-600 to-brand-800 relative overflow-hidden">
                {p.images?.[0]?.url ? (
                  <img src={p.images[0].url} alt="" className="absolute inset-0 size-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center"><Building2 className="size-10 text-white/30" /></div>
                )}
                <Badge className={cn(
                  'absolute top-2 right-2 text-[10px] border-0',
                  p.status === 'ACTIVE' ? 'bg-green-500/80 text-white' :
                  p.status === 'RENTED' ? 'bg-teal-500/80 text-white' :
                  p.status === 'PENDING_VERIFICATION' ? 'bg-amber-500/80 text-white' :
                  p.status === 'SUSPENDED' ? 'bg-red-500/80 text-white' :
                  'bg-gray-500/80 text-white'
                )}>
                  {p.status === 'ACTIVE' ? 'Actif' : p.status === 'RENTED' ? 'Loué' :
                   p.status === 'PENDING_VERIFICATION' ? 'En vérif.' : p.status === 'SUSPENDED' ? 'Suspendu' : p.status}
                </Badge>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-semibold text-foreground truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.city} · {p.price.toLocaleString('fr-FR')} FCFA</p>
                {p.bedrooms && <p className="text-[10px] text-muted-foreground mt-1">{p.bedrooms} ch. · {p.type}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* ─── 2. REVENUS (graphique) ────────────────────────────────────── */}
      {data.monthlyRevenue.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-3"><TrendingUp className="size-5 text-brand-500" /><h2 className="text-base font-semibold text-foreground">Revenus</h2></div>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-end gap-2 h-36">
                {data.monthlyRevenue.map((m) => {
                  const monthPart = m.month.split('-')[1]
                  const label = monthLabels[monthPart] || monthPart
                  const height = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] font-medium text-foreground">
                        {m.revenue > 0 ? `${(m.revenue / 1000).toFixed(0)}k` : ''}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-brand-500 to-brand-400 transition-all duration-500 hover:from-brand-600 hover:to-brand-500 cursor-pointer"
                        style={{ height: `${Math.max(height, 3)}%` }}
                        title={`${label}: ${m.revenue.toLocaleString('fr-FR')} FCFA`}
                      />
                      <span className="text-[9px] text-muted-foreground">{label}</span>
                    </div>
                  )
                })}
              </div>
              <Separator className="my-3" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs text-muted-foreground">
                <span>Revenus mensuels: <strong className="text-foreground">{data.stats.totalRevenue.toLocaleString('fr-FR')} FCFA</strong></span>
                <span>Annuel estimé: <strong className="text-foreground">{(data.stats.totalRevenue * 12).toLocaleString('fr-FR')} FCFA</strong></span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── 3. PAIEMENTS RÉCENTS ──────────────────────────────────────── */}
      {data.stats.recentPayments.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-3"><CreditCard className="size-5 text-brand-500" /><h2 className="text-base font-semibold text-foreground">Paiements récents</h2></div>
          <Card className="border-border">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-[11px] text-muted-foreground font-medium">Locataire</th>
                    <th className="text-left py-3 px-4 text-[11px] text-muted-foreground font-medium">Bien</th>
                    <th className="text-right py-3 px-4 text-[11px] text-muted-foreground font-medium">Montant</th>
                    <th className="text-right py-3 px-4 text-[11px] text-muted-foreground font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stats.recentPayments.slice(0, 5).map((p) => (
                    <tr key={p.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-medium text-foreground">
                          {p.tenant ? `${p.tenant.firstName} ${p.tenant.lastName}` : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{p.property?.title || '—'}</td>
                      <td className="py-3 px-4 text-right font-semibold text-foreground">{p.amount.toLocaleString('fr-FR')}</td>
                      <td className="py-3 px-4 text-right">
                        <Badge className={p.status === 'PAID' ? 'bg-green-100 text-green-700' :
                          p.status === 'LATE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                          {p.status === 'PAID' ? 'Payé' : p.status === 'LATE' ? 'Retard' : 'Attente'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── 4. CONTRATS + LOCATIONS + DEMANDES ──────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Locations en cours */}
        <motion.div variants={itemVariants}>
          <Card className="border-border h-full">
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Home className="size-5 text-white" /><h3 className="text-base font-semibold text-white">Locations en cours</h3></div>
                <Badge className="bg-white/20 text-white border-0">{activeLeasesOnly.length}</Badge>
              </div>
            </div>
            <CardContent className="p-4 space-y-3 max-h-72 overflow-y-auto">
              {activeLeasesOnly.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune location active</p>
              ) : activeLeasesOnly.slice(0, 4).map((lease) => (
                <div key={lease.id} className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors space-y-2">
                  <div className="flex items-start sm:items-center gap-3">
                    {lease.tenant.avatarUrl ? (
                      <img src={lease.tenant.avatarUrl} alt="" className="size-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="size-9 rounded-full bg-brand-50 flex items-center justify-center shrink-0"><User className="size-4 text-brand-500" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{lease.tenant.firstName} {lease.tenant.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{lease.property.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">{lease.monthlyRent.toLocaleString('fr-FR')}</p>
                      <PaymentStatusIndicator status={lease.paymentStatus} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Calendar className="size-3" />
                    {new Date(lease.startDate).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })} → {new Date(lease.endDate).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Demandes de visite */}
        <motion.div variants={itemVariants}>
          <Card className="border-border h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div><CardTitle className="text-base font-semibold">Demandes de visite</CardTitle><CardDescription>{data.visitRequests.length} demande(s)</CardDescription></div>
                <Button variant="ghost" size="sm" className="text-brand-500 gap-1" onClick={() => setDashboardSection('my-tenants')}>Voir <ArrowRight className="size-3" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {data.visitRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune demande</p>
              ) : data.visitRequests.slice(0, 5).map((vr) => (
                <div key={vr.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{vr.tenant.firstName} {vr.tenant.lastName}</p>
                    <p className="text-xs text-muted-foreground">{vr.property.title} · {new Date(vr.requestedDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <Badge className={vr.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}>
                    {vr.status === 'PENDING' ? 'En attente' : vr.status === 'ACCEPTED' ? 'Accepté' : vr.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── 5. CONTRATS EXPIRANTS ────────────────────────────────────── */}
      {data.expiringContracts.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-3"><Calendar className="size-5 text-amber-500" /><h2 className="text-base font-semibold text-foreground">Contrats expirant bientôt</h2></div>
          <Card className="border-amber-200 bg-amber-50/30">
            <CardContent className="p-4 space-y-2">
              {data.expiringContracts.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-amber-100">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.property?.title || 'Bien'}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.tenant ? `${c.tenant.firstName} ${c.tenant.lastName}` : '—'} · Expire le {new Date(c.endDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="text-amber-700 border-amber-200 hover:bg-amber-50 text-xs"
                    onClick={() => setDashboardSection('my-tenants')}>
                    Renouveler <ArrowRight className="size-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── 6. PERFORMANCE DES ANNONCES ────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-3"><BarChart3 className="size-5 text-brand-500" /><h2 className="text-base font-semibold text-foreground">Performance des annonces</h2></div>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-muted/60 border border-border/50 text-center">
                <Eye className="size-6 text-brand-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{data.stats.totalViews}</p>
                <p className="text-xs text-muted-foreground">Vues totales</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/60 border border-border/50 text-center">
                <Heart className="size-6 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{data.stats.totalFavorites}</p>
                <p className="text-xs text-muted-foreground">Favoris</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/60 border border-border/50 text-center">
                <Users className="size-6 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{data.stats.pendingVisits + data.stats.activeLeases}</p>
                <p className="text-xs text-muted-foreground">Contacts reçus</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/60 border border-border/50 text-center">
                <TrendingUp className="size-6 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{data.stats.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Taux conversion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
