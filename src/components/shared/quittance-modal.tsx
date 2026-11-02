'use client'

/**
 * QuittanceModal — Quittance de loyer imprimable (FUN-001).
 *
 * Modale partagée LOCATAIRE / PROPRIETAIRE / ADMIN : charge les données
 * serveur via GET /api/payments/[id]/quittance (idempotent — un même
 * paiement renvoie TOUJOURS le même numéro QT-YYYY-NNNNNN) et rend le
 * document print-friendly A4 (window.print → « Enregistrer en PDF » natif).
 *
 * Styles d'impression : @page A4 + tout masqué sauf #quittance-print-root
 * (technique visibility) — le PDF imprimé ne contient que la quittance.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CreditCard,
  Home,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types (miroir du contrat de route GET /api/payments/[id]/quittance) ────

export interface QuittanceData {
  receipt: {
    id: string
    receiptNumber: string
    issuedAt: string
    currency: string
    amount: number
    amountInWords: string
    periodStart: string | null
    periodEnd: string | null
    periodLabel: string
  }
  tenant: { firstName: string; lastName: string; phone: string | null; email: string | null }
  landlord: {
    firstName: string | null
    lastName: string | null
    companyName: string | null
    phone: string | null
    email: string | null
  }
  property: { title: string; type: string | null; address: string; city: string }
  lease: { startDate: string | null; endDate: string | null; monthlyRent: number; charges: number }
  payment: {
    reference: string | null
    method: string | null
    methodLabel: string | null
    operatorTransactionId: string | null
    operatorPhoneNumber: string | null
    paidAt: string | null
    amount: number
    amountPaid: number
  }
  signatureImage: string | null
}

interface QuittanceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Identifiant du paiement — null ⇒ modale fermée/inerte. */
  paymentId: string | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Éligibilité d'un paiement à la quittance (miroir du contrôle serveur) :
 * PAID, ou PARTIAL entièrement soldé (amountPaid >= amount - 0.01).
 * Réutilisée par les listes locataire et propriétaire pour n'afficher le
 * bouton que sur les paiements concernés (checklist QA).
 */
export function isQuittanceEligible(input: { status: string; amount?: number; amountPaid?: number }): boolean {
  if (input.status === 'PAID') return true
  if (input.status === 'PARTIAL') return (input.amountPaid ?? 0) >= (input.amount ?? 0) - 0.01
  return false
}

function formatFcfa(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

function formatDateFr(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function landlordFullName(landlord: QuittanceData['landlord']): string {
  const name = [landlord.firstName, landlord.lastName].filter(Boolean).join(' ').trim()
  // Bailleur personne morale : raison sociale en priorité (spec FUN-001 §5.2).
  return landlord.companyName?.trim() || name || 'Bailleur'
}

// ─── Ligne « libellé / valeur » du document ────────────────────────────────

function QuittanceRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-1.5', className)}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right min-w-0">{value}</span>
    </div>
  )
}

// ─── Document imprimable ────────────────────────────────────────────────────

