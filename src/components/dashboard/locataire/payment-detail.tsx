'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Building2, Calendar, CreditCard, Receipt, User, FileSignature } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
  LATE: { label: 'En retard', color: 'bg-red-50 text-red-700 border-red-200', dotColor: 'bg-red-500' },
  PARTIAL: { label: 'Partiel', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', dotColor: 'bg-cyan-500' },
  CANCELLED: { label: 'Annulé', color: 'bg-neutral-50 text-neutral-500 border-neutral-200', dotColor: 'bg-neutral-400' },
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

// ─── Component ──────────────────────────────────────────────────────────────
interface PaymentDetailProps {
  paymentId: string
  onBack: () => void
}

export function PaymentDetail({ paymentId, onBack }: PaymentDetailProps) {
  const { isAuthenticated } = useAuthStore()
  const [payment, setPayment] = useState<PaymentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPayment = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const result = await authFetch<{ data: PaymentItem }>(`/api/payments/${paymentId}`)
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-neutral-100 animate-pulse rounded" />
        <div className="h-64 bg-neutral-100 animate-pulse rounded-xl" />
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-neutral-600">
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

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="gap-2 text-neutral-600 -ml-2">
        <ArrowLeft className="size-4" /> Retour aux paiements
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Détail du paiement</h1>
          <p className="text-neutral-500 mt-1 text-sm">
            {property?.title || 'Loyer'} — {formatShortDate(payment.dueDate)}
          </p>
        </div>
        <Badge variant="outline" className={`shrink-0 text-xs px-3 py-1 border ${config.color} w-fit`}>
          <span className={`size-2 rounded-full ${config.dotColor} mr-1.5`} />
          {config.label}
        </Badge>
      </div>

      {/* Amount card */}
      <Card className="border-neutral-200">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
              <CreditCard className="size-5 text-brand-500" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Montant</p>
              <p className="text-2xl font-bold text-neutral-900">{formatCurrency(payment.amount)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="size-4 text-neutral-400 shrink-0" />
              <div>
                <p className="text-xs text-neutral-400">Date d&apos;échéance</p>
                <p className="text-sm font-medium text-neutral-700">{formatDate(payment.dueDate)}</p>
              </div>
            </div>
            {payment.paidAt && (
              <div className="flex items-center gap-3">
                <Calendar className="size-4 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs text-neutral-400">Date de paiement</p>
                  <p className="text-sm font-medium text-emerald-700">{formatDate(payment.paidAt)}</p>
                </div>
              </div>
            )}
            {payment.reference && (
              <div className="flex items-center gap-3">
                <Receipt className="size-4 text-neutral-400 shrink-0" />
                <div>
                  <p className="text-xs text-neutral-400">Référence</p>
                  <p className="text-sm font-mono font-medium text-neutral-700">{payment.reference}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Property info */}
      {property && (
        <Card className="border-neutral-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
              <Building2 className="size-4" /> Bien concerné
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              {property.images?.[0]?.url ? (
                <div className="size-16 sm:size-20 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                  <img src={property.images[0].url} alt={property.title} className="size-full object-cover" />
                </div>
              ) : (
                <div className="size-16 sm:size-20 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                  <Building2 className="size-8 text-brand-400" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-semibold text-neutral-900">{property.title}</h3>
                <p className="text-sm text-neutral-500">{property.address}, {property.city}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lease & Owner info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {payment.lease && (
          <Card className="border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
                <FileSignature className="size-4" /> Bail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Loyer mensuel</span>
                <span className="font-medium text-neutral-700">{formatCurrency(payment.lease.monthlyRent)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Charges</span>
                <span className="font-medium text-neutral-700">{formatCurrency(payment.lease.charges || 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Début</span>
                <span className="font-medium text-neutral-700">{formatShortDate(payment.lease.startDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Fin</span>
                <span className="font-medium text-neutral-700">{formatShortDate(payment.lease.endDate)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {owner && (
          <Card className="border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
                <User className="size-4" /> Propriétaire
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-neutral-100">
                  <span className="text-sm font-semibold text-neutral-600">
                    {owner.firstName[0]}{owner.lastName[0]}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    {owner.firstName} {owner.lastName}
                  </p>
                  <p className="text-xs text-neutral-400">Propriétaire du bien</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  )
}
