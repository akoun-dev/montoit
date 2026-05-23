'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  Receipt,
  User,
  FileSignature,
  Download,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Circle,
  Smartphone,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimePayments } from '@/hooks/use-realtime-payments'
import { toast } from 'sonner'
import { PaymentDialog } from './payment-dialog'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────
interface PaymentItem {
  id: string
  amount: number
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
    charges: number
    deposit: number
    specialConditions: string | null
    ownerSignedAt: string | null
    tenantSignedAt: string | null
    status: string
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

// ─── Helpers ────────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
  PAID: { label: 'Payé', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  PENDING: { label: 'En attente', color: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
  PROCESSING: { label: 'En cours', color: 'bg-blue-50 text-blue-700 border-blue-200', dotColor: 'bg-blue-500' },
  LATE: { label: 'En retard', color: 'bg-red-50 text-red-700 border-red-200', dotColor: 'bg-red-500' },
  PARTIAL: { label: 'Partiel', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', dotColor: 'bg-cyan-500' },
  CANCELLED: { label: 'Annulé', color: 'bg-muted text-muted-foreground border-border', dotColor: 'bg-neutral-400' },
}

const paymentMethodConfig: Record<string, { label: string; color: string; icon: string }> = {
  ORANGE_MONEY: { label: 'Orange Money', color: 'bg-orange-100 text-orange-700', icon: '/payment-operators/orange-money-logo.webp' },
  MTN_MOMO: { label: 'MTN MoMo', color: 'bg-yellow-100 text-yellow-700', icon: '/payment-operators/mtn-momo-logo.webp' },
  MOOV_MONEY: { label: 'Moov Money', color: 'bg-sky-100 text-sky-700', icon: '/payment-operators/moov-money-logo.webp' },
  WAVE: { label: 'Wave', color: 'bg-teal-100 text-teal-700', icon: '/payment-operators/wave-logo.png' },
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Timeline Steps ─────────────────────────────────────────────────────────
interface TimelineStep {
  label: string
  description: string
  status: 'completed' | 'current' | 'pending'
}

function getTimelineSteps(paymentStatus: string, createdAt: string, paidAt: string | null): TimelineStep[] {
  const isPaid = paymentStatus === 'PAID'
  const isProcessing = paymentStatus === 'PROCESSING'

  return [
    {
      label: 'Créé',
      description: `Paiement créé le ${formatShortDate(createdAt)}`,
      status: 'completed',
    },
    {
      label: 'En cours',
      description: isProcessing
        ? 'Paiement en cours de traitement'
        : isPaid
          ? 'Paiement traité'
          : 'En attente de paiement',
      status: isProcessing ? 'current' : isPaid ? 'completed' : 'pending',
    },
    {
      label: 'Payé',
      description: isPaid && paidAt
        ? `Payé le ${formatShortDate(paidAt)}`
        : 'En attente de confirmation',
      status: isPaid ? 'completed' : 'pending',
    },
  ]
}

// ─── Component ──────────────────────────────────────────────────────────────
interface PaymentDetailProps {
  paymentId: string
  onBack: () => void
}

export function PaymentDetail({ paymentId, onBack }: PaymentDetailProps) {
  const { user, isAuthenticated } = useAuthStore()
  const [payment, setPayment] = useState<PaymentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchPayment = useCallback(async (skipCache = false) => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const result = await authFetch<{ data: PaymentItem }>(`/api/payments/${paymentId}`, skipCache ? { skipCache: true } : undefined)
      if (result.data) {
        setPayment(result.data)
      } else {
        setError('Paiement introuvable')
      }
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      if (err instanceof AuthError && err.status === 404) {
        setError('Paiement introuvable')
      } else {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, paymentId])

  useEffect(() => { fetchPayment() }, [fetchPayment])

  // Realtime — refresh when payment status changes (after mobile money callback)
  useRealtimePayments({
    userId: user?.id,
    onPaymentChange: (event, payment) => {
      if (event === 'UPDATE' && payment.id === paymentId) fetchPayment(true)
    },
  })

  const handleRefreshStatus = async () => {
    setIsRefreshing(true)
    try {
      await fetchPayment()
      toast.success('Statut mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handlePaymentSuccess = () => {
    fetchPayment()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="size-4" /> Retour
        </Button>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">{error || 'Paiement introuvable'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const config = statusConfig[payment.status] || statusConfig.PENDING
  const property = payment.lease?.property
  const owner = payment.lease?.owner
  const methodConfig = payment.method ? paymentMethodConfig[payment.method] : null
  const timelineSteps = getTimelineSteps(payment.status, payment.createdAt, payment.paidAt)

  const handleDownloadReceipt = () => {
    if (payment.status !== 'PAID') {
      toast.error('Quittance disponible uniquement pour les paiements effectués')
      return
    }
    const receiptContent = `
═══════════════════════════════════════
         QUITTANCE DE LOYER
         MON TOIT — ANSUT
═══════════════════════════════════════

Référence : ${payment.reference || 'N/A'}
Date d'émission : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}

───────────────────────────────────────
LOCATAIRE
───────────────────────────────────────
Nom : Non renseigné

───────────────────────────────────────
PROPRIÉTAIRE
───────────────────────────────────────
Nom : ${owner ? `${owner.firstName} ${owner.lastName}` : 'Non renseigné'}

───────────────────────────────────────
BIEN LOUÉ
───────────────────────────────────────
Titre : ${property?.title || 'Non renseigné'}
Adresse : ${property ? `${property.address}, ${property.city}` : 'Non renseigné'}

───────────────────────────────────────
DÉTAILS DU PAIEMENT
───────────────────────────────────────
Mois concerné : ${new Date(payment.dueDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
Montant du loyer : ${formatCurrency(payment.lease?.monthlyRent || payment.amount)}
Charges : ${formatCurrency(payment.lease?.charges || 0)}
Total payé : ${formatCurrency(payment.amount)}
Méthode de paiement : ${methodConfig?.label || 'Non renseignée'}
Date de paiement : ${payment.paidAt ? formatDate(payment.paidAt) : 'Non renseignée'}

═══════════════════════════════════════
Le propriétaire reconnaît avoir reçu
le montant ci-dessus en paiement du
loyer et des charges pour la période
indiquée.
═══════════════════════════════════════
    `.trim()

    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `quittance-${new Date(payment.dueDate).toISOString().slice(0, 7)}-${payment.reference || payment.id.slice(0, 8)}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Quittance téléchargée')
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-brand-500/10 to-transparent -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 rounded-none">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground -ml-2 mb-3">
          <ArrowLeft className="size-4" /> Retour aux paiements
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand-100">
            <CreditCard className="size-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Détail du paiement</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {property?.title || 'Loyer'} — {formatShortDate(payment.dueDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className={`text-xs px-3 py-1 border ${config.color}`}>
            <span className={`size-2 rounded-full ${config.dotColor} mr-1.5`} />
            {config.label}
          </Badge>
          {payment.status === 'PAID' && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-brand-600 border-brand-200 hover:bg-brand-50 hover:text-brand-700 text-xs h-7"
              onClick={handleDownloadReceipt}
            >
              <Download className="size-3.5" />
              Quittance
            </Button>
          )}
        </div>
      </div>

      {/* Amount card */}
      <Card className="border-border">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-50">
              <CreditCard className="size-6 text-brand-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Montant</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{formatCurrency(payment.amount)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Date d&apos;échéance</p>
                <p className="text-sm font-medium text-foreground">{formatDate(payment.dueDate)}</p>
              </div>
            </div>
            {payment.paidAt && (
              <div className="flex items-center gap-3">
                <Calendar className="size-4 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Date de paiement</p>
                  <p className="text-sm font-medium text-emerald-700">{formatDate(payment.paidAt)}</p>
                </div>
              </div>
            )}
            {payment.reference && (
              <div className="flex items-center gap-3">
                <Receipt className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Référence</p>
                  <p className="text-sm font-mono font-medium text-foreground">{payment.reference}</p>
                </div>
              </div>
            )}
            {methodConfig && (
              <div className="flex items-center gap-3">
                <Smartphone className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Méthode de paiement</p>
                  <div className="flex items-center gap-1.5">
                    <img src={methodConfig.icon} alt={`Logo ${methodConfig.label}`} className="size-4 object-contain" />
                    <Badge className={cn('text-[10px] px-1.5 py-0 border-0', methodConfig.color)}>
                      {methodConfig.label}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action area for PENDING / PROCESSING */}
      {(payment.status === 'PENDING' || payment.status === 'LATE') && (
        <Card className="border-brand-200 bg-brand-50/50">
          <CardContent className="p-5 sm:p-6 flex flex-col items-center text-center">
            <CreditCard className="size-8 text-brand-500 mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {payment.status === 'LATE' ? 'Paiement en retard' : 'Paiement en attente'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {payment.status === 'LATE'
                ? 'Votre paiement est en retard. Veuillez régler dès maintenant.'
                : 'Votre paiement est en attente. Réglez maintenant via mobile money.'}
            </p>
            <Button
              size="lg"
              onClick={() => setDialogOpen(true)}
              className="gap-2 w-full sm:w-auto"
            >
              <CreditCard className="size-4" />
              Payer maintenant
            </Button>
          </CardContent>
        </Card>
      )}

      {payment.status === 'PROCESSING' && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-5 sm:p-6 flex flex-col items-center text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="size-8 text-blue-500" />
            </motion.div>
            <h3 className="text-lg font-semibold text-foreground mt-3 mb-1">
              Paiement en cours de traitement
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Veuillez valider le paiement sur votre téléphone
            </p>
            <Button
              variant="outline"
              onClick={handleRefreshStatus}
              disabled={isRefreshing}
              className="gap-2"
            >
              {isRefreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Vérifier le statut
            </Button>
          </CardContent>
        </Card>
      )}

      {payment.status === 'PAID' && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-5 sm:p-6 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <CheckCircle2 className="size-8 text-emerald-500" />
            </motion.div>
            <h3 className="text-lg font-semibold text-foreground mt-3 mb-1">
              Paiement confirmé
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ce paiement a été effectué avec succès
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadReceipt}
                className="gap-1.5 text-brand-600 border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              >
                <Download className="size-3.5" />
                Télécharger la quittance
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Timeline */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Receipt className="size-4" /> Suivi du paiement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {timelineSteps.map((step, index) => (
              <div key={step.label} className="flex gap-3">
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center">
                  {step.status === 'completed' ? (
                    <div className="flex size-7 items-center justify-center rounded-full bg-emerald-100">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    </div>
                  ) : step.status === 'current' ? (
                    <div className="flex size-7 items-center justify-center rounded-full bg-blue-100">
                      <Loader2 className="size-4 text-blue-600 animate-spin" />
                    </div>
                  ) : (
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted">
                      <Circle className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  {index < timelineSteps.length - 1 && (
                    <div className={cn(
                      'w-0.5 h-8',
                      step.status === 'completed' ? 'bg-emerald-200' : 'bg-border'
                    )} />
                  )}
                </div>
                {/* Step content */}
                <div className="pb-4">
                  <p className={cn(
                    'text-sm font-medium',
                    step.status === 'completed' ? 'text-emerald-700' :
                    step.status === 'current' ? 'text-blue-700' :
                    'text-muted-foreground'
                  )}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Property info + Lease & Owner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Property info */}
        {property && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="size-4" /> Bien concerné
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                {property.images?.[0]?.url ? (
                  <div className="size-16 sm:size-20 rounded-lg bg-muted overflow-hidden shrink-0">
                    <img src={property.images[0].url} alt={property.title} className="size-full object-cover" />
                  </div>
                ) : (
                  <div className="size-16 sm:size-20 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                    <Building2 className="size-8 text-brand-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">{property.title}</h3>
                  <p className="text-sm text-muted-foreground">{property.address}, {property.city}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lease info */}
        {payment.lease && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileSignature className="size-4" /> Bail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Loyer mensuel</span>
                <span className="font-medium text-foreground">{formatCurrency(payment.lease.monthlyRent)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Charges</span>
                <span className="font-medium text-foreground">{formatCurrency(payment.lease.charges || 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Début</span>
                <span className="font-medium text-foreground">{formatShortDate(payment.lease.startDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fin</span>
                <span className="font-medium text-foreground">{formatShortDate(payment.lease.endDate)}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Owner info */}
      {owner && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="size-4" /> Propriétaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <span className="text-sm font-semibold text-muted-foreground">
                  {owner.firstName[0]}{owner.lastName[0]}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {owner.firstName} {owner.lastName}
                </p>
                <p className="text-xs text-muted-foreground">Propriétaire du bien</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <PaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        payment={payment}
        onSuccess={handlePaymentSuccess}
      />
    </motion.div>
  )
}
