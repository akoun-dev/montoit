'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, FileSignature, Building2, User, MapPin, FileText, CreditCard, Wrench, AlertTriangle, Loader2, PenTool, CheckCircle2, ShieldCheck, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SignaturePad } from '@/components/ui/signature-pad'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

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
  DRAFT: { label: 'Brouillon', color: 'bg-muted text-muted-foreground' },
  PENDING_SIGNATURE: { label: 'En attente de signature', color: 'bg-amber-50 text-amber-700' },
  ACTIVE: { label: 'Actif', color: 'bg-emerald-50 text-emerald-700' },
  TERMINATED: { label: 'Résilié', color: 'bg-red-50 text-red-700' },
  EXPIRED: { label: 'Expiré', color: 'bg-muted text-muted-foreground' },
}

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  PAID: { label: 'Payé', color: 'text-emerald-600' },
  PENDING: { label: 'En attente', color: 'text-amber-600' },
  LATE: { label: 'En retard', color: 'text-red-600' },
  PARTIAL: { label: 'Partiel', color: 'text-cyan-600' },
  CANCELLED: { label: 'Annulé', color: 'text-muted-foreground' },
}

const maintenanceStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-amber-50 text-amber-700' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-brand-50 text-brand-600' },
  RESOLVED: { label: 'Résolu', color: 'bg-emerald-50 text-emerald-700' },
  CLOSED: { label: 'Fermé', color: 'bg-muted text-muted-foreground' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Basse', color: 'text-muted-foreground' },
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

type SignStep = 'signature' | 'otp-request' | 'otp-enter'

export function LeaseDetail({ leaseId, onBack }: LeaseDetailProps) {
  const { isAuthenticated } = useAuthStore()
  const [lease, setLease] = useState<LeaseItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [terminating, setTerminating] = useState(false)
  const [showTerminateDialog, setShowTerminateDialog] = useState(false)

  // Signing flow state
  const [showSignDialog, setShowSignDialog] = useState(false)
  const [signStep, setSignStep] = useState<SignStep>('signature')
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [requestedOtp, setRequestedOtp] = useState<string | null>(null)
  const [requestingOtp, setRequestingOtp] = useState(false)
  const [signing, setSigning] = useState(false)
  const [cryptoneoValidating, setCryptoneoValidating] = useState(false)

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

  const handleTerminate = async () => {
    if (!lease) return
    setTerminating(true)
    try {
      await authFetch(`/api/leases/${lease.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'terminate' }),
      })
      toast.success('Bail résilié avec succès')
      setShowTerminateDialog(false)
      setTimeout(() => onBack(), 800)
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur lors de la résiliation')
      } else {
        toast.error('Erreur lors de la résiliation du bail')
      }
    } finally {
      setTerminating(false)
    }
  }

  // Step 1: User confirmed handwritten signature
  const handleSignatureConfirm = useCallback((dataUrl: string) => {
    setSignatureDataUrl(dataUrl)
    setSignStep('otp-request')
  }, [])

  const handleSignatureCancel = useCallback(() => {
    setShowSignDialog(false)
    resetSignState()
  }, [])

  // Step 2: Request OTP
  const handleRequestOtp = async () => {
    if (!lease) return
    setRequestingOtp(true)
    try {
      const result = await authFetch<{ otpCode: string }>(`/api/leases/${lease.id}/request-sign-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      setRequestedOtp(result.otpCode)
      setSignStep('otp-enter')
      toast.success('Code OTP généré', {
        description: 'Utilisez ce code pour valider votre signature avec CRYPTONEO.',
      })
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur lors de la demande OTP')
      } else {
        toast.error('Erreur lors de la génération du code OTP')
      }
    } finally {
      setRequestingOtp(false)
    }
  }

  // Step 3: Sign with OTP + CRYPTONEO validation
  const handleSign = async () => {
    if (!lease || !otpCode || !signatureDataUrl) return
    setCryptoneoValidating(true)
    setSigning(true)
    try {
      // Sign the lease with OTP verification
      const result = await authFetch<{ data: LeaseItem }>(`/api/leases/${lease.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otpCode,
          signatureImage: signatureDataUrl,
        }),
      })

      toast.success('Bail signé et validé avec CRYPTONEO !', {
        description: 'Votre signature manuscrite a été certifiée électroniquement.',
      })
      setShowSignDialog(false)
      resetSignState()
      if (result.data) {
        setLease(result.data)
      } else {
        fetchLease()
      }
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur lors de la signature')
      } else {
        toast.error('Erreur lors de la signature du bail')
      }
    } finally {
      setSigning(false)
      setCryptoneoValidating(false)
    }
  }

  const resetSignState = () => {
    setSignStep('signature')
    setSignatureDataUrl(null)
    setOtpCode('')
    setRequestedOtp(null)
    setCryptoneoValidating(false)
  }

  const closeSignDialog = (open: boolean) => {
    setShowSignDialog(open)
    if (!open) resetSignState()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  if (error || !lease) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
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

  // Determine if tenant can sign
  const canSign = lease.status === 'PENDING_SIGNATURE' && !lease.tenantSignedAt

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground -ml-2">
        <ArrowLeft className="size-4" /> Retour aux baux
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Détail du bail</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Du {formatShortDate(lease.startDate)} au {formatShortDate(lease.endDate)}
          </p>
        </div>
        <Badge className={`shrink-0 ${statusInfo.color} w-fit`}>{statusInfo.label}</Badge>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xs text-muted-foreground">Loyer</p>
            <p className="text-sm sm:text-base font-bold text-foreground">{formatCurrency(lease.monthlyRent)}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xs text-muted-foreground">Charges</p>
            <p className="text-sm sm:text-base font-bold text-foreground">{formatCurrency(lease.charges || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xs text-muted-foreground">Dépôt</p>
            <p className="text-sm sm:text-base font-bold text-foreground">{formatCurrency(lease.deposit || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xs text-muted-foreground">Jours restants</p>
            <p className={`text-sm sm:text-base font-bold ${daysRemaining > 90 ? 'text-emerald-600' : daysRemaining > 30 ? 'text-amber-600' : 'text-red-600'}`}>
              {daysRemaining > 0 ? daysRemaining : 0}
            </p>
          </CardContent>
        </Card>
      </div>

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
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3" /> {property.city}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contract details */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FileSignature className="size-4" /> Détails du contrat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex justify-between text-sm p-3 rounded-lg bg-muted">
              <span className="text-muted-foreground">Date de début</span>
              <span className="font-medium text-foreground">{formatDate(lease.startDate)}</span>
            </div>
            <div className="flex justify-between text-sm p-3 rounded-lg bg-muted">
              <span className="text-muted-foreground">Date de fin</span>
              <span className="font-medium text-foreground">{formatDate(lease.endDate)}</span>
            </div>
            <div className="flex justify-between text-sm p-3 rounded-lg bg-muted">
              <span className="text-muted-foreground">Loyer mensuel</span>
              <span className="font-medium text-foreground">{formatCurrency(lease.monthlyRent)}</span>
            </div>
            <div className="flex justify-between text-sm p-3 rounded-lg bg-muted">
              <span className="text-muted-foreground">Charges mensuelles</span>
              <span className="font-medium text-foreground">{formatCurrency(lease.charges || 0)}</span>
            </div>
            <div className="flex justify-between text-sm p-3 rounded-lg bg-muted">
              <span className="text-muted-foreground">Dépôt de garantie</span>
              <span className="font-medium text-foreground">{formatCurrency(lease.deposit || 0)}</span>
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
                <p className="text-xs text-muted-foreground font-medium mb-2">Conditions particulières</p>
                <p className="text-sm text-foreground p-3 rounded-lg bg-muted">{lease.specialConditions}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Signatures */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FileText className="size-4" /> Signatures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                <User className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Propriétaire</p>
                <p className="text-xs text-muted-foreground">{owner.firstName} {owner.lastName}</p>
                {lease.ownerSignedAt ? (
                  <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Signé le {formatShortDate(lease.ownerSignedAt)}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 mt-0.5">En attente de signature</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                <User className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Locataire</p>
                <p className="text-xs text-muted-foreground">Vous</p>
                {lease.tenantSignedAt ? (
                  <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Signé le {formatShortDate(lease.tenantSignedAt)}
                  </p>
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
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="size-4" /> Derniers paiements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lease.payments.map((payment) => {
              const pConfig = paymentStatusConfig[payment.status] || paymentStatusConfig.PENDING
              return (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-3 min-w-0">
                    <CreditCard className="size-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{formatShortDate(payment.dueDate)}</p>
                      {payment.reference && (
                        <p className="text-[10px] text-muted-foreground font-mono">{payment.reference}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(payment.amount)}</p>
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
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wrench className="size-4" /> Demandes de maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lease.maintenanceRequests.map((mr) => {
              const mStatus = maintenanceStatusConfig[mr.status] || maintenanceStatusConfig.PENDING
              const mPriority = priorityConfig[mr.priority] || priorityConfig.MEDIUM
              return (
                <div key={mr.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-3 min-w-0">
                    <Wrench className="size-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{mr.title}</p>
                      <p className="text-[10px] text-muted-foreground">{formatShortDate(mr.createdAt)}</p>
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

      {/* ─── Sign Lease Button ────────────────────────────────────────────── */}
      {canSign && (
        <div className="pt-2">
          <Button
            className="w-full bg-brand-500 hover:bg-brand-600 text-white gap-2"
            onClick={() => setShowSignDialog(true)}
          >
            <PenTool className="size-4" />
            Signer le bail
          </Button>
        </div>
      )}

      {/* ─── Download Contract Button ────────────────────────────────────── */}
      {(lease.ownerSignedAt || lease.tenantSignedAt) && (
        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full border-brand-200 text-brand-600 hover:bg-brand-50 hover:text-brand-700 gap-2"
            onClick={async () => {
              try {
                const res = await fetch(`/api/leases/${lease.id}/contract?format=pdf`, { credentials: 'include' })
                if (!res.ok) {
                  const err = await res.json().catch(() => ({ error: 'Erreur' }))
                  toast.error(err.error || 'Erreur lors du téléchargement')
                  return
                }
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `Bail_${lease.property?.title || 'contrat'}.pdf`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                toast.success('Contrat téléchargé avec succès')
              } catch {
                toast.error('Erreur lors du téléchargement du contrat')
              }
            }}
          >
            <Download className="size-4" />
            Télécharger le contrat
          </Button>
        </div>
      )}

      {/* ─── Terminate Lease Button ──────────────────────────────────────────── */}
      {lease.status === 'ACTIVE' && (
        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 gap-2"
            onClick={() => setShowTerminateDialog(true)}
          >
            <AlertTriangle className="size-4" />
            Résilier le bail
          </Button>
        </div>
      )}

      {/* ─── Sign Dialog: Handwritten Signature + CRYPTONEO Validation ──────── */}
      <Dialog open={showSignDialog} onOpenChange={closeSignDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="size-5 text-brand-500" />
              Signature du bail
            </DialogTitle>
            <DialogDescription className="pt-2">
              {signStep === 'signature' && (
                <>
                  Dessinez votre signature manuscrite pour le bail de
                  <span className="font-semibold text-foreground"> {property?.title}</span>.
                  Elle sera ensuite certifiée par CRYPTONEO.
                </>
              )}
              {signStep === 'otp-request' && (
                <>
                  Votre signature a été capturée. Pour la certifier électroniquement via CRYPTONEO,
                  veuillez obtenir un code OTP.
                </>
              )}
              {signStep === 'otp-enter' && (
                <>
                  Saisissez le code OTP pour certifier votre signature via CRYPTONEO.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Lease summary */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-muted">
                <span className="text-muted-foreground">Loyer</span>
                <p className="font-semibold text-foreground">{formatCurrency(lease.monthlyRent)}</p>
              </div>
              <div className="p-2 rounded bg-muted">
                <span className="text-muted-foreground">Durée</span>
                <p className="font-semibold text-foreground">
                  {formatShortDate(lease.startDate)} → {formatShortDate(lease.endDate)}
                </p>
              </div>
            </div>

            {lease.ownerSignedAt && (
              <div className="p-2 rounded bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-700">
                  Le propriétaire a déjà signé ce bail le {formatShortDate(lease.ownerSignedAt)}.
                </p>
              </div>
            )}

            {/* Step indicator */}
            <div className="flex items-center gap-2">
              {[
                { key: 'signature', label: 'Signature', icon: PenTool },
                { key: 'otp-request', label: 'Vérification', icon: ShieldCheck },
                { key: 'otp-enter', label: 'Validation', icon: CheckCircle2 },
              ].map((step, i) => {
                const stepOrder = ['signature', 'otp-request', 'otp-enter']
                const currentIdx = stepOrder.indexOf(signStep)
                const stepIdx = stepOrder.indexOf(step.key)
                const isActive = step.key === signStep
                const isDone = stepIdx < currentIdx

                return (
                  <div key={step.key} className="flex items-center gap-2 flex-1">
                    <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isDone ? 'bg-green-500 text-white' : isActive ? 'bg-brand-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {isDone ? <CheckCircle2 className="size-3.5" /> : i + 1}
                    </div>
                    <span className={`text-xs hidden sm:inline ${isActive ? 'text-foreground font-medium' : isDone ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                    {i < 2 && <div className={`flex-1 h-px ${stepIdx < currentIdx ? 'bg-green-400' : 'bg-border'}`} />}
                  </div>
                )
              })}
            </div>

            {/* Step 1: Signature Pad */}
            {signStep === 'signature' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-700">
                    Dessinez votre signature manuscrite ci-dessous. Celle-ci sera associée au contrat
                    et certifiée électroniquement via CRYPTONEO pour garantir sa valeur légale.
                  </p>
                </div>
                <SignaturePad
                  onConfirm={handleSignatureConfirm}
                  onCancel={handleSignatureCancel}
                  signatoryRole="Locataire"
                />
              </div>
            )}

            {/* Step 2: Request OTP */}
            {signStep === 'otp-request' && (
              <div className="space-y-3">
                {/* Preview of captured signature */}
                {signatureDataUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Votre signature :</p>
                    <div className="rounded-lg border border-border bg-white p-2">
                      <img
                        src={signatureDataUrl}
                        alt="Votre signature manuscrite"
                        className="h-20 w-auto mx-auto object-contain"
                      />
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-brand-50 border border-brand-100">
                  <p className="text-xs text-brand-700">
                    Votre signature manuscrite a été capturée. Pour la certifier électroniquement,
                    un code OTP est requis. Ce code garantit l&apos;authenticité de votre signature
                    via CRYPTONEO.
                  </p>
                </div>

                <Button
                  onClick={handleRequestOtp}
                  disabled={requestingOtp}
                  className="w-full gap-2 bg-brand-500 hover:bg-brand-600 text-white"
                >
                  {requestingOtp ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      Obtenir un code OTP pour certifier
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Step 3: Enter OTP & Validate */}
            {signStep === 'otp-enter' && (
              <div className="space-y-3">
                {/* Preview of captured signature */}
                {signatureDataUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Votre signature :</p>
                    <div className="rounded-lg border border-border bg-white p-2">
                      <img
                        src={signatureDataUrl}
                        alt="Votre signature manuscrite"
                        className="h-16 w-auto mx-auto object-contain"
                      />
                    </div>
                  </div>
                )}

                {requestedOtp && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                    <p className="text-xs text-amber-600 mb-1">Votre code OTP</p>
                    <p className="text-2xl font-bold font-mono tracking-widest text-amber-800">{requestedOtp}</p>
                    <p className="text-[10px] text-amber-500 mt-1">Saisissez ce code ci-dessous pour confirmer</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="otp-input" className="text-xs font-medium text-muted-foreground">
                    Code OTP de certification CRYPTONEO
                  </Label>
                  <Input
                    id="otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-12 text-center text-xl font-mono tracking-widest mt-1.5"
                  />
                </div>

                {cryptoneoValidating && (
                  <div className="p-3 rounded-lg bg-brand-50 border border-brand-100 flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin text-brand-500" />
                    <p className="text-xs text-brand-700">
                      Certification CRYPTONEO en cours...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {signStep === 'signature' ? null : (
              <Button
                variant="outline"
                onClick={() => {
                  if (signStep === 'otp-enter') {
                    setSignStep('otp-request')
                  } else if (signStep === 'otp-request') {
                    setSignStep('signature')
                  }
                }}
                disabled={signing}
              >
                Retour
              </Button>
            )}
            {signStep === 'otp-enter' && (
              <Button
                onClick={handleSign}
                disabled={signing || otpCode.length !== 6}
                className="gap-2 bg-brand-500 hover:bg-brand-600 text-white"
              >
                {signing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Certification...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    Confirmer et certifier
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Termination Confirmation Dialog ──────────────────────────────────── */}
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              Résilier le bail
            </DialogTitle>
            <DialogDescription className="pt-2">
              Êtes-vous sûr de vouloir résilier ce bail ? Cette action est irréversible. Le bail pour
              <span className="font-semibold text-foreground"> {property?.title}</span> sera immédiatement clôturé.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 my-2">
            <p className="text-xs text-red-700">
              En résiliant ce bail, vous mettez fin à votre contrat de location. Les paiements en attente restent dus selon les conditions du bail.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowTerminateDialog(false)}
              disabled={terminating}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={terminating}
              className="gap-2"
            >
              {terminating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Résiliation...
                </>
              ) : (
                <>
                  <AlertTriangle className="size-4" />
                  Confirmer la résiliation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
