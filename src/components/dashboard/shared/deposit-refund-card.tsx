'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, ShieldCheck, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { authFetch } from '@/lib/auth-fetch'
import { toast } from 'sonner'

interface DepositRefund {
  id: string
  leaseId: string
  depositAmount: number
  refundAmount: number | null
  deductions: number
  deductionReason: string | null
  justificationUrl: string | null
  status: 'PENDING' | 'DECIDED' | 'PAID'
  decidedAt: string | null
  paidAt: string | null
}

function formatFCFA(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`
}

const statusLabels: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'À décider', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  DECIDED: { label: 'Décidée', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  PAID: { label: 'Restituée', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

// Owner-facing card driving the deposit refund decision for a terminated
// lease. Self-contained (fetches its own data) so it can be dropped into
// any lease detail view without touching that view's own state.
export function OwnerDepositRefundCard({ leaseId }: { leaseId: string }) {
  const [refund, setRefund] = useState<DepositRefund | null>(null)
  const [loading, setLoading] = useState(true)
  const [deductions, setDeductions] = useState('0')
  const [reason, setReason] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchRefund = useCallback(async () => {
    try {
      const result = await authFetch<{ data: DepositRefund | null }>(`/api/leases/${leaseId}/deposit-refund`)
      setRefund(result.data)
    } catch {
      setRefund(null)
    } finally {
      setLoading(false)
    }
  }, [leaseId])

  useEffect(() => { fetchRefund() }, [fetchRefund])

  const handleDecide = async () => {
    const deductionAmount = Math.max(0, Number(deductions) || 0)
    if (refund && deductionAmount > refund.depositAmount) {
      toast.error('Le montant retenu ne peut pas dépasser la caution')
      return
    }
    if (deductionAmount > 0 && !reason.trim()) {
      toast.error('Précisez le motif de la retenue')
      return
    }
    setSubmitting(true)
    try {
      let justificationContent: string | undefined
      if (file) {
        justificationContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }
      await authFetch(`/api/leases/${leaseId}/deposit-refund`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decide',
          deductions: deductionAmount,
          deductionReason: reason.trim() || undefined,
          justificationContent,
          justificationFileName: file?.name,
        }),
      })
      toast.success('Décision de restitution enregistrée')
      fetchRefund()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkPaid = async () => {
    setSubmitting(true)
    try {
      await authFetch(`/api/leases/${leaseId}/deposit-refund`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-paid' }),
      })
      toast.success('Restitution marquée comme payée')
      fetchRefund()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="h-24 rounded-lg bg-muted animate-pulse" />
  if (!refund) return null

  const badge = statusLabels[refund.status]

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-brand-500" /> Restitution de caution</span>
          <Badge variant="outline" className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Caution perçue : <span className="font-medium text-foreground">{formatFCFA(refund.depositAmount)}</span></p>

        {refund.status === 'PENDING' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Montant retenu (FCFA)</Label>
              <Input type="number" min={0} max={refund.depositAmount} value={deductions} onChange={(e) => setDeductions(e.target.value)} />
            </div>
            {Number(deductions) > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Motif de la retenue</Label>
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Dégradations constatées, loyers impayés..." />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Justificatif (optionnel)</Label>
              <label className="flex items-center gap-2 text-xs text-brand-600 cursor-pointer w-fit">
                <Upload className="size-3.5" />
                {file ? file.name : 'Joindre un document'}
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <Button size="sm" onClick={handleDecide} disabled={submitting} className="gap-1.5">
              {submitting && <Loader2 className="size-3.5 animate-spin" />} Confirmer la décision
            </Button>
          </div>
        )}

        {refund.status !== 'PENDING' && (
          <div className="space-y-1 text-xs">
            <p>Montant à restituer : <span className="font-medium text-foreground">{formatFCFA(refund.refundAmount || 0)}</span></p>
            {refund.deductions > 0 && (
              <p className="text-muted-foreground">Retenue : {formatFCFA(refund.deductions)} — {refund.deductionReason}</p>
            )}
            {refund.justificationUrl && (
              <a href={refund.justificationUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Voir le justificatif</a>
            )}
          </div>
        )}

        {refund.status === 'DECIDED' && (
          <Button size="sm" variant="outline" onClick={handleMarkPaid} disabled={submitting} className="gap-1.5">
            {submitting && <Loader2 className="size-3.5 animate-spin" />} Marquer comme restituée
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Read-only tenant-facing variant.
export function TenantDepositRefundCard({ leaseId }: { leaseId: string }) {
  const [refund, setRefund] = useState<DepositRefund | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch<{ data: DepositRefund | null }>(`/api/leases/${leaseId}/deposit-refund`)
      .then((result) => setRefund(result.data))
      .catch(() => setRefund(null))
      .finally(() => setLoading(false))
  }, [leaseId])

  if (loading) return <div className="h-16 rounded-lg bg-muted animate-pulse" />
  if (!refund) return null

  const badge = statusLabels[refund.status]

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-brand-500" /> Restitution de caution</span>
          <Badge variant="outline" className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-xs">
        <p>Caution perçue : <span className="font-medium text-foreground">{formatFCFA(refund.depositAmount)}</span></p>
        {refund.status === 'PENDING' && (
          <p className="text-muted-foreground">Le propriétaire n&apos;a pas encore décidé du montant à restituer.</p>
        )}
        {refund.status !== 'PENDING' && (
          <>
            <p>Montant à restituer : <span className="font-medium text-foreground">{formatFCFA(refund.refundAmount || 0)}</span></p>
            {refund.deductions > 0 && (
              <p className="text-muted-foreground">Retenue : {formatFCFA(refund.deductions)} — {refund.deductionReason}</p>
            )}
            {refund.justificationUrl && (
              <a href={refund.justificationUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Voir le justificatif</a>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
