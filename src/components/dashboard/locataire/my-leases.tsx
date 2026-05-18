'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileSignature, Building2, User, ChevronRight, Clock, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

// ─── Types ──────────────────────────────────────────────────────────────────
interface LeaseItem {
  id: string
  status: string
  monthlyRent: number
  charges: number
  deposit: number
  startDate: string
  endDate: string
  property: {
    id: string
    title: string
    images: Array<{ url: string }>
  }
  owner: {
    id: string
    firstName: string
    lastName: string
  }
  tenant: {
    id: string
    firstName: string
    lastName: string
  }
  payments?: Array<{
    id: string
    amount: number
    status: string
    dueDate: string
  }>
}

// ─── Status config ──────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-muted text-muted-foreground' },
  PENDING_SIGNATURE: { label: 'En attente de signature', color: 'bg-amber-50 text-amber-700' },
  ACTIVE: { label: 'Actif', color: 'bg-emerald-50 text-emerald-700' },
  TERMINATED: { label: 'Résilié', color: 'bg-red-50 text-red-700' },
  EXPIRED: { label: 'Expiré', color: 'bg-neutral-100 text-neutral-600' },
}

type TabType = 'active' | 'previous'

interface MyLeasesProps {
  onDetail: (id: string) => void
}

export function MyLeases({ onDetail }: MyLeasesProps) {
  const { isAuthenticated } = useAuthStore()
  const [allLeases, setAllLeases] = useState<LeaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('active')

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const result = await authFetch<{ data: LeaseItem[] }>('/api/leases')
      setAllLeases(result.data ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setAllLeases([])
        return
      }
      setAllLeases([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter leases based on tab
  const activeLeases = allLeases.filter(
    (l) => l.status === 'ACTIVE' || l.status === 'PENDING_SIGNATURE'
  )
  const previousLeases = allLeases.filter(
    (l) => l.status === 'TERMINATED' || l.status === 'EXPIRED'
  )
  const displayedLeases = activeTab === 'active' ? activeLeases : previousLeases

  if (loading) {
    return <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mes baux</h1>
        <p className="text-muted-foreground mt-1">Consultez vos contrats de location</p>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'active'
              ? 'bg-brand-500 text-white'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          Baux actifs ({activeLeases.length})
        </button>
        <button
          onClick={() => setActiveTab('previous')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'previous'
              ? 'bg-brand-500 text-white'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          Baux précédents ({previousLeases.length})
        </button>
      </div>

      {/* Lease List */}
      {displayedLeases.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            {activeTab === 'active' ? (
              <>
                <FileSignature className="size-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun bail actif</p>
              </>
            ) : (
              <>
                <Clock className="size-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun bail précédent</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayedLeases.map((lease) => {
            const statusInfo = statusConfig[lease.status] || statusConfig.ACTIVE
            return (
              <Card
                key={lease.id}
                className="border-border hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => onDetail(lease.id)}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    {/* Property image */}
                    {lease.property.images?.[0] ? (
                      <div className="size-14 sm:size-16 rounded-lg bg-muted overflow-hidden shrink-0">
                        <img src={lease.property.images[0].url} alt="" className="size-full object-cover" />
                      </div>
                    ) : (
                      <div className="size-14 sm:size-16 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                        <Building2 className="size-6 text-brand-400" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground text-sm truncate">{lease.property.title}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <User className="size-3" />
                            {lease.owner.firstName} {lease.owner.lastName}
                          </div>
                        </div>
                        <Badge className={`${statusInfo.color} text-[10px] shrink-0`}>
                          {lease.status === 'TERMINATED' && <XCircle className="size-3 mr-0.5" />}
                          {statusInfo.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Loyer</span>
                          <p className="font-semibold text-foreground">{lease.monthlyRent.toLocaleString('fr-FR')} FCFA</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Charges</span>
                          <p className="font-semibold text-foreground">{lease.charges?.toLocaleString('fr-FR') || 0} FCFA</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Début</span>
                          <p className="font-medium text-foreground">{new Date(lease.startDate).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fin</span>
                          <p className="font-medium text-foreground">{new Date(lease.endDate).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="size-5 text-neutral-300 shrink-0 self-center" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
