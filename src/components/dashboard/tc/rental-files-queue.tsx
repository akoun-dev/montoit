'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ClipboardCheck,
  FileText,
  Check,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Eye,
  User,
  Building2,
  Calendar,
  FileCheck,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useAuthStore } from '@/lib/auth-store'
import { ViewModeToggle, type ViewMode } from './view-mode-toggle'
import { DocumentPreviewDialog } from './document-preview-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────

interface RentalFile {
  id: string
  status: 'DRAFT' | 'SUBMITTED' | 'TC_REVIEW' | 'VALIDATED' | 'REJECTED' | 'EXPIRED'
  tenantCategory: string | null
  monthlyIncome: number | null
  employer: string | null
  employmentType: string | null
  guarantorName: string | null
  guarantorPhone: string | null
  rejectionReason: string | null
  tcComment: string | null
  reviewedAt: string | null
  createdAt: string
  tenant: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email: string
    avatarUrl: string | null
  }
  documents: Array<{
    id: string
    type: string
    url: string
    name: string
    status: 'PENDING' | 'VALIDATED' | 'REJECTED'
    tcComment: string | null
    createdAt: string
  }>
}

interface ApiPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ApiResponse {
  files: RentalFile[]
  pagination: ApiPagination
}

// ─── Status helpers ─────────────────────────────────────────────────────────

const statusLabels: Record<RentalFile['status'], string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  TC_REVIEW: 'En revue TC',
  VALIDATED: 'Validé',
  REJECTED: 'Rejeté',
  EXPIRED: 'Expiré',
}

const statusColors: Record<RentalFile['status'], string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  TC_REVIEW: 'bg-orange-100 text-orange-700',
  VALIDATED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
}

const docStatusColors: Record<RentalFile['documents'][0]['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  VALIDATED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const docStatusLabels: Record<RentalFile['documents'][0]['status'], string> = {
  PENDING: 'En attente',
  VALIDATED: 'Validé',
  REJECTED: 'Rejeté',
}

const filterableStatuses: RentalFile['status'][] = [
  'SUBMITTED',
  'TC_REVIEW',
  'VALIDATED',
  'REJECTED',
]

// ─── Component ──────────────────────────────────────────────────────────────