function QuittanceDocument({ data }: { data: QuittanceData }) {
  const { receipt, tenant, landlord, property, lease, payment, signatureImage } = data
  const tenantFullName = [tenant.firstName, tenant.lastName].filter(Boolean).join(' ').trim() || 'Locataire'
  const hasSignature = !!signatureImage

  return (
    <div
      id="quittance-print-root"
      className="rounded-lg border border-border bg-background p-5 sm:p-8 space-y-5 text-foreground"
    >
      {/* ── En-tête : logo Mon Toit CI + numéro de quittance ── */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-brand-500">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-brand-500 text-white shrink-0">
            <Home className="size-6" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground leading-tight">Mon Toit CI</p>
            <p className="text-[11px] text-muted-foreground">Plateforme de gestion locative — Côte d&apos;Ivoire</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold uppercase tracking-wide text-foreground">Quittance de loyer</p>
          <p className="text-sm font-mono font-semibold text-brand-600">{receipt.receiptNumber}</p>
          <p className="text-[11px] text-muted-foreground">Émise le {formatDateFr(receipt.issuedAt)}</p>
        </div>
      </div>

      {/* ── Parties & bien ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        <QuittanceRow
          label="Bailleur"
          value={
            <>
              <span className="font-semibold">{landlordFullName(landlord)}</span>
              {(landlord.phone || landlord.email) && (
                <span className="block text-xs text-muted-foreground">
                  {[landlord.phone, landlord.email].filter(Boolean).join(' · ')}
                </span>
              )}
            </>
          }
        />
        <QuittanceRow
          label="Locataire"
          value={
            <>
              <span className="font-semibold">{tenantFullName}</span>
              {tenant.phone && <span className="block text-xs text-muted-foreground">{tenant.phone}</span>}
            </>
          }
        />
        <QuittanceRow
          label="Bien loué"
          value={
            <>
              <span className="font-semibold">{property.title}</span>
              <span className="block text-xs text-muted-foreground">
                {[property.type, property.address ? `${property.address}, ${property.city}` : property.city]
                  .filter(Boolean)
                  .join(' — ')}
              </span>
            </>
          }
        />
        <QuittanceRow
          label="Bail"
          value={
            lease.startDate || lease.endDate
              ? `Contrat du ${formatDateFr(lease.startDate)} au ${formatDateFr(lease.endDate)}`
              : '—'
          }
        />
      </div>

      {/* ── Période + détail financier ── */}
      <div className="rounded-md border border-border bg-brand-50/40 px-4 py-3 space-y-1">
        <QuittanceRow
          label="Période"
          value={
            <span className="font-semibold flex items-center gap-1.5 justify-end">
              <CalendarDays className="size-3.5 text-brand-500 shrink-0" />
              {receipt.periodLabel}
              {receipt.periodStart && receipt.periodEnd && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({formatDateFr(receipt.periodStart)} → {formatDateFr(receipt.periodEnd)})
                </span>
              )}
            </span>
          }
        />
        <div className="border-t border-border/70 my-1" />
        <QuittanceRow label="Loyer HC" value={formatFcfa(lease.monthlyRent)} />
        <QuittanceRow label="Charges" value={formatFcfa(lease.charges)} />
        <div className="border-t border-border/70 my-1" />
        <QuittanceRow
          label="Total acquitté"
          value={<span className="text-base font-bold text-brand-700">{formatFcfa(receipt.amount)}</span>}
        />
        <p className="text-xs text-muted-foreground text-right pt-1">
          (en toutes lettres : <span className="font-medium italic">{receipt.amountInWords}</span>)
        </p>
      </div>

      {/* ── Paiement ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        <QuittanceRow
          label="Mode"
          value={
            <span className="flex items-center gap-1.5 justify-end">
              <CreditCard className="size-3.5 text-brand-500 shrink-0" />
              <span className="font-semibold">{payment.methodLabel || 'Non renseigné'}</span>
              {(payment.reference || payment.operatorTransactionId) && (
                <span className="block text-xs text-muted-foreground font-mono">
                  réf. {payment.reference || payment.operatorTransactionId}
                </span>
              )}
            </span>
          }
        />
        <QuittanceRow label="Payé le" value={payment.paidAt ? formatDateFr(payment.paidAt) : '—'} />
      </div>

      {/* ── Signature / mention d'émission électronique ── */}
      <div className="pt-4 border-t border-border">
        {hasSignature ? (
          <div className="flex items-end justify-between gap-4">
            <p className="text-xs text-muted-foreground max-w-[55%]">
              Le bailleur reconnaît avoir reçu de la part du locataire la somme de{' '}
              <span className="font-semibold text-foreground">{formatFcfa(receipt.amount)}</span>{' '}
              ({receipt.amountInWords}) en règlement du loyer et des charges pour la période indiquée ci-dessus.
            </p>
            <div className="text-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signatureImage}
                alt={`Signature du bailleur ${landlordFullName(landlord)}`}
                className="h-14 object-contain mx-auto"
              />
              <p className="text-[11px] text-muted-foreground mt-1 border-t border-border pt-1">
                Signature du bailleur — {landlordFullName(landlord)}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Le bailleur reconnaît avoir reçu de la part du locataire la somme de{' '}
              <span className="font-semibold text-foreground">{formatFcfa(receipt.amount)}</span>{' '}
              ({receipt.amountInWords}) en règlement du loyer et des charges pour la période indiquée ci-dessus.
            </p>
            <p className="text-xs font-medium text-foreground">
              Quittance émise électroniquement via Mon Toit CI pour le compte du bailleur —{' '}
              {landlordFullName(landlord)}.
            </p>
          </div>
        )}
      </div>

      {/* ── Pied de document ── */}
      <div className="pt-3 border-t border-border/60">
        <p className="text-[10px] leading-relaxed text-muted-foreground text-center">
          Quittance de loyer n° {receipt.receiptNumber} — émise le {formatDateFr(receipt.issuedAt)} via la plateforme
          Mon Toit CI. Document valant preuve de paiement pour la période concernée. Devise : franc CFA (XOF).
        </p>
      </div>
    </div>
  )
}

