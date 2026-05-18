'use client'

import { useState, useEffect, useCallback } from 'react'
import { CreditCard, Calendar, TrendingUp, AlertTriangle, Building2, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

// ─── Types ──────────────────────────────────────────────────────────────────
interface PaymentItem {
  id: string
  amount: number
  status: string
  dueDate: string
  paidAt: string | null
  reference: string | null
  createdAt: string
  lease: {
    id: string
    startDate: string
    endDate: string
    monthlyRent: number
    property: {
      id: string
      title: string
      address: string
      city: string
      images: Array<{ url: string }>
    }
    owner: {
      id: string
      firstName: string
      lastName: string
    }
  }
}

interface PaymentsResponse {
  data: PaymentItem[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  stats: {
    totalPaid: number
    latePaymentsCount: number
    nextPaymentDue: { amount: number; dueDate: string } | null
    totalPayments: number
    paidCount: number
    pendingCount: number
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
  PAID: { label: 'Payé', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  PENDING: { label: 'En attente', color: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
  LATE: { label: 'En retard', color: 'bg-red-50 text-red-700 border-red-200', dotColor: 'bg-red-500' },
  PARTIAL: { label: 'Partiel', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', dotColor: 'bg-cyan-500' },
  CANCELLED: { label: 'Annulé', color: 'bg-muted text-muted-foreground border-border', dotColor: 'bg-neutral-400' },
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Animation Variants ────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

interface PaymentsProps {
  onDetail: (id: string) => void
}

export function Payments({ onDetail }: PaymentsProps) {
  const { user, isAuthenticated } = useAuthStore()
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [stats, setStats] = useState<PaymentsResponse['stats'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const result = await authFetch<PaymentsResponse>('/api/payments')
      setPayments(result.data ?? [])
      setStats(result.stats ?? null)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) { setPayments([]); return }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  // ─── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  // ─── Error state ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mes Paiements</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Impossible de charger vos paiements. Veuillez réessayer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mes Paiements</h1>
        <p className="text-muted-foreground mt-1">Historique et suivi de vos paiements</p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="size-4 text-brand-500" />
                <p className="text-xs text-muted-foreground">Prochain paiement</p>
              </div>
              <p className="text-lg font-bold text-foreground">
                {stats?.nextPaymentDue
                  ? formatCurrency(stats.nextPaymentDue.amount)
                  : '—'}
              </p>
              {stats?.nextPaymentDue && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Échéance {formatDate(stats.nextPaymentDue.dueDate)}
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="size-4 text-emerald-500" />
                <p className="text-xs text-muted-foreground">Total payé</p>
              </div>
              <p className="text-lg font-bold text-foreground">
                {stats?.totalPaid ? formatCurrency(stats.totalPaid) : '0 FCFA'}
              </p>
              {stats?.paidCount ? (
                <p className="text-xs text-muted-foreground mt-0.5">{stats.paidCount} paiement{stats.paidCount > 1 ? 's' : ''}</p>
              ) : null}
            </CardContent>
          </Card>
          <Card className="border-border col-span-2 lg:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={`size-4 ${(stats?.latePaymentsCount ?? 0) > 0 ? 'text-red-500' : 'text-neutral-300'}`} />
                <p className="text-xs text-muted-foreground">En retard</p>
              </div>
              <p className={`text-lg font-bold ${(stats?.latePaymentsCount ?? 0) > 0 ? 'text-red-600' : 'text-foreground'}`}>
                {stats?.latePaymentsCount ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Payments List or Empty State */}
      {payments.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-border bg-muted/50">
            <CardContent className="py-12 flex flex-col items-center text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 mb-4">
                <CreditCard className="size-7 text-brand-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Aucun paiement enregistré
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {user?.firstName}, vos paiements de loyer apparaîtront ici une fois votre bail actif.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-3">
          {payments.map((payment) => {
            const config = statusConfig[payment.status] || statusConfig.PENDING
            const property = payment.lease?.property

            return (
              <motion.div key={payment.id} variants={itemVariants}>
                <Card
                  className="border-border hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => onDetail(payment.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Property icon */}
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                        <Building2 className="size-5 text-brand-500" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {property?.title || 'Loyer'}
                          </p>
                          <Badge variant="outline" className={`shrink-0 text-[10px] px-2 py-0.5 border ${config.color}`}>
                            <span className={`size-1.5 rounded-full ${config.dotColor} mr-1`} />
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 truncate">
                          {property?.address}, {property?.city}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-foreground">
                            {formatCurrency(payment.amount)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Échéance : {formatDate(payment.dueDate)}</span>
                            <ChevronRight className="size-3.5 text-neutral-300" />
                          </div>
                        </div>
                      </div>
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
