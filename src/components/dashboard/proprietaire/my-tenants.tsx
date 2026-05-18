'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, UserCircle, Building2, CreditCard, AlertTriangle, ChevronRight, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

// ─── Types ──────────────────────────────────────────────────────────────────
interface TenantLease {
  id: string
  status: string
  startDate: string
  endDate: string
  monthlyRent: number
  charges: number
  deposit: number
  property: {
    id: string
    title: string
    address: string
    city: string
    commune: string | null
    images: Array<{ url: string }>
  }
  payments: Array<{
    id: string
    amount: number
    status: string
    dueDate: string
    paidAt: string | null
  }>
  rentalFile: {
    id: string
    status: string
    monthlyIncome: number | null
    employer: string | null
    employmentType: string | null
  } | null
}

interface TenantWithStats {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  avatarUrl: string | null
  isActive: boolean
  leases: TenantLease[]
  stats: {
    totalPaid: number
    totalDue: number
    latePayments: number
    pendingPayments: number
    activeLeases: number
    hasActiveLease: boolean
  }
}

interface ApiResponse {
  data: TenantWithStats[]
  stats: {
    totalTenants: number
    activeTenants: number
    totalRevenue: number
    latePayments: number
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

const leaseStatusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Actif', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PENDING_SIGNATURE: { label: 'En attente', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  DRAFT: { label: 'Brouillon', color: 'bg-neutral-50 text-neutral-600 border-neutral-200' },
  TERMINATED: { label: 'Résilié', color: 'bg-red-50 text-red-700 border-red-200' },
  EXPIRED: { label: 'Expiré', color: 'bg-neutral-50 text-neutral-500 border-neutral-200' },
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

// ─── Component ──────────────────────────────────────────────────────────────
interface TenantsListProps {
  onDetail: (tenantId: string) => void
}

export function TenantsList({ onDetail }: TenantsListProps) {
  const { isAuthenticated } = useAuthStore()
  const [tenants, setTenants] = useState<TenantWithStats[]>([])
  const [globalStats, setGlobalStats] = useState<ApiResponse['stats']>({
    totalTenants: 0,
    activeTenants: 0,
    totalRevenue: 0,
    latePayments: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchTenants = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const result = await authFetch<ApiResponse>(`/api/tenants?${params.toString()}`)
      setTenants(result.data ?? [])
      setGlobalStats(result.stats ?? { totalTenants: 0, activeTenants: 0, totalRevenue: 0, latePayments: 0 })
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, search])

  useEffect(() => { fetchTenants() }, [fetchTenants])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Mes locataires</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statsCards = [
    { label: 'Total locataires', value: globalStats.totalTenants, icon: Users, color: 'text-brand-600 bg-brand-50' },
    { label: 'Locataires actifs', value: globalStats.activeTenants, icon: UserCircle, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Revenus totaux', value: `${(globalStats.totalRevenue / 1000).toFixed(0)}k`, icon: CreditCard, color: 'text-amber-600 bg-amber-50' },
    { label: 'Paiements en retard', value: globalStats.latePayments, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  ]

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground">Mes locataires</h1>
        <p className="text-muted-foreground mt-1">Gérez vos locataires et suivez leurs paiements</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map(stat => {
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

      {/* Search */}
      <motion.div variants={itemVariants}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un locataire par nom, email ou téléphone..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Tenant List */}
      {tenants.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <UserCircle className="size-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {search ? 'Aucun locataire trouvé pour cette recherche' : 'Vous n\'avez aucun locataire pour le moment'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Les locataires apparaîtront ici lorsque vous aurez des baux actifs
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-3">
          {tenants.map(tenant => {
            const activeLease = tenant.leases.find(l => l.status === 'ACTIVE')
            const property = activeLease?.property || tenant.leases[0]?.property
            const leaseConfig = leaseStatusConfig[activeLease?.status || tenant.leases[0]?.status || 'DRAFT']
            const latestPayment = tenant.leases.flatMap(l => l.payments).sort((a, b) => 
              new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
            )[0]

            return (
              <motion.div key={tenant.id} variants={itemVariants}>
                <Card
                  className="border-border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onDetail(tenant.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-50">
                        {tenant.avatarUrl ? (
                          <img
                            src={tenant.avatarUrl}
                            alt={`${tenant.firstName} ${tenant.lastName}`}
                            className="size-12 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-brand-600">
                            {tenant.firstName[0]}{tenant.lastName[0]}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground truncate">
                            {tenant.firstName} {tenant.lastName}
                          </h3>
                          {leaseConfig && (
                            <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${leaseConfig.color}`}>
                              {leaseConfig.label}
                            </Badge>
                          )}
                          {tenant.stats.latePayments > 0 && (
                            <Badge className="bg-red-100 text-red-700 text-[10px] px-2 py-0">
                              {tenant.stats.latePayments} retard{tenant.stats.latePayments > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          {property && (
                            <span className="flex items-center gap-1 truncate">
                              <Building2 className="size-3" />
                              {property.title}
                            </span>
                          )}
                          {activeLease && (
                            <span className="flex items-center gap-1">
                              <CreditCard className="size-3" />
                              {formatCurrency(activeLease.monthlyRent)}/mois
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs">
                          <span className="text-emerald-600">
                            Payé : {formatCurrency(tenant.stats.totalPaid)}
                          </span>
                          {tenant.stats.pendingPayments > 0 && (
                            <span className="text-amber-600">
                              En attente : {tenant.stats.pendingPayments} échéance{tenant.stats.pendingPayments > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Chevron */}
                      <ChevronRight className="size-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}