// ─── Modale ─────────────────────────────────────────────────────────────────

export function QuittanceModal({ open, onOpenChange, paymentId }: QuittanceModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<QuittanceData | null>(null)

  const fetchQuittance = useCallback(async () => {
    if (!paymentId) return
    setLoading(true)
    setError(null)
    try {
      // skipCache : données financières — ne jamais servir une quittance depuis le cache client.
      const result = await authFetch<{ data: QuittanceData }>(
        `/api/payments/${paymentId}/quittance`,
        { skipCache: true }
      )
      if (!result.data) throw new Error('Quittance introuvable')
      setData(result.data)
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : 'Impossible de charger la quittance'
      setError(message)
      // 409 : paiement non soldé → rappel explicite (spec FUN-001 §5.3).
      if (err instanceof AuthError && err.status === 409) {
        toast.error('Quittance disponible uniquement pour les paiements effectués')
      }
    } finally {
      setLoading(false)
    }
  }, [paymentId])

  // Chargement à chaque ouverture (données toujours fraîches depuis la DB serveur).
  useEffect(() => {
    if (open && paymentId) {
      setData(null)
      fetchQuittance()
    }
  }, [open, paymentId, fetchQuittance])

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {/* Styles d'impression : A4 propre, seules les données de la quittance sont imprimées. */}
      {open && (
        <style>{`
          @page { size: A4; margin: 12mm; }
          @media print {
            body * { visibility: hidden !important; }
            #quittance-print-root, #quittance-print-root * { visibility: visible !important; }
            #quittance-print-root {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-height: none !important;
              overflow: visible !important;
              /* Neutralise le centrage translate/transform du Dialog (shadcn). */
              translate: none !important;
              transform: none !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              padding: 0 !important;
            }
            .quittance-no-print { display: none !important; }
          }
        `}</style>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="quittance-no-print">
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="size-5 text-brand-500" />
              Quittance de loyer
            </DialogTitle>
            <DialogDescription>
              Document officiel numéroté — vous pouvez l&apos;imprimer ou l&apos;enregistrer en PDF.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="space-y-3 py-4" aria-busy="true" aria-live="polite">
              <div className="h-20 rounded-lg bg-muted animate-pulse" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-10 rounded bg-muted animate-pulse" />
                <div className="h-10 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-32 rounded-lg bg-muted animate-pulse" />
              <div className="h-24 rounded-lg bg-muted animate-pulse" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center text-center py-8 gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-amber-50">
                <AlertTriangle className="size-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Quittance indisponible</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchQuittance} className="gap-1.5">
                <RefreshCw className="size-3.5" />
                Réessayer
              </Button>
            </div>
          ) : data ? (
            <div className="space-y-4">
              <QuittanceDocument data={data} />
              <div className="quittance-no-print flex flex-col sm:flex-row items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  Numéro unique et invariable pour ce paiement (ré-émission idempotente).
                </p>
                <Button onClick={handlePrint} className="gap-1.5 bg-brand-500 hover:bg-brand-600 text-white">
                  <Printer className="size-4" />
                  Imprimer / Enregistrer en PDF
                </Button>
              </div>
            </div>
          ) : null}

          {/* Indicateur de chargement discret pendant un re-téléchargement */}
          {loading && data && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 quittance-no-print">
              <Loader2 className="size-6 animate-spin text-brand-500" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
