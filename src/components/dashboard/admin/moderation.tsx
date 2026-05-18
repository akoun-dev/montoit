'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileCheck, FileX, AlertTriangle, MessageSquare, Clock, Check, X, Eye, History, Loader2, RefreshCw, User, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────

interface OwnershipDoc {
  id: string
  name: string
  type: string
  url: string
  status: string
  tcComment: string | null
  createdAt: string
  owner: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
  }
  reviewedBy: {
    id: string
    firstName: string
    lastName: string
  } | null
}

interface RentalFile {
  id: string
  status: string
  priority: string
  onHold: boolean
  onHoldReason: string | null
  tenantCategory: string | null
  monthlyIncome: number | null
  employer: string | null
  rejectionReason: string | null
  tcComment: string | null
  reviewedAt: string | null
  createdAt: string
  tenant: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  documents: Array<{
    id: string
    type: string
    url: string
    name: string
    status: string
    tcComment: string | null
    createdAt: string
  }>
}

interface Signalement {
  id: string
  reason: string
  description: string
  status: string
  adminNotes: string | null
  resolution: string | null
  entityType: string
  entityId: string
  createdAt: string
  updatedAt: string
  reporter: { id: string; firstName: string; lastName: string; email: string; role: string }
  handledBy: { id: string; firstName: string; lastName: string } | null
}

interface AuditLogEntry {
  id: string
  action: string
  entity: string
  entityId: string | null
  details: string | null
  createdAt: string
  user: { firstName: string; lastName: string }
}

interface SignalementStats {
  byStatus: Record<string, number>
  byReason: Record<string, number>
}

// ─── Labels ─────────────────────────────────────────────────────────────────

const docTypeLabels: Record<string, string> = {
  TITRE_FONCIER: 'Titre foncier',
  ACTE_NOTARIE: 'Acte notarié',
  ATTESTATION_PROPRIETE: 'Attestation de propriété',
  RCCM: 'RCCM',
  AGREMENT: 'Agrément',
  ID_CARD: 'Carte d\'identité',
  PASSPORT: 'Passeport',
  PAY_SLIP: 'Fiche de paie',
  EMPLOYMENT_CONTRACT: 'Contrat de travail',
  BANK_STATEMENT: 'Relevé bancaire',
  OTHER: 'Autre',
}

const reasonLabels: Record<string, string> = {
  INAPPROPRIATE_CONTENT: 'Contenu inapproprié',
  FRAUD: 'Fraude',
  SPAM: 'Spam',
  HARASSMENT: 'Harcèlement',
  FALSE_INFORMATION: 'Fausse information',
  OTHER: 'Autre',
}

const entityTypeLabels: Record<string, string> = {
  PROPERTY: 'Bien immobilier',
  USER: 'Utilisateur',
  REVIEW: 'Avis',
  MESSAGE: 'Message',
}

const signalementStatusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
  IN_REVIEW: { label: 'En revue', className: 'bg-teal-100 text-teal-700' },
  VALIDATED: { label: 'Validé', className: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejeté', className: 'bg-red-100 text-red-700' },
  ESCALATED: { label: 'Escaladé', className: 'bg-orange-100 text-orange-700' },
  RESOLVED: { label: 'Résolu', className: 'bg-neutral-100 text-neutral-700' },
}

const rentalFileStatusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  TC_REVIEW: 'En revue TC',
  VALIDATED: 'Validé',
  REJECTED: 'Rejeté',
  EXPIRED: 'Expiré',
}

const rentalFileStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  TC_REVIEW: 'bg-orange-100 text-orange-700',
  VALIDATED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
}

const ownershipDocStatusLabels: Record<string, string> = {
  PENDING: 'En attente',
  VALIDATED: 'Validé',
  REJECTED: 'Rejeté',
}

const ownershipDocStatusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  VALIDATED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AdminModeration() {
  const { isAuthenticated } = useAuthStore()

  // Data states
  const [ownershipDocs, setOwnershipDocs] = useState<OwnershipDoc[]>([])
  const [rentalFiles, setRentalFiles] = useState<RentalFile[]>([])
  const [signalements, setSignalements] = useState<Signalement[]>([])
  const [signalementStats, setSignalementStats] = useState<SignalementStats>({ byStatus: {}, byReason: {} })
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])

  // UI states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('ownership-docs')
  const [processing, setProcessing] = useState<string | null>(null)

  // Dialog states
  const [docDialog, setDocDialog] = useState<{
    open: boolean
    type: 'ownership' | 'rental'
    item: OwnershipDoc | RentalFile | null
    action: 'validate' | 'reject'
  }>({ open: false, type: 'ownership', item: null, action: 'validate' })
  const [comment, setComment] = useState('')

  const [signalementDialog, setSignalementDialog] = useState<{
    open: boolean
    signalement: Signalement | null
    action: string
  }>({ open: false, signalement: null, action: '' })
  const [adminNotes, setAdminNotes] = useState('')

  // ─── Fetch data ────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }

    setError(null)
    try {
      const [ownershipRes, rentalRes, signalementRes, logsRes] = await Promise.allSettled([
        authFetch<{ docs: OwnershipDoc[]; pagination: { total: number } }>('/api/tc/ownership-docs?status=PENDING'),
        authFetch<{ files: RentalFile[]; pagination: { total: number } }>('/api/tc/rental-files?status=SUBMITTED'),
        authFetch<{ signalements: Signalement[]; stats: SignalementStats }>('/api/admin/signalements?status=PENDING'),
        authFetch<{ logs: AuditLogEntry[]; pagination: { total: number } }>('/api/history?limit=20'),
      ])

      if (ownershipRes.status === 'fulfilled') {
        setOwnershipDocs(ownershipRes.value.docs || [])
      }
      if (rentalRes.status === 'fulfilled') {
        setRentalFiles(rentalRes.value.files || [])
      }
      if (signalementRes.status === 'fulfilled') {
        setSignalements(signalementRes.value.signalements || [])
        setSignalementStats(signalementRes.value.stats || { byStatus: {}, byReason: {} })
      }
      if (logsRes.status === 'fulfilled') {
        setAuditLogs(logsRes.value.logs || [])
      }
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Actions ───────────────────────────────────────────────────────────

  const handleOwnershipDocAction = async () => {
    if (!docDialog.item) return
    const doc = docDialog.item as OwnershipDoc
    setProcessing(doc.id)
    try {
      await authFetch('/api/tc/ownership-docs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docIds: [doc.id],
          action: docDialog.action === 'validate' ? 'APPROVE' : 'REJECT',
          comment,
        }),
      })
      toast.success(docDialog.action === 'validate' ? 'Document validé' : 'Document rejeté')
      setDocDialog({ ...docDialog, open: false })
      setComment('')
      fetchData()
    } catch (err) {
      if (err instanceof AuthError) toast.error(err.message)
      else toast.error('Erreur lors de l\'action')
    } finally {
      setProcessing(null)
    }
  }

  const handleRentalFileAction = async () => {
    if (!docDialog.item) return
    const file = docDialog.item as RentalFile
    setProcessing(file.id)
    try {
      await authFetch('/api/tc/rental-files', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: [file.id],
          action: docDialog.action === 'validate' ? 'APPROVE' : 'REJECT',
          comment,
        }),
      })
      toast.success(docDialog.action === 'validate' ? 'Dossier approuvé' : 'Dossier rejeté')
      setDocDialog({ ...docDialog, open: false })
      setComment('')
      fetchData()
    } catch (err) {
      if (err instanceof AuthError) toast.error(err.message)
      else toast.error('Erreur lors de l\'action')
    } finally {
      setProcessing(null)
    }
  }

  const handleSignalementAction = async () => {
    if (!signalementDialog.signalement) return
    setProcessing(signalementDialog.signalement.id)
    try {
      await authFetch('/api/admin/signalements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: signalementDialog.signalement.id,
          status: signalementDialog.action,
          adminNotes,
        }),
      })
      toast.success(`Signalement ${signalementStatusConfig[signalementDialog.action]?.label?.toLowerCase() || 'mis à jour'}`)
      setSignalementDialog({ open: false, signalement: null, action: '' })
      setAdminNotes('')
      fetchData()
    } catch (err) {
      if (err instanceof AuthError) toast.error(err.message)
      else toast.error('Erreur lors du traitement')
    } finally {
      setProcessing(null)
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-96 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-12 rounded-lg bg-muted animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  // ─── Error ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Modération du contenu</h1>
          <p className="text-muted-foreground mt-1">Validation des documents et modération du contenu</p>
        </div>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="size-10 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-medium">{error}</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={() => { setLoading(true); fetchData() }}>
              <RefreshCw className="size-4" /> Réessayer
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Modération du contenu</h1>
          <p className="text-muted-foreground mt-1">Validation des documents et modération du contenu</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => { setLoading(true); fetchData() }}>
          <RefreshCw className="size-4" /> Actualiser
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{ownershipDocs.length}</p>
            <p className="text-xs text-muted-foreground">Docs propriété</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">{rentalFiles.length}</p>
            <p className="text-xs text-muted-foreground">Dossiers locatifs</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{signalements.length}</p>
            <p className="text-xs text-muted-foreground">Signalements</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{auditLogs.length}</p>
            <p className="text-xs text-muted-foreground">Actions récentes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 bg-muted">
          <TabsTrigger value="ownership-docs">Documents de propriété</TabsTrigger>
          <TabsTrigger value="rental-files">Dossiers locatifs</TabsTrigger>
          <TabsTrigger value="signalements">Signalements</TabsTrigger>
        </TabsList>

        {/* ─── Ownership Docs Tab ────────────────────────────────────── */}
        <TabsContent value="ownership-docs" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileCheck className="size-5 text-amber-600" />
                Documents de propriété en attente
              </CardTitle>
              <CardDescription>Documents soumis par les propriétaires pour validation</CardDescription>
            </CardHeader>
            <CardContent>
              {ownershipDocs.length === 0 ? (
                <div className="py-8 text-center">
                  <FileCheck className="size-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucun document en attente</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {ownershipDocs.map((doc) => (
                      <motion.div
                        key={doc.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <FileText className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {docTypeLabels[doc.type] || doc.type} · {doc.owner.firstName} {doc.owner.lastName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={ownershipDocStatusColors[doc.status] || 'bg-gray-100 text-gray-700'}>
                            {ownershipDocStatusLabels[doc.status] || doc.status}
                          </Badge>
                          {doc.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50 gap-1"
                                disabled={processing === doc.id}
                                onClick={() => {
                                  setDocDialog({ open: true, type: 'ownership', item: doc, action: 'validate' })
                                  setComment('')
                                }}
                              >
                                {processing === doc.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                                Valider
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                                disabled={processing === doc.id}
                                onClick={() => {
                                  setDocDialog({ open: true, type: 'ownership', item: doc, action: 'reject' })
                                  setComment('')
                                }}
                              >
                                <X className="size-3.5" /> Rejeter
                              </Button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Rental Files Tab ──────────────────────────────────────── */}
        <TabsContent value="rental-files" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileCheck className="size-5 text-teal-600" />
                Dossiers locatifs en attente
              </CardTitle>
              <CardDescription>Dossiers soumis par les locataires pour vérification</CardDescription>
            </CardHeader>
            <CardContent>
              {rentalFiles.length === 0 ? (
                <div className="py-8 text-center">
                  <FileCheck className="size-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucun dossier locatif en attente</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {rentalFiles.map((file) => (
                      <motion.div
                        key={file.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                            <User className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {file.tenant.firstName} {file.tenant.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {file.documents.length} document{file.documents.length !== 1 ? 's' : ''} · {rentalFileStatusLabels[file.status] || file.status}
                              {file.monthlyIncome != null && ` · ${file.monthlyIncome.toLocaleString('fr-FR')} FCFA`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={rentalFileStatusColors[file.status] || 'bg-gray-100 text-gray-700'}>
                            {rentalFileStatusLabels[file.status] || file.status}
                          </Badge>
                          {(file.status === 'SUBMITTED' || file.status === 'TC_REVIEW') && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50 gap-1"
                                disabled={processing === file.id}
                                onClick={() => {
                                  setDocDialog({ open: true, type: 'rental', item: file, action: 'validate' })
                                  setComment('')
                                }}
                              >
                                {processing === file.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                                Valider
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                                disabled={processing === file.id}
                                onClick={() => {
                                  setDocDialog({ open: true, type: 'rental', item: file, action: 'reject' })
                                  setComment('')
                                }}
                              >
                                <X className="size-3.5" /> Rejeter
                              </Button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Signalements Tab ──────────────────────────────────────── */}
        <TabsContent value="signalements" className="mt-4 space-y-4">
          {/* Stats */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Par statut</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(signalementStats.byStatus).map(([status, count]) => {
                  const cfg = signalementStatusConfig[status] || { label: status, className: 'bg-neutral-100 text-neutral-700' }
                  return (
                    <Badge key={status} className={cfg.className}>
                      {cfg.label}: {count}
                    </Badge>
                  )
                })}
                {Object.keys(signalementStats.byStatus).length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée</p>}
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Par raison</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(signalementStats.byReason).map(([reason, count]) => (
                  <Badge key={reason} variant="outline" className="py-1">
                    {reasonLabels[reason] || reason}: {count}
                  </Badge>
                ))}
                {Object.keys(signalementStats.byReason).length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée</p>}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-600" />
                Signalements de contenu
              </CardTitle>
            </CardHeader>
            <CardContent>
              {signalements.length === 0 ? (
                <div className="py-8 text-center">
                  <AlertTriangle className="size-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucun signalement de contenu</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {signalements.map((report) => {
                      const cfg = signalementStatusConfig[report.status] || { label: report.status, className: 'bg-neutral-100 text-neutral-700' }
                      return (
                        <motion.div
                          key={report.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-3 rounded-lg border border-border"
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={cfg.className}>{cfg.label}</Badge>
                              <Badge variant="outline">{reasonLabels[report.reason] || report.reason}</Badge>
                              <Badge variant="outline" className="text-xs">{entityTypeLabels[report.entityType] || report.entityType}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <p className="text-sm text-foreground">{report.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Signalé par : {report.reporter.firstName} {report.reporter.lastName}
                          </p>
                          {report.adminNotes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Notes : {report.adminNotes}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => toast.info('Fonctionnalité à venir')}>
                              <Eye className="size-3.5" /> Voir le contenu
                            </Button>
                            {report.status === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white gap-1"
                                  disabled={processing === report.id}
                                  onClick={() => {
                                    setSignalementDialog({ open: true, signalement: report, action: 'VALIDATED' })
                                    setAdminNotes('')
                                  }}
                                >
                                  <Check className="size-3.5" /> Valider
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                                  disabled={processing === report.id}
                                  onClick={() => {
                                    setSignalementDialog({ open: true, signalement: report, action: 'REJECTED' })
                                    setAdminNotes('')
                                  }}
                                >
                                  <X className="size-3.5" /> Rejeter
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 border-orange-200 hover:bg-orange-50 gap-1"
                                  onClick={() => {
                                    setSignalementDialog({ open: true, signalement: report, action: 'ESCALATED' })
                                    setAdminNotes('')
                                  }}
                                >
                                  Escalader
                                </Button>
                              </>
                            )}
                            {(report.status === 'IN_REVIEW' || report.status === 'ESCALATED') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-teal-600 border-teal-200 hover:bg-teal-50 gap-1"
                                disabled={processing === report.id}
                                onClick={() => {
                                  setSignalementDialog({ open: true, signalement: report, action: 'RESOLVED' })
                                  setAdminNotes('')
                                }}
                              >
                                <Check className="size-3.5" /> Résoudre
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Action History ──────────────────────────────────────────── */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <History className="size-5 text-muted-foreground" />
            Historique des actions récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucune action récente</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-2 rounded border border-border text-sm">
                  <Clock className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground font-medium">{log.user.firstName} {log.user.lastName}</span>
                  <span className="text-muted-foreground">— {log.action}</span>
                  <span className="text-muted-foreground">({log.entity})</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">{new Date(log.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Document Action Dialog ──────────────────────────────────── */}
      <Dialog open={docDialog.open} onOpenChange={(open) => setDocDialog({ ...docDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {docDialog.action === 'validate' ? 'Valider' : 'Rejeter'} {' '}
              {docDialog.type === 'ownership' ? 'le document' : 'le dossier'}
            </DialogTitle>
            <DialogDescription>
              {docDialog.item
                ? docDialog.type === 'ownership'
                  ? `${(docDialog.item as OwnershipDoc).name} (${docTypeLabels[(docDialog.item as OwnershipDoc).type] || (docDialog.item as OwnershipDoc).type})`
                  : `Dossier de ${(docDialog.item as RentalFile).tenant.firstName} ${(docDialog.item as RentalFile).tenant.lastName}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Commentaire (optionnel pour validation, recommandé pour rejet)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialog({ ...docDialog, open: false })}>Annuler</Button>
            <Button
              className={docDialog.action === 'validate' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
              onClick={() => {
                if (docDialog.type === 'ownership') handleOwnershipDocAction()
                else handleRentalFileAction()
              }}
              disabled={processing !== null || (docDialog.action === 'reject' && !comment.trim())}
            >
              {processing ? (
                <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> En cours...</span>
              ) : docDialog.action === 'validate' ? 'Valider' : 'Rejeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Signalement Action Dialog ───────────────────────────────── */}
      <Dialog open={signalementDialog.open} onOpenChange={(open) => setSignalementDialog({ ...signalementDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {signalementDialog.action === 'VALIDATED' && 'Valider le signalement'}
              {signalementDialog.action === 'REJECTED' && 'Rejeter le signalement'}
              {signalementDialog.action === 'ESCALATED' && 'Escalader le signalement'}
              {signalementDialog.action === 'RESOLVED' && 'Résoudre le signalement'}
            </DialogTitle>
            <DialogDescription>
              {signalementDialog.signalement && `Signalement #${signalementDialog.signalement.id.slice(0, 8)}...`}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Notes administrateur (optionnel)"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignalementDialog({ ...signalementDialog, open: false })}>Annuler</Button>
            <Button
              className={
                signalementDialog.action === 'VALIDATED' ? 'bg-green-600 hover:bg-green-700 text-white' :
                signalementDialog.action === 'REJECTED' ? 'bg-red-600 hover:bg-red-700 text-white' :
                signalementDialog.action === 'ESCALATED' ? 'bg-orange-600 hover:bg-orange-700 text-white' :
                'bg-teal-600 hover:bg-teal-700 text-white'
              }
              onClick={handleSignalementAction}
              disabled={processing !== null}
            >
              {processing ? (
                <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> En cours...</span>
              ) : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
