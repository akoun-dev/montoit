'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, FileSignature, Building2, User, MapPin, FileText, CreditCard, Wrench, AlertTriangle, Loader2, PenTool, CheckCircle2, ShieldCheck, Download, RefreshCw, Receipt, MessageSquare } from 'lucide-react'
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
import { useRealtimeLeases } from '@/hooks/use-realtime-leases'
import { apiFetch } from '@/lib/capacitor'
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
  renewalStatus?: string | null
  renewalRequestedAt?: string | null
  renewalNotes?: string | null
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

async function loadReceiptLogo(): Promise<Uint8Array | null> {
  try {
    const response = await fetch('/assets/splash.png')
    if (!response.ok) return null
    const bitmap = await createImageBitmap(await response.blob())
    const canvas = document.createElement('canvas')
    canvas.width = 86
    canvas.height = 86
    const context = canvas.getContext('2d')
    if (!context) return null
    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1]
    const binary = atob(base64)
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

async function generateDepositReceipt(data: {
  tenantName: string
  propertyTitle: string
  propertyAddress: string
  propertyCity: string
  depositAmount: number
  leaseStartDate: string
  leaseEndDate: string
  ownerName: string
  currentDate: string
}): Promise<Blob> {
  const logoBytes = await loadReceiptLogo()
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  // Helvetica uses WinAnsi in a PDF, so normalize accents before writing text.
  const pdfText = (value: string) => value
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[\\()]/g, (character) => `\\${character}`)

  const lines = [
    'RECU DE DEPOT DE GARANTIE',
    "Conformement a l'article 4 du contrat de location",
    '',
    `Montant : ${data.depositAmount.toLocaleString('fr-FR')} FCFA`,
    `Locataire : ${data.tenantName}`,
    `Proprietaire : ${data.ownerName}`,
    `Bien concerne : ${data.propertyTitle} - ${data.propertyCity}`,
    `Adresse : ${data.propertyAddress || data.propertyCity}`,
    `Debut du bail : ${fmt(data.leaseStartDate)}`,
    `Fin du bail : ${fmt(data.leaseEndDate)}`,
    `Date du recu : ${fmt(data.currentDate)}`,
    'Nature : Depot de garantie (caution)',
    '',
    'Ce document fait office de recu de depot de garantie.',
    'Document genere automatiquement - Sans valeur de facture officielle.',
  ].map(pdfText)

  const drawText = (text: string, x: number, y: number, size: number, color = '0.13 0.13 0.13') => [
    'BT',
    `${color} rg`,
    `/F1 ${size} Tf`,
    `${x} ${y} Td`,
    `(${text}) Tj`,
    'ET',
  ].join('\n')

  const content = [
    // Use the official splash logo in the branded document header.
    'q',
    '1 0.4235 0.1843 rg',
    '0 742 595 100 re f',
    'Q',
    ...(logoBytes ? ['q', '86 0 0 86 42 750 cm', '/Logo Do', 'Q'] : [drawText('MON TOIT', 98, 786, 20, '1 1 1'), drawText('PLATEFORME DE LOCATION ANSUT', 100, 765, 9, '1 0.9 0.86')]),
    drawText(lines[0], 50, 700, 18, '1 0.4235 0.1843'),
    drawText(lines[1], 50, 680, 10, '0.4 0.4 0.4'),
    'q',
    '0.98 0.97 0.95 rg',
    '42 380 511 260 re f',
    'Q',
    drawText(lines[3], 64, 600, 16, '0.03 0.55 0.35'),
    ...lines.slice(4, 12).flatMap((line, index) => [
      drawText(line, 64, 565 - (index * 26), 11),
      '0.9 0.9 0.9 RG',
      `64 ${550 - (index * 26)} m 531 ${550 - (index * 26)} l S`,
    ]),
    drawText('RECU', 265, 335, 15, '1 0.4235 0.1843'),
    drawText(lines[13], 64, 275, 10, '0.4 0.4 0.4'),
    drawText(lines[14], 64, 255, 10, '0.4 0.4 0.4'),
  ].join('\n')

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >>${logoBytes ? ' /XObject << /Logo 5 0 R >>' : ''} >> /Contents ${logoBytes ? 6 : 5} 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  const contentObject = `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`
  const parts: Array<string | ArrayBuffer> = ['%PDF-1.4\n']
  const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const offsets = [0]
  let byteOffset = new TextEncoder().encode('%PDF-1.4\n').length
  const appendObject = (objectNumber: number, value: string | Uint8Array) => {
    offsets[objectNumber] = byteOffset
    const prefix = new TextEncoder().encode(`${objectNumber} 0 obj\n`)
    const suffix = new TextEncoder().encode('\nendobj\n')
    parts.push(toArrayBuffer(prefix), typeof value === 'string' ? value : toArrayBuffer(value), toArrayBuffer(suffix))
    byteOffset += prefix.length + (typeof value === 'string' ? new TextEncoder().encode(value).length : value.length) + suffix.length
  }
  const appendBinaryObject = (objectNumber: number, header: string, bytes: Uint8Array) => {
    offsets[objectNumber] = byteOffset
    const prefix = new TextEncoder().encode(`${objectNumber} 0 obj\n${header}`)
    const suffix = new TextEncoder().encode('\nendstream\nendobj\n')
    parts.push(toArrayBuffer(prefix), toArrayBuffer(bytes), toArrayBuffer(suffix))
    byteOffset += prefix.length + bytes.length + suffix.length
  }
  objects.forEach((object, index) => appendObject(index + 1, object))
  if (logoBytes) {
    appendBinaryObject(5, `<< /Type /XObject /Subtype /Image /Width 86 /Height 86 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoBytes.length} >>\nstream\n`, logoBytes)
    appendObject(6, contentObject)
  } else {
    appendObject(5, contentObject)
  }
  const xrefOffset = byteOffset
  const size = logoBytes ? 8 : 6
  parts.push(`xref\n0 ${size}\n0000000000 65535 f \n`)
  parts.push(offsets.slice(1, size).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join(''))
  parts.push(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)
  return new Blob(parts, { type: 'application/pdf' })
}