export function RentalFilesQueue() {
  const { isAuthenticated } = useAuthStore()

  // Data
  const [files, setFiles] = useState<RentalFile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // View
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<RentalFile['status'] | 'ALL'>('ALL')

  // Expanded cards
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Dialogs
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; file: RentalFile | null }>({
    open: false,
    file: null,
  })
  const [requestInfoDialog, setRequestInfoDialog] = useState<{ open: boolean; file: RentalFile | null }>({
    open: false,
    file: null,
  })
  const [dialogComment, setDialogComment] = useState('')

  // Document preview
  const [previewDoc, setPreviewDoc] = useState<{
    open: boolean
    url: string
    name: string
    type?: string
  }>({ open: false, url: '', name: '' })

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (search.trim()) params.set('search', search.trim())
      params.set('page', '1')
      params.set('limit', '50')

      const qs = params.toString()
      const url = `/api/tc/rental-files${qs ? `?${qs}` : ''}`

      const data = await authFetch<ApiResponse>(url)
      setFiles(data.files || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setFiles([])
        return
      }
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, statusFilter, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleAction = useCallback(
    async (fileId: string, action: 'APPROVE' | 'REJECT' | 'REQUEST_INFO', comment?: string) => {
      setActionLoading(fileId)
      try {
        await authFetch('/api/tc/rental-files', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileIds: [fileId], action, comment: comment || '' }),
        })
        toast.success(
          action === 'APPROVE'
            ? 'Dossier validé avec succès !'
            : action === 'REJECT'
              ? 'Dossier rejeté.'
              : 'Demande d\'information envoyée.'
        )
        await fetchData()
      } catch (err) {
        if (err instanceof AuthError) {
          toast.error(err.message)
        } else {
          toast.error('Erreur lors de l\'action.')
        }
      } finally {
        setActionLoading(null)
      }
    },
    [fetchData]
  )

  const handleValidate = useCallback(
    (fileId: string) => handleAction(fileId, 'APPROVE'),
    [handleAction]
  )

  const handleRejectConfirm = useCallback(() => {
    if (rejectDialog.file) {
      handleAction(rejectDialog.file.id, 'REJECT', dialogComment)
      setRejectDialog({ open: false, file: null })
      setDialogComment('')
    }
  }, [rejectDialog.file, dialogComment, handleAction])

  const handleRequestInfoConfirm = useCallback(() => {
    if (requestInfoDialog.file) {
      handleAction(requestInfoDialog.file.id, 'REQUEST_INFO', dialogComment)
      setRequestInfoDialog({ open: false, file: null })
      setDialogComment('')
    }
  }, [requestInfoDialog.file, dialogComment, handleAction])

  // ─── Toggle expand ─────────────────────────────────────────────────────

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Document preview ──────────────────────────────────────────────────

  const openDocPreview = (doc: RentalFile['documents'][0]) => {
    setPreviewDoc({ open: true, url: doc.url, name: doc.name, type: doc.type })
  }

  // ─── Filtered files (client-side search fallback) ─────────────────────

  const displayedFiles = files.filter((f) => {
    if (statusFilter !== 'ALL' && f.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        f.tenant.firstName.toLowerCase().includes(q) ||
        f.tenant.lastName.toLowerCase().includes(q) ||
        f.tenant.email.toLowerCase().includes(q) ||
        f.tenant.phone.includes(q)
      )
    }
    return true
  })

  // ─── Loading skeleton ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dossiers à valider</h1>
        <p className="text-muted-foreground mt-1">File d&apos;attente des dossiers locatifs</p>
      </div>

      {/* Toolbar: Search + Status Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 min-w-0 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un locataire..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={statusFilter === 'ALL' ? 'default' : 'outline'}
              className={
                statusFilter === 'ALL'
                  ? 'bg-brand-500 hover:bg-brand-600 text-white'
                  : ''
              }
              onClick={() => setStatusFilter('ALL')}
            >
              Tous
            </Button>
            {filterableStatuses.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                className={
                  statusFilter === s
                    ? 'bg-brand-500 hover:bg-brand-600 text-white'
                    : ''
                }
                onClick={() => setStatusFilter(s)}
              >
                {statusLabels[s]}
              </Button>
            ))}
          </div>
        </div>

        {/* View mode toggle */}
        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Empty state */}
      {displayedFiles.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun dossier en attente</p>
          </CardContent>
        </Card>
      ) : viewMode === 'card' ? (
        /* ─── Card View ──────────────────────────────────────────────── */
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {displayedFiles.map((rf) => (
              <motion.div
                key={rf.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    {/* Tenant info row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-10 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                          <User className="size-5 text-brand-500" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {rf.tenant.firstName} {rf.tenant.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">{rf.tenant.email}</p>
                        </div>
                      </div>
                      <Badge className={statusColors[rf.status]}>{statusLabels[rf.status]}</Badge>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                      {rf.monthlyIncome != null && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-foreground">
                            {rf.monthlyIncome.toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>
                      )}
                      {rf.employer && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="size-3.5 shrink-0" />
                          <span className="truncate">{rf.employer}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <FileCheck className="size-3.5 shrink-0" />
                        <span>{rf.documents.length} document{rf.documents.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 shrink-0" />
                        <span>{new Date(rf.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>

                    {/* Expandable Documents section */}
                    <Collapsible
                      open={expandedIds.has(rf.id)}
                      onOpenChange={() => toggleExpand(rf.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between mb-1 text-muted-foreground hover:text-foreground"
                        >
                          <span className="text-sm font-medium">Documents</span>
                          {expandedIds.has(rf.id) ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-2 mb-3">
                          {rf.documents.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2 text-center">Aucun document</p>
                          ) : (
                            rf.documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                              >
                                <button
                                  type="button"
                                  className="flex items-center gap-2 min-w-0 flex-1 text-left hover:underline"
                                  onClick={() => openDocPreview(doc)}
                                >
                                  <FileText className="size-4 text-brand-500 shrink-0" />
                                  <span className="text-sm text-foreground truncate">{doc.name}</span>
                                  <Eye className="size-3.5 text-muted-foreground shrink-0" />
                                </button>
                                <Badge className={docStatusColors[doc.status]}>
                                  {docStatusLabels[doc.status]}
                                </Badge>
                              </div>
                            ))
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Action buttons */}
                    {(rf.status === 'SUBMITTED' || rf.status === 'TC_REVIEW') && (
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white gap-1 flex-1"
                          disabled={actionLoading === rf.id}
                          onClick={() => handleValidate(rf.id)}
                        >
                          <Check className="size-4" /> Valider
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-200 hover:bg-orange-50 gap-1 flex-1"
                          disabled={actionLoading === rf.id}
                          onClick={() => {
                            setDialogComment('')
                            setRequestInfoDialog({ open: true, file: rf })
                          }}
                        >
                          <MessageSquare className="size-4" /> Info
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 gap-1 flex-1"
                          disabled={actionLoading === rf.id}
                          onClick={() => {
                            setDialogComment('')
                            setRejectDialog({ open: true, file: rf })
                          }}
                        >
                          <X className="size-4" /> Rejeter
                        </Button>
                      </div>
                    )}

                    {/* Rejection reason display */}
                    {rf.rejectionReason && (
                      <div className="mt-3 p-2 rounded-lg bg-red-50 text-sm text-red-700">
                        <span className="font-medium">Motif de rejet :</span> {rf.rejectionReason}
                      </div>
                    )}

                    {/* TC comment display */}
                    {rf.tcComment && (
                      <div className="mt-2 p-2 rounded-lg bg-brand-500/5 text-sm text-foreground">
                        <span className="font-medium">Commentaire TC :</span> {rf.tcComment}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* ─── List View ──────────────────────────────────────────────── */
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left font-medium text-muted-foreground p-3">Locataire</th>
                  <th className="text-left font-medium text-muted-foreground p-3 hidden md:table-cell">Revenus</th>
                  <th className="text-left font-medium text-muted-foreground p-3 hidden lg:table-cell">Employeur</th>
                  <th className="text-center font-medium text-muted-foreground p-3">Docs</th>
                  <th className="text-center font-medium text-muted-foreground p-3">Statut</th>
                  <th className="text-left font-medium text-muted-foreground p-3 hidden sm:table-cell">Date</th>
                  <th className="text-right font-medium text-muted-foreground p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {displayedFiles.map((rf) => (
                    <motion.tr
                      key={rf.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      {/* Tenant */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                            <User className="size-4 text-brand-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {rf.tenant.firstName} {rf.tenant.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{rf.tenant.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Income */}
                      <td className="p-3 hidden md:table-cell">
                        {rf.monthlyIncome != null
                          ? `${rf.monthlyIncome.toLocaleString('fr-FR')} FCFA`
                          : '—'}
                      </td>

                      {/* Employer */}
                      <td className="p-3 hidden lg:table-cell">
                        <span className="truncate block max-w-[140px]">{rf.employer || '—'}</span>
                      </td>

                      {/* Documents */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <FileText className="size-3.5 text-muted-foreground" />
                          <span>{rf.documents.length}</span>
                        </div>
                        {/* Document list popover-like: show docs inline as clickable badges */}
                        {rf.documents.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 justify-center">
                            {rf.documents.map((doc) => (
                              <button
                                key={doc.id}
                                type="button"
                                className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border border-border hover:bg-muted transition-colors cursor-pointer"
                                onClick={() => openDocPreview(doc)}
                                title={doc.name}
                              >
                                <Eye className="size-3 text-brand-500" />
                                <span className="max-w-[60px] truncate">{doc.name}</span>
                                <Badge
                                  className={`${docStatusColors[doc.status]} text-[10px] px-1 py-0 leading-none`}
                                >
                                  {docStatusLabels[doc.status]}
                                </Badge>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <Badge className={statusColors[rf.status]}>{statusLabels[rf.status]}</Badge>
                      </td>

                      {/* Date */}
                      <td className="p-3 hidden sm:table-cell text-muted-foreground">
                        {new Date(rf.createdAt).toLocaleDateString('fr-FR')}
                      </td>

                      {/* Actions */}
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          {(rf.status === 'SUBMITTED' || rf.status === 'TC_REVIEW') && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 p-0"
                                disabled={actionLoading === rf.id}
                                onClick={() => handleValidate(rf.id)}
                                title="Valider"
                              >
                                <Check className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-8 w-8 p-0"
                                disabled={actionLoading === rf.id}
                                onClick={() => {
                                  setDialogComment('')
                                  setRequestInfoDialog({ open: true, file: rf })
                                }}
                                title="Demander des informations"
                              >
                                <MessageSquare className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                disabled={actionLoading === rf.id}
                                onClick={() => {
                                  setDialogComment('')
                                  setRejectDialog({ open: true, file: rf })
                                }}
                                title="Rejeter"
                              >
                                <X className="size-4" />
                              </Button>
                            </>
                          )}
                          {rf.rejectionReason && (
                            <span className="text-xs text-red-600 max-w-[120px] truncate" title={rf.rejectionReason}>
                              {rf.rejectionReason}
                            </span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── Reject Dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialog({ open: false, file: null })
            setDialogComment('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter le dossier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {rejectDialog.file && (
              <p className="text-sm text-muted-foreground">
                Vous allez rejeter le dossier de{' '}
                <span className="font-semibold text-foreground">
                  {rejectDialog.file.tenant.firstName} {rejectDialog.file.tenant.lastName}
                </span>
                . Veuillez indiquer le motif du rejet.
              </p>
            )}
            <Textarea
              placeholder="Motif du rejet..."
              value={dialogComment}
              onChange={(e) => setDialogComment(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog({ open: false, file: null })
                setDialogComment('')
              }}
            >
              Annuler
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!dialogComment.trim()}
              onClick={handleRejectConfirm}
            >
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Request Info Dialog ────────────────────────────────────────── */}
      <Dialog
        open={requestInfoDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setRequestInfoDialog({ open: false, file: null })
            setDialogComment('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demander des informations</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {requestInfoDialog.file && (
              <p className="text-sm text-muted-foreground">
                Vous allez demander des informations complémentaires pour le dossier de{' '}
                <span className="font-semibold text-foreground">
                  {requestInfoDialog.file.tenant.firstName} {requestInfoDialog.file.tenant.lastName}
                </span>
                . Précisez ce qui est attendu.
              </p>
            )}
            <Textarea
              placeholder="Informations ou documents attendus..."
              value={dialogComment}
              onChange={(e) => setDialogComment(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRequestInfoDialog({ open: false, file: null })
                setDialogComment('')
              }}
            >
              Annuler
            </Button>
            <Button
              className="bg-brand-500 hover:bg-brand-600 text-white"
              disabled={!dialogComment.trim()}
              onClick={handleRequestInfoConfirm}
            >
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Document Preview Dialog ────────────────────────────────────── */}
      <DocumentPreviewDialog
        open={previewDoc.open}
        onOpenChange={(open) => setPreviewDoc((prev) => ({ ...prev, open }))}
        document={{ url: previewDoc.url, name: previewDoc.name, type: previewDoc.type }}
      />
    </motion.div>
  )
}
