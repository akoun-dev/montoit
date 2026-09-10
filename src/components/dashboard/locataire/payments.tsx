'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Building2,
  ChevronRight,
  Loader2,
  Smartphone,
  Zap,
  CheckCircle2,
  Hourglass,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimePayments } from '@/hooks/use-realtime-payments'
import { PaymentDialog } from './payment-dialog'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────
interface PaymentItem {
  id: string
  amount: number
  amountPaid?: number
  status: string
  dueDate: string
  paidAt: string | null
  reference: string | null
  method: string | null
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
    processingCount: number
  }
  activeLease?: {
    id: string
    monthlyRent: number
    property: { title: string }
    owner: { firstName: string; lastName: string }
  } | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
  PAID: { label: 'Payé', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  PENDING: { label: 'En attente', color: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
  PROCESSING: { label: 'En cours', color: 'bg-blue-50 text-blue-700 border-blue-200', dotColor: 'bg-blue-500' },
  LATE: { label: 'En retard', color: 'bg-red-50 text-red-700 border-red-200', dotColor: 'bg-red-500' },
  PARTIAL: { label: 'Partiel', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', dotColor: 'bg-cyan-500' },
  CANCELLED: { label: 'Annulé', color: 'bg-muted text-muted-foreground border-border', dotColor: 'bg-neutral-400' },
}

const paymentMethodConfig: Record<string, { label: string; color: string }> = {
  ORANGE_MONEY: { label: 'Orange Money', color: 'bg-orange-100 text-orange-700' },
  MTN_MOMO: { label: 'MTN MoMo', color: 'bg-yellow-100 text-yellow-700' },
  MOOV_MONEY: { label: 'Moov Money', color: 'bg-sky-100 text-sky-700' },
  WAVE: { label: 'Wave', color: 'bg-teal-100 text-teal-700' },
}

type FilterTab = 'ALL' | 'PENDING' | 'PROCESSING' | 'PAID' | 'LATE'

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'Tous' },
  { key: 'PENDING', label: 'En attente' },
  { key: 'PROCESSING', label: 'En cours' },
  { key: 'PAID', label: 'Payés' },
  { key: 'LATE', label: 'En retard' },
]

function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Payment type row helpers ───────────────────────────────────────────────
type PaymentTypeConfig = {
  key: string
  label: string
  referencePrefix: string | null
  icon: 'check' | 'trending'
  isRecurring?: boolean
}

const PAYMENT_TYPES: PaymentTypeConfig[] = [
  { key: 'caution', label: 'Caution (dépôt de garantie)', referencePrefix: 'CAUTION-', icon: 'check' },
  { key: 'avance', label: 'Avance sur loyer', referencePrefix: 'AVANCE-', icon: 'check' },
  { key: 'agence', label: "Frais d'agence", referencePrefix: 'AGENCE-', icon: 'check' },
  { key: 'loyer', label: 'Loyer mensuel', referencePrefix: null, icon: 'trending', isRecurring: true },
]

function renderPaymentRowIcon(status: string, icon: PaymentTypeConfig['icon']) {
  if (icon === 'check') {
    const isPaid = status === 'PAID'
    return (
      <div className={cn(
        'flex size-8 items-center justify-center rounded-full shrink-0',
        isPaid ? 'bg-emerald-50' : 'bg-amber-50'
      )}>
        {isPaid
          ? <CheckCircle2 className="size-4 text-emerald-500" />
          : <Hourglass className="size-4 text-amber-500" />
        }
      </div>
    )
  }
  return (
    <div className="flex size-8 items-center justify-center rounded-full bg-blue-50 shrink-0">
      <TrendingUp className="size-4 text-blue-500" />
    </div>
  )
}