// ─── Component ──────────────────────────────────────────────────────────────
interface LeaseDetailProps {
  leaseId: string
  onBack: () => void
}

export function LeaseDetail({ leaseId, onBack }: LeaseDetailProps) {
  const { user, isAuthenticated } = useAuthStore()
  const [lease, setLease] = useState<LeaseItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [terminating, setTerminating] = useState(false)
  const [showTerminateDialog, setShowTerminateDialog] = useState(false)

  // Signing flow state
  const [showSignDialog, setShowSignDialog] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)

  // Renewal flow state
  const [showRenewalDialog, setShowRenewalDialog] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [renewalNotes, setRenewalNotes] = useState('')

  // Deposit receipt state
  const [generatingReceipt, setGeneratingReceipt] = useState(false)

  const fetchLease = useCallback(async (skipCache = false) => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const result = await authFetch<{ data: LeaseItem }>(`/api/leases/${leaseId}`, skipCache ? { skipCache: true } : undefined)
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

  // Realtime — refresh when lease status changes (owner signs, etc.)
  useRealtimeLeases({
    userId: user?.id,
    onLeaseChange: (event, lease) => {
      if (event === 'UPDATE' && lease.id === leaseId) fetchLease(true)
    },
  })

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

  const resetSignState = useCallback(() => {
    setSignatureDataUrl(null)
    setSigning(false)
  }, [])

  // Step 1: User confirmed handwritten signature → sign directly (no CRYPTONEO for tenant)
  const handleSignatureConfirm = useCallback((dataUrl: string) => {
    setSignatureDataUrl(dataUrl)
    setSigning(true)
    authFetch<{ data: LeaseItem }>(`/api/leases/${leaseId}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signatureImage: dataUrl }),
    }).then((result) => {
      toast.success('Bail signé avec succès !')
      setShowSignDialog(false)
      resetSignState()
      if (result.data) setLease(result.data)
      else fetchLease()
    }).catch((err) => {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur lors de la signature')
      } else {
        toast.error('Erreur lors de la signature du bail')
      }
    }).finally(() => {
      setSigning(false)
    })
  }, [leaseId])

  const handleSignatureCancel = useCallback(() => {
    setShowSignDialog(false)
    resetSignState()
  }, [])

  const closeSignDialog = (open: boolean) => {
    setShowSignDialog(open)
    if (!open) setSigning(false)
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
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-brand-500/10 to-transparent -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 rounded-none">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground -ml-2 mb-3">
          <ArrowLeft className="size-4" /> Retour aux baux
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand-100">
            <FileSignature className="size-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Détail du bail</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Du {formatShortDate(lease.startDate)} au {formatShortDate(lease.endDate)}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <Badge className={`text-xs px-3 py-1 ${statusInfo.color} w-fit`}>{statusInfo.label}</Badge>
        </div>
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
      <div className="pt-2">
        <Button
          variant="outline"
          className="w-full border-brand-200 text-brand-600 hover:bg-brand-50 hover:text-brand-700 gap-2"
          onClick={async () => {
            try {
              const res = await apiFetch(`/api/leases/${lease.id}/contract?format=pdf`)
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

      {/* ─── Deposit Receipt Button (client-side generation) ─────────────── */}
      {(lease.status === 'ACTIVE' || lease.status === 'TERMINATED') && (lease.deposit || 0) > 0 && (
        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 gap-2"
            onClick={async () => {
              setGeneratingReceipt(true)
              try {
                const receiptBlob = await generateDepositReceipt({
                  tenantName: `${user?.firstName || ''} ${user?.lastName || ''}`,
                  propertyTitle: property?.title || '',
                  propertyAddress: property?.address || '',
                  propertyCity: property?.city || '',
                  depositAmount: lease.deposit || 0,
                  leaseStartDate: lease.startDate,
                  leaseEndDate: lease.endDate,
                  ownerName: `${owner.firstName} ${owner.lastName}`,
                  currentDate: new Date().toISOString(),
                })
                const url = URL.createObjectURL(receiptBlob)
                const a = document.createElement('a')
                a.href = url
                a.download = `Reçu_caution_${property?.title || 'logement'}.pdf`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                toast.success('Reçu de caution téléchargé')
              } catch {
                toast.error('Erreur lors de la génération du reçu')
              } finally {
                setGeneratingReceipt(false)
              }
            }}
            disabled={generatingReceipt}
          >
            {generatingReceipt ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Receipt className="size-4" />
            )}
            {generatingReceipt ? 'Génération...' : 'Télécharger le reçu de caution'}
          </Button>
        </div>
      )}

      {/* ─── Renewal Button ─────────────────────────────────────────────── */}
      {lease.status === 'ACTIVE' && !lease.renewalStatus && (
        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full border-brand-200 text-brand-600 hover:bg-brand-50 hover:text-brand-700 gap-2"
            onClick={() => setShowRenewalDialog(true)}
          >
            <RefreshCw className="size-4" />
            Demander le renouvellement du bail
          </Button>
        </div>
      )}

      {/* Renewal status display */}
      {lease.renewalStatus && (
        <div className="pt-2">
          <Card className={`border ${
            lease.renewalStatus === 'ACCEPTED' ? 'border-emerald-200 bg-emerald-50' :
            lease.renewalStatus === 'REJECTED' ? 'border-red-200 bg-red-50' :
            lease.renewalStatus === 'RENEWED' ? 'border-blue-200 bg-blue-50' :
            'border-amber-200 bg-amber-50'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <RefreshCw className={`size-5 shrink-0 ${
                  lease.renewalStatus === 'ACCEPTED' ? 'text-emerald-600' :
                  lease.renewalStatus === 'REJECTED' ? 'text-red-600' :
                  lease.renewalStatus === 'RENEWED' ? 'text-blue-600' :
                  'text-amber-600'
                }`} />
                <div>
                  <p className="text-sm font-medium">
                    {lease.renewalStatus === 'REQUESTED' && 'Demande de renouvellement en cours'}
                    {lease.renewalStatus === 'ACCEPTED' && 'Demande de renouvellement acceptée'}
                    {lease.renewalStatus === 'REJECTED' && 'Demande de renouvellement refusée'}
                    {lease.renewalStatus === 'RENEWED' && 'Bail renouvelé avec succès'}
                  </p>
                  {lease.renewalRequestedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Demandé le {formatShortDate(lease.renewalRequestedAt)}
                    </p>
                  )}
                  {lease.renewalNotes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Note : {lease.renewalNotes}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
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

      {/* ─── Sign Dialog: Handwritten Signature (no CRYPTONEO for tenant) ──── */}
      <Dialog open={showSignDialog} onOpenChange={closeSignDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="size-5 text-brand-500" />
              Signature du bail
            </DialogTitle>
            <DialogDescription>
              Dessinez votre signature manuscrite pour le bail de <span className="font-semibold text-foreground">{lease?.property?.title || property?.title}</span>.
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

            {/* Signature Pad */}
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-xs text-blue-700">
                  Dessinez votre signature manuscrite ci-dessous. Elle sera associée au contrat de location.
                </p>
              </div>
              <SignaturePad
                onConfirm={handleSignatureConfirm}
                onCancel={handleSignatureCancel}
                signatoryRole="Locataire"
                {...({ disabled: signing } as any)}
              />
            </div>
          </div>

          {signing && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Signature en cours...
            </div>
          )}
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

      {/* ─── Renewal Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="size-5 text-brand-500" />
              Demander le renouvellement du bail
            </DialogTitle>
            <DialogDescription className="pt-2">
              Vous souhaitez renouveler le bail pour <span className="font-semibold text-foreground">{property?.title}</span>.
              {daysRemaining > 0 && daysRemaining <= 90 && (
                <span className="block mt-1 text-amber-600">
                  ⚠️ Le bail expire dans {daysRemaining} jours. Nous vous recommandons d&apos;anticiper le renouvellement.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-muted">
                <span className="text-muted-foreground">Loyer actuel</span>
                <p className="font-semibold text-foreground">{formatCurrency(lease.monthlyRent)}</p>
              </div>
              <div className="p-2 rounded bg-muted">
                <span className="text-muted-foreground">Fin du bail</span>
                <p className="font-semibold text-foreground">{formatShortDate(lease.endDate)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Message au propriétaire (optionnel)</Label>
              <textarea
                className="w-full min-h-[80px] rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Ex: Je souhaite continuer à occuper le logement pour une durée supplémentaire..."
                value={renewalNotes}
                onChange={(e) => setRenewalNotes(e.target.value)}
              />
            </div>

            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-xs text-blue-700">
                Votre demande sera envoyée au propriétaire pour examen. Une fois approuvée, un nouveau bail vous sera proposé.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowRenewalDialog(false)}
              disabled={renewing}
            >
              Annuler
            </Button>
            <Button
              className="bg-brand-500 hover:bg-brand-600 text-white gap-2"
              onClick={async () => {
                setRenewing(true)
                try {
                  await authFetch('/api/renewals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      leaseId: lease.id,
                      notes: renewalNotes || undefined,
                    }),
                  })
                  toast.success('Demande de renouvellement envoyée au propriétaire')
                  setShowRenewalDialog(false)
                  setRenewalNotes('')
                  setTimeout(() => fetchLease(true), 500)
                } catch (err) {
                  toast.error(err instanceof AuthError ? err.message : 'Erreur lors de la demande')
                } finally {
                  setRenewing(false)
                }
              }}
              disabled={renewing}
            >
              {renewing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <MessageSquare className="size-4" />
                  Envoyer la demande
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
