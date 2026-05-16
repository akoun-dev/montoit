'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, FileSignature, Building2, User, MapPin, FileText, CreditCard, Wrench } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
  specialConditions: string | null
  ownerSignedAt: string | null
  tenantSignedAt: string | null
  createdAt: string
  property: {
    id: string
    title: string
    address?: string
    city: string
    images: Array<{ url: string }>
  }
  owner: {
    firstName: string
    lastName: string
  }
  payments?: Array<{
    id: string
    amount: number
    status: string
    dueDate: string
    paidAt: string | null
    reference: string | null
  }>
  maintenanceRequests?: Array<{
    id: string
    title: string
    status: string
    priority: string
    createdAt: string
  }>
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-neutral-100 text-neutral-600' },
  PENDING_SIGNATURE: { label: 'En attente de signature', color: 'bg-amber-50 text-amber-700' },
  ACTIVE: { label: 'Actif', color: 'bg-emerald-50 text-emerald-700' },
  TERMINATED: { label: 'Résilié', color: 'bg-red-50 text-red-700' },
  EXPIRED: { label: 'Expiré', color: 'bg-neutral-50 text-neutral-500' },
}

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  PAID: { label: 'Payé', color: 'text-emerald-600' },
  PENDING: { label: 'En attente', color: 'text-amber-600' },
  LATE: { label: 'En retard', color: 'text-red-600' },
  PARTIAL: { label: 'Partiel', color: 'text-cyan-600' },
  CANCELLED: { label: 'Annulé', color: 'text-neutral-400' },
}

const maintenanceStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-amber-50 text-amber-700' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-brand-50 text-brand-600' },
  RESOLVED: { label: 'Résolu', color: 'bg-emerald-50 text-emerald-700' },
  CLOSED: { label: 'Fermé', color: 'bg-neutral-50 text-neutral-500' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Basse', color: 'text-neutral-400' },
  MEDIUM: { label: 'Moyenne', color: 'text-amber-500' },
  HIGH: { label: 'Haute', color: 'text-brand-500' },
  URGENT: { label: 'Urgente', color: 'text-red-600' },
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

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ─── Component ──────────────────────────────────────────────────────────────
interface LeaseDetailProps {
  leaseId: string
  onBack: () => void
}

export function LeaseDetail({ leaseId, onBack }: LeaseDetailProps) {
  const { isAuthenticated } = useAuthStore()
  const [lease, setLease] = useState<LeaseItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLease = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const result = await authFetch<{ data: LeaseItem }>(`/api/leases/${leaseId}`)
      if (result.data) {
        setLease(result.data)
      } else {
        setError('Bail introuvable')
      }
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      if (err instanceof AuthError && err.status === 404) {
        setError('Bail introuvable')
      } else {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, leaseId])

  useEffect(() => { fetchLease() }, [fetchLease])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-neutral-100 animate-pulse rounded" />
        <div className="h-64 bg-neutral-100 animate-pulse rounded-xl" />
      </div>
    )
  }

  if (error || !lease) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-neutral-600">
          <ArrowLeft className="size-4" /> Retour
        </Button>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">{error || 'Bail introuvable'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusInfo = statusLabels[lease.status] || statusLabels.ACTIVE
  const property = lease.property
  const owner = lease.owner
  const daysRemaining = getDaysRemaining(lease.endDate)
  const totalCost = lease.monthlyRent + (lease.charges || 0)

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="gap-2 text-neutral-600 -ml-2">
        <ArrowLeft className="size-4" /> Retour aux baux
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Détail du bail</h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Du {formatShortDate(lease.startDate)} au {formatShortDate(lease.endDate)}
          </p>
        </div>
        <Badge className={`shrink-0 ${statusInfo.color} w-fit`}>{statusInfo.label}</Badge>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-neutral-200">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xs text-neutral-400">Loyer</p>
            <p className="text-sm sm:text-base font-bold text-neutral-900">{formatCurrency(lease.monthlyRent)}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xs text-neutral-400">Charges</p>
            <p className="text-sm sm:text-base font-bold text-neutral-900">{formatCurrency(lease.charges || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xs text-neutral-400">Dépôt</p>
            <p className="text-sm sm:text-base font-bold text-neutral-900">{formatCurrency(lease.deposit || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xs text-neutral-400">Jours restants</p>
            <p className={`text-sm sm:text-base font-bold ${daysRemaining > 90 ? 'text-emerald-600' : daysRemaining > 30 ? 'text-amber-600' : 'text-red-600'}`}>
              {daysRemaining > 0 ? daysRemaining : 0}
            </p>
          </CardContent>
        </Card>
      </div>

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
                <p className="text-sm text-neutral-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3" /> {property.city}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contract details */}
      <Card className="border-neutral-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
            <FileSignature className="size-4" /> Détails du contrat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex justify-between text-sm p-3 rounded-lg bg-neutral-50">
              <span className="text-neutral-500">Date de début</span>
              <span className="font-medium text-neutral-700">{formatDate(lease.startDate)}</span>
            </div>
            <div className="flex justify-between text-sm p-3 rounded-lg bg-neutral-50">
              <span className="text-neutral-500">Date de fin</span>
              <span className="font-medium text-neutral-700">{formatDate(lease.endDate)}</span>
            </div>
            <div className="flex justify-between text-sm p-3 rounded-lg bg-neutral-50">
              <span className="text-neutral-500">Loyer mensuel</span>
              <span className="font-medium text-neutral-700">{formatCurrency(lease.monthlyRent)}</span>
            </div>
            <div className="flex justify-between text-sm p-3 rounded-lg bg-neutral-50">
              <span className="text-neutral-500">Charges mensuelles</span>
              <span className="font-medium text-neutral-700">{formatCurrency(lease.charges || 0)}</span>
            </div>
            <div className="flex justify-between text-sm p-3 rounded-lg bg-neutral-50">
              <span className="text-neutral-500">Dépôt de garantie</span>
              <span className="font-medium text-neutral-700">{formatCurrency(lease.deposit || 0)}</span>
            </div>
            <div className="flex justify-between text-sm p-3 rounded-lg bg-brand-50">
              <span className="text-brand-600 font-medium">Coût total mensuel</span>
              <span className="font-bold text-brand-700">{formatCurrency(totalCost)}</span>
            </div>
          </div>

          {lease.specialConditions && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-neutral-400 font-medium mb-2">Conditions particulières</p>
                <p className="text-sm text-neutral-700 p-3 rounded-lg bg-neutral-50">{lease.specialConditions}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Signatures */}
      <Card className="border-neutral-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
            <FileText className="size-4" /> Signatures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50">
              <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100">
                <User className="size-4 text-neutral-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700">Propriétaire</p>
                <p className="text-xs text-neutral-400">{owner.firstName} {owner.lastName}</p>
                {lease.ownerSignedAt ? (
                  <p className="text-xs text-emerald-600 mt-0.5">Signé le {formatShortDate(lease.ownerSignedAt)}</p>
                ) : (
                  <p className="text-xs text-amber-600 mt-0.5">En attente de signature</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50">
              <div className="flex size-8 items-center justify-center rounded-full bg-neutral-100">
                <User className="size-4 text-neutral-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700">Locataire</p>
                <p className="text-xs text-neutral-400">Vous</p>
                {lease.tenantSignedAt ? (
                  <p className="text-xs text-emerald-600 mt-0.5">Signé le {formatShortDate(lease.tenantSignedAt)}</p>
                ) : (
                  <p className="text-xs text-amber-600 mt-0.5">En attente de signature</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent payments */}
      {lease.payments && lease.payments.length > 0 && (
        <Card className="border-neutral-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
              <CreditCard className="size-4" /> Derniers paiements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lease.payments.map((payment) => {
              const pConfig = paymentStatusConfig[payment.status] || paymentStatusConfig.PENDING
              return (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <CreditCard className="size-4 text-neutral-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-700">{formatShortDate(payment.dueDate)}</p>
                      {payment.reference && (
                        <p className="text-[10px] text-neutral-400 font-mono">{payment.reference}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-neutral-900">{formatCurrency(payment.amount)}</p>
                    <p className={`text-[10px] font-medium ${pConfig.color}`}>{pConfig.label}</p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent maintenance */}
      {lease.maintenanceRequests && lease.maintenanceRequests.length > 0 && (
        <Card className="border-neutral-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
              <Wrench className="size-4" /> Demandes de maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lease.maintenanceRequests.map((mr) => {
              const mStatus = maintenanceStatusConfig[mr.status] || maintenanceStatusConfig.PENDING
              const mPriority = priorityConfig[mr.priority] || priorityConfig.MEDIUM
              return (
                <div key={mr.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <Wrench className="size-4 text-neutral-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-700 truncate">{mr.title}</p>
                      <p className="text-[10px] text-neutral-400">{formatShortDate(mr.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-medium ${mPriority.color}`}>{mPriority.label}</span>
                    <Badge className={`text-[10px] ${mStatus.color}`}>{mStatus.label}</Badge>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