function renderPaymentBadge(status: string) {
  const isPaid = status === 'PAID'
  return (
    <Badge className={cn(
      'shrink-0 text-[10px] px-2 py-0.5',
      isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
      status === 'LATE' ? 'bg-red-50 text-red-700 border-red-200' :
      'bg-amber-50 text-amber-700 border-amber-200'
    )}>
      <span className={cn(
        'size-1.5 rounded-full mr-1',
        isPaid ? 'bg-emerald-500' :
        status === 'LATE' ? 'bg-red-500' :
        'bg-amber-500'
      )} />
      {isPaid ? 'Payé' : status === 'LATE' ? 'En retard' : 'En attente'}
    </Badge>
  )
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
  const [activeLease, setActiveLease] = useState<PaymentsResponse['activeLease']>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL')
  const [page, setPage] = useState(1)
  const limit = 10
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null)
  const [advancing, setAdvancing] = useState(false)

  const fetchPayments = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const result = await authFetch<PaymentsResponse>('/api/payments')
      setPayments(result.data ?? [])
      setStats(result.stats ?? null)
      setActiveLease(result.activeLease ?? null)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) { setPayments([]); return }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  useEffect(() => {
    setPage(1)
  }, [activeFilter])

  // Realtime subscription for payments
  useRealtimePayments({
    userId: user?.id,
    onPaymentChange: (event, payment) => {
      if (event === 'INSERT') {
        fetchPayments()
      } else {
        setPayments((prev) =>
          prev.map((p) =>
            p.id === payment.id
              ? { ...p, status: payment.status, paidAt: payment.paid_at, reference: payment.reference }
              : p
          )
        )
      }
    },
  })

  // Filter payments based on active tab
  const filteredPayments = payments.filter((p) => {
    if (activeFilter === 'ALL') return true
    if (activeFilter === 'LATE') return p.status === 'LATE'
    return p.status === activeFilter
  })

  const paginatedPayments = useMemo(() => {
    const start = (page - 1) * limit
    return filteredPayments.slice(start, start + limit)
  }, [filteredPayments, page, limit])

  const handlePay = (e: React.MouseEvent, payment: PaymentItem) => {
    e.stopPropagation()
    setSelectedPayment(payment)
    setDialogOpen(true)
  }

  const handlePaymentSuccess = () => {
    fetchPayments()
  }

  const handleAdvancePayment = async () => {
    setAdvancing(true)
    try {
      const result = await authFetch<{ data: PaymentItem }>('/api/payments/advance', {
        method: 'POST',
      })
      const newPayment = result.data
      if (!newPayment) throw new Error('Aucun paiement créé')
      setPayments((prev) => [newPayment, ...prev])
      setSelectedPayment(newPayment)
      setDialogOpen(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création du paiement')
    } finally {
      setAdvancing(false)
    }
  }

  // ─── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 bg-muted animate-pulse rounded-full" />
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
      <motion.div variants={itemVariants} className="bg-gradient-to-r from-brand-500/10 to-transparent rounded-xl p-4 sm:p-6 -mx-4 sm:-mx-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand-100 shrink-0">
            <CreditCard className="size-6 text-brand-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mes Paiements</h1>
            <p className="text-muted-foreground mt-0.5">Historique et suivi de vos paiements</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="secondary" className="bg-brand-50 text-brand-700">
            <TrendingUp className="size-3 mr-1" /> {stats?.totalPayments ?? 0} total
          </Badge>
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
            {stats?.paidCount ?? 0} payés
          </Badge>
          <Badge variant="secondary" className="bg-amber-50 text-amber-700">
            {stats?.pendingCount ?? 0} en attente
          </Badge>
          {(stats?.latePaymentsCount ?? 0) > 0 && (
            <Badge variant="secondary" className="bg-red-50 text-red-700">
              <AlertTriangle className="size-3 mr-1" /> {stats!.latePaymentsCount} retard
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                <AlertTriangle className={`size-4 ${(stats?.latePaymentsCount ?? 0) > 0 ? 'text-red-500' : 'text-neutral-300'}`} />
                <p className="text-xs text-muted-foreground">En retard</p>
              </div>
              <p className={`text-lg font-bold ${(stats?.latePaymentsCount ?? 0) > 0 ? 'text-red-600' : 'text-foreground'}`}>
                {stats?.latePaymentsCount ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="size-4 text-amber-500" />
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
              <p className={`text-lg font-bold ${(stats?.pendingCount ?? 0) > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                {stats?.pendingCount ?? 0}
              </p>
              {(stats?.processingCount ?? 0) > 0 && (
                <p className="text-xs text-blue-600 mt-0.5">
                  {stats!.processingCount} en cours
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Récapitulatif des charges par type */}
      {activeLease && payments.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-border overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-brand-500/10 to-transparent px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CreditCard className="size-4 text-brand-500" />
                  Récapitulatif des charges
                </h3>
              </div>
              <div className="divide-y divide-border">
                {PAYMENT_TYPES.map((pt) => {
                  if (pt.referencePrefix) {
                    const payment = payments.find(p => p.reference?.startsWith(pt.referencePrefix!))
                    const status = payment?.status || 'PENDING'
                    const amount = payment?.amount || 0
                    const canPay = payment && (status === 'PENDING' || status === 'LATE')
                    return (
                      <div key={pt.key} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          {renderPaymentRowIcon(status, pt.icon)}
                          <div>
                            <p className="text-sm font-medium text-foreground">{pt.label}</p>
                            <p className="text-xs text-muted-foreground">{amount.toLocaleString('fr-FR')} FCFA</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canPay ? (
                            <Button
                              size="sm"
                              onClick={(e) => handlePay(e, payment)}
                              className={cn(
                                'h-7 text-xs gap-1 px-3',
                                status === 'LATE' && 'bg-red-600 hover:bg-red-700 text-white'
                              )}
                            >
                              <CreditCard className="size-3" />
                              {status === 'LATE' ? 'Régulariser' : 'Payer'}
                            </Button>
                          ) : null}
                          {renderPaymentBadge(status)}
                        </div>
                      </div>
                    )
                  }
                  // Loyer mensuel (pas de referencePrefix)
                  const paidRents = payments.filter(p => p.status === 'PAID' && !p.reference?.startsWith('CAUTION-') && !p.reference?.startsWith('AVANCE-') && !p.reference?.startsWith('AGENCE-')).length
                  return (
                    <div key={pt.key} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        {renderPaymentRowIcon('PAID', pt.icon)}
                        <div>
                          <p className="text-sm font-medium text-foreground">{pt.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {activeLease.monthlyRent.toLocaleString('fr-FR')} FCFA/mois
                            {paidRents > 0 && ` · ${paidRents} payé${paidRents > 1 ? 's' : ''}`}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-2 py-0.5">
                        {pt.isRecurring ? 'Récurrent' : 'Unique'}
                      </Badge>
                    </div>
                  )
                })}

                {/* Total restant dû */}
                {(() => {
                  const pendingTotal = payments
                    .filter(p => p.status === 'PENDING' || p.status === 'LATE')
                    .reduce((sum, p) => sum + p.amount, 0)
                  if (pendingTotal <= 0) return null
                  return (
                    <div className="flex items-center justify-between px-4 py-3 bg-amber-50/50 border-t-2 border-amber-200/50">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-amber-100 shrink-0">
                          <AlertTriangle className="size-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Total restant dû</p>
                          <p className="text-xs text-amber-600">{payments.filter(p => p.status === 'PENDING').length} en attente · {payments.filter(p => p.status === 'LATE').length} en retard</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-amber-700">{pendingTotal.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                  )
                })()}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filter Tabs */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                activeFilter === tab.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Advance payment banner */}
      {activeLease && stats && stats.pendingCount === 0 && stats.latePaymentsCount === 0 && activeFilter === 'ALL' && (
        <motion.div variants={itemVariants}>
          <Card className="border-brand-200 bg-gradient-to-r from-brand-50/80 to-background">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100">
                  <Zap className="size-5 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Vous êtes à jour !</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeLease.property.title} — {activeLease.monthlyRent.toLocaleString('fr-FR')} FCFA/mois
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Anticipez votre prochain loyer en payant en avance.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleAdvancePayment}
                disabled={advancing}
                className="shrink-0 h-9 gap-1.5"
              >
                {advancing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CreditCard className="size-4" />
                )}
                Payer en avance
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Payments List or Empty State */}
      {filteredPayments.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-border bg-muted/50">
            <CardContent className="py-12 flex flex-col items-center text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 mb-4">
                <CreditCard className="size-7 text-brand-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {activeFilter === 'ALL'
                  ? 'Aucun paiement enregistré'
                  : `Aucun paiement ${filterTabs.find(t => t.key === activeFilter)?.label.toLowerCase()}`}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {activeFilter === 'ALL'
                  ? `${user?.firstName || ''}, vos paiements de loyer apparaîtront ici une fois votre bail actif.`
                  : 'Aucun paiement ne correspond à ce filtre.'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
        <motion.div variants={containerVariants} className="space-y-3">
          {paginatedPayments.map((payment) => {
            const config = statusConfig[payment.status] || statusConfig.PENDING
            const property = payment.lease?.property
            const owner = payment.lease?.owner
            const methodConfig = payment.method ? paymentMethodConfig[payment.method] : null

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
                        <p className="text-xs text-muted-foreground mb-1 truncate">
                          {owner ? `${owner.firstName} ${owner.lastName}` : ''}{property?.address ? ` — ${property.address}` : ''}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-bold text-foreground">
                              {formatCurrency(payment.amount)}
                            </p>
                            {payment.status === 'PARTIAL' && (
                              <span className="text-[10px] text-cyan-700">
                                reste {formatCurrency(payment.amount - (payment.amountPaid || 0))}
                              </span>
                            )}
                            {methodConfig && (
                              <Badge className={cn('text-[9px] px-1.5 py-0 border-0', methodConfig.color)}>
                                <Smartphone className="size-2.5 mr-0.5" />
                                {methodConfig.label}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Échéance : {formatDate(payment.dueDate)}
                          </span>
                        </div>

                        {/* Action area */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                          {payment.status === 'PENDING' && (
                            <Button
                              size="sm"
                              onClick={(e) => handlePay(e, payment)}
                              className="h-7 text-xs gap-1.5"
                            >
                              <CreditCard className="size-3" />
                              Payer
                            </Button>
                          )}
                          {payment.status === 'PROCESSING' && (
                            <div className="flex items-center gap-1.5 text-xs text-blue-600">
                              <Loader2 className="size-3 animate-spin" />
                              En cours de traitement
                            </div>
                          )}
                          {payment.status === 'PAID' && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                              {payment.reference && (
                                <span className="font-mono">Réf : {payment.reference.slice(0, 8)}</span>
                              )}
                            </div>
                          )}
                          {(payment.status === 'LATE') && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => handlePay(e, payment)}
                              className="h-7 text-xs gap-1.5"
                            >
                              <CreditCard className="size-3" />
                              Payer maintenant
                            </Button>
                          )}
                          {payment.status === 'PARTIAL' && (
                            <Button
                              size="sm"
                              onClick={(e) => handlePay(e, payment)}
                              className="h-7 text-xs gap-1.5"
                            >
                              <CreditCard className="size-3" />
                              Solder le paiement
                            </Button>
                          )}
                          <ChevronRight className="size-4 text-neutral-300" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
        <PaginationControls
          page={page}
          totalPages={Math.ceil(filteredPayments.length / limit)}
          total={filteredPayments.length}
          limit={limit}
          onPageChange={setPage}
        />
        </>
      )}

      {/* Payment Dialog */}
      <PaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        payment={selectedPayment}
        onSuccess={handlePaymentSuccess}
      />
    </motion.div>
  )
}
