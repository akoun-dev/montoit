'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BadgeCheck,
  FileText,
  Check,
  X,
  MessageSquare,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  User,
  Mail,
  Phone,
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
  DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useAuthStore } from '@/lib/auth-store'
import { ViewModeToggle, type ViewMode } from './view-mode-toggle'
import { DocumentPreviewDialog } from './document-preview-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OwnershipDoc {
  id: string
  type: 'TITRE_FONCIER' | 'ACTE_NOTARIE' | 'ATTESTATION_PROPRIETE' | 'RCCM' | 'AGREMENT'
  url: string
  name: string
  status: 'PENDING' | 'VALIDATED' | 'REJECTED'
  tcComment: string | null
  createdAt: string
  owner: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email: string
    avatarUrl: string | null
  }
  reviewedBy: {
    id: string
    firstName: string
    lastName: string
  } | null
}

type DocType = OwnershipDoc['type']
type ActionDialogType = 'REJECT' | 'REQUEST_INFO' | null

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<DocType, string> = {
  TITRE_FONCIER: 'Titre foncier',
  ACTE_NOTARIE: 'Acte notarié',
  ATTESTATION_PROPRIETE: 'Attestation de propriété',
  RCCM: 'RCCM',
  AGREMENT: 'Agrément',
}

const TYPE_COLORS: Record<DocType, string> = {
  TITRE_FONCIER: 'bg-brand-500/10 text-brand-500 border-brand-500/20',
  ACTE_NOTARIE: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  ATTESTATION_PROPRIETE: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  RCCM: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
  AGREMENT: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
}

const STATUS_CONFIG: Record<
  OwnershipDoc['status'],
  { label: string; className: string }
> = {
  PENDING: {
    label: 'En attente',
    className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  },
  VALIDATED: {
    label: 'Validé',
    className: 'bg-green-500/10 text-green-700 border-green-500/20',
  },
  REJECTED: {
    label: 'Rejeté',
    className: 'bg-red-500/10 text-red-700 border-red-500/20',
  },
}

const ALL_DOC_TYPES: DocType[] = [
  'TITRE_FONCIER',
  'ACTE_NOTARIE',
  'ATTESTATION_PROPRIETE',
  'RCCM',
  'AGREMENT',
]

const PAGE_SIZE = 10

// ─── Component ────────────────────────────────────────────────────────────────

export function OwnerValidations() {
  const { isAuthenticated } = useAuthStore()

  // Data state
  const [docs, setDocs] = useState<OwnershipDoc[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // View & filter state
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [filterType, setFilterType] = useState<DocType | 'ALL'>('ALL')

  // Dialog state
  const [actionDialog, setActionDialog] = useState<ActionDialogType>(null)
  const [selectedDoc, setSelectedDoc] = useState<OwnershipDoc | null>(null)
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState('')

  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<{
    url: string
    name: string
    type: string
  } | null>(null)

  // ─── Fetch data ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(PAGE_SIZE))
      if (filterType !== 'ALL') {
        params.set('type', filterType)
      }

      const data = await authFetch<{
        docs: OwnershipDoc[]
        pagination: { total: number; page: number; limit: number; totalPages: number }
      }>(`/api/tc/ownership-docs?${params.toString()}`)

      setDocs(data.docs)
      setTotal(data.pagination.total)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setDocs([])
        return
      }
      setDocs([])
      toast.error('Erreur lors du chargement des documents')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, page, filterType])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [filterType])

  // ─── Action handlers ──────────────────────────────────────────────────────

  const handleApprove = async (doc: OwnershipDoc) => {
    setActionLoading(doc.id)
    try {
      await authFetch('/api/tc/ownership-docs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docIds: [doc.id],
          action: 'APPROVE',
          comment: '',
        }),
      })
      toast.success(`Document de ${doc.owner.firstName} ${doc.owner.lastName} validé`)
      await fetchData()
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message)
      } else {
        toast.error('Erreur lors de la validation')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const openActionDialog = (doc: OwnershipDoc, type: ActionDialogType) => {
    setSelectedDoc(doc)
    setActionDialog(type)
    setComment('')
    setCommentError('')
  }

  const submitAction = async () => {
    if (!selectedDoc || !actionDialog) return

    if (!comment.trim()) {
      setCommentError(
        actionDialog === 'REJECT'
          ? 'Veuillez indiquer la raison du rejet'
          : 'Veuillez indiquer les informations demandées'
      )
      return
    }

    setActionLoading(selectedDoc.id)
    try {
      const action = actionDialog === 'REJECT' ? 'REJECT' : 'REQUEST_INFO'
      await authFetch('/api/tc/ownership-docs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docIds: [selectedDoc.id],
          action,
          comment: comment.trim(),
        }),
      })
      toast.success(
        action === 'REJECT'
          ? `Document de ${selectedDoc.owner.firstName} ${selectedDoc.owner.lastName} rejeté`
          : `Demande d'informations envoyée à ${selectedDoc.owner.firstName} ${selectedDoc.owner.lastName}`
      )
      setActionDialog(null)
      setSelectedDoc(null)
      setComment('')
      await fetchData()
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message)
      } else {
        toast.error("Erreur lors de l'action")
      }
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Preview handler ──────────────────────────────────────────────────────

  const openPreview = (doc: OwnershipDoc) => {
    setPreviewDoc({ url: doc.url, name: doc.name, type: doc.type })
    setPreviewOpen(true)
  }

  // ─── Pagination helpers ───────────────────────────────────────────────────

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Validations propriétaires
          </h1>
          <p className="text-muted-foreground mt-1">
            Vérifiez les documents de propriété
          </p>
        </div>
        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* ─── Filter bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mr-1 shrink-0">
          <Filter className="size-4" />
          <span className="hidden sm:inline">Filtrer :</span>
        </div>
        <button
          onClick={() => setFilterType('ALL')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
            filterType === 'ALL'
              ? 'bg-brand-500 text-white border-brand-500'
              : 'bg-background text-muted-foreground border-border hover:bg-muted'
          }`}
        >
          Tous
        </button>
        {ALL_DOC_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              filterType === type
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* ─── Empty state ──────────────────────────────────────────────────── */}
      {docs.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <BadgeCheck className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Aucun document en attente de validation
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ─── Card view ────────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {viewMode === 'card' ? (
              <motion.div
                key="card-view"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {docs.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-border hover:shadow-md transition-shadow h-full">
                      <CardContent className="p-5 flex flex-col h-full">
                        {/* Owner info */}
                        <div className="flex items-start gap-3 mb-4">
                          <Avatar className="size-10 shrink-0">
                            {doc.owner.avatarUrl && (
                              <AvatarImage
                                src={doc.owner.avatarUrl}
                                alt={`${doc.owner.firstName} ${doc.owner.lastName}`}
                              />
                            )}
                            <AvatarFallback className="bg-brand-500/10 text-brand-500 text-sm font-semibold">
                              {doc.owner.firstName[0]}
                              {doc.owner.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-foreground truncate">
                              {doc.owner.firstName} {doc.owner.lastName}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Phone className="size-3" />
                              <span className="truncate">{doc.owner.phone}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Mail className="size-3" />
                              <span className="truncate">{doc.owner.email}</span>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-xs ${TYPE_COLORS[doc.type]}`}
                          >
                            {TYPE_LABELS[doc.type]}
                          </Badge>
                        </div>

                        {/* Document info */}
                        <button
                          onClick={() => openPreview(doc)}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/60 hover:bg-muted transition-colors mb-4 text-left w-full group"
                        >
                          <div className="size-10 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0 group-hover:bg-brand-500/20 transition-colors">
                            <FileText className="size-5 text-brand-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate group-hover:text-brand-500 transition-colors">
                              {doc.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Soumis le{' '}
                              {new Date(doc.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <Eye className="size-4 text-muted-foreground group-hover:text-brand-500 transition-colors shrink-0" />
                        </button>

                        {/* Status */}
                        <div className="flex items-center gap-2 mb-4">
                          <Badge
                            variant="outline"
                            className={`text-xs ${STATUS_CONFIG[doc.status].className}`}
                          >
                            {STATUS_CONFIG[doc.status].label}
                          </Badge>
                          {doc.reviewedBy && (
                            <span className="text-xs text-muted-foreground">
                              Traité par {doc.reviewedBy.firstName}{' '}
                              {doc.reviewedBy.lastName}
                            </span>
                          )}
                        </div>

                        {/* TC Comment */}
                        {doc.tcComment && (
                          <div className="p-2.5 rounded-lg bg-muted/50 border border-border mb-4">
                            <p className="text-xs text-muted-foreground font-medium mb-1">
                              Commentaire TC
                            </p>
                            <p className="text-sm text-foreground">
                              {doc.tcComment}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        {doc.status === 'PENDING' && (
                          <div className="flex gap-2 mt-auto pt-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white gap-1.5 flex-1"
                              onClick={() => handleApprove(doc)}
                              disabled={actionLoading === doc.id}
                            >
                              <Check className="size-4" />
                              Valider
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
                              onClick={() => openActionDialog(doc, 'REJECT')}
                              disabled={actionLoading === doc.id}
                            >
                              <X className="size-4" />
                              Rejeter
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-600 border-amber-200 hover:bg-amber-50 gap-1.5"
                              onClick={() => openActionDialog(doc, 'REQUEST_INFO')}
                              disabled={actionLoading === doc.id}
                            >
                              <MessageSquare className="size-4" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              /* ─── List (table) view ──────────────────────────────────────── */
              <motion.div
                key="list-view"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Propriétaire</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {docs.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="size-7">
                                {doc.owner.avatarUrl && (
                                  <AvatarImage
                                    src={doc.owner.avatarUrl}
                                    alt={`${doc.owner.firstName} ${doc.owner.lastName}`}
                                  />
                                )}
                                <AvatarFallback className="bg-brand-500/10 text-brand-500 text-xs font-semibold">
                                  {doc.owner.firstName[0]}
                                  {doc.owner.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">
                                {doc.owner.firstName} {doc.owner.lastName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <div className="flex items-center gap-1">
                                <Phone className="size-3" />
                                {doc.owner.phone}
                              </div>
                              <div className="flex items-center gap-1">
                                <Mail className="size-3" />
                                {doc.owner.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => openPreview(doc)}
                              className="flex items-center gap-1.5 text-sm text-foreground hover:text-brand-500 transition-colors group"
                            >
                              <FileText className="size-4 text-muted-foreground group-hover:text-brand-500 transition-colors" />
                              <span className="underline decoration-transparent group-hover:decoration-brand-500 underline-offset-2 truncate max-w-[150px]">
                                {doc.name}
                              </span>
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${TYPE_COLORS[doc.type]}`}
                            >
                              {TYPE_LABELS[doc.type]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${STATUS_CONFIG[doc.status].className}`}
                            >
                              {STATUS_CONFIG[doc.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {doc.status === 'PENDING' ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600 hover:bg-green-50 hover:text-green-700 h-8 w-8 p-0"
                                  onClick={() => handleApprove(doc)}
                                  disabled={actionLoading === doc.id}
                                  title="Valider"
                                >
                                  <Check className="size-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 w-8 p-0"
                                  onClick={() => openActionDialog(doc, 'REJECT')}
                                  disabled={actionLoading === doc.id}
                                  title="Rejeter"
                                >
                                  <X className="size-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-amber-600 hover:bg-amber-50 hover:text-amber-700 h-8 w-8 p-0"
                                  onClick={() =>
                                    openActionDialog(doc, 'REQUEST_INFO')
                                  }
                                  disabled={actionLoading === doc.id}
                                  title="Demander des informations"
                                >
                                  <MessageSquare className="size-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {doc.reviewedBy
                                  ? `${doc.reviewedBy.firstName} ${doc.reviewedBy.lastName}`
                                  : '—'}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Pagination ────────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {total} document{total > 1 ? 's' : ''} · Page {page} sur{' '}
                {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="gap-1"
                >
                  <ChevronLeft className="size-4" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="gap-1"
                >
                  Suivant
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Reject / Request Info Dialog ──────────────────────────────────── */}
      <Dialog
        open={actionDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null)
            setSelectedDoc(null)
            setComment('')
            setCommentError('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog === 'REJECT' ? (
                <>
                  <div className="size-8 rounded-full bg-red-500/10 flex items-center justify-center">
                    <X className="size-4 text-red-600" />
                  </div>
                  Rejeter le document
                </>
              ) : (
                <>
                  <div className="size-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <MessageSquare className="size-4 text-amber-600" />
                  </div>
                  Demander des informations
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedDoc && (
                <span>
                  Document de{' '}
                  <strong>
                    {selectedDoc.owner.firstName} {selectedDoc.owner.lastName}
                  </strong>{' '}
                  — {TYPE_LABELS[selectedDoc.type]}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate">{selectedDoc?.name}</span>
            </div>

            <div>
              <label
                htmlFor="action-comment"
                className="text-sm font-medium text-foreground mb-1.5 block"
              >
                {actionDialog === 'REJECT'
                  ? 'Raison du rejet'
                  : 'Informations demandées'}
              </label>
              <Textarea
                id="action-comment"
                placeholder={
                  actionDialog === 'REJECT'
                    ? 'Expliquez pourquoi ce document est rejeté...'
                    : 'Précisez les informations ou documents complémentaires nécessaires...'
                }
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value)
                  if (commentError) setCommentError('')
                }}
                className={commentError ? 'border-red-400 focus-visible:border-red-400' : ''}
                rows={4}
              />
              {commentError && (
                <div className="flex items-center gap-1.5 mt-1.5 text-red-600 text-xs">
                  <AlertCircle className="size-3.5" />
                  {commentError}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog(null)
                setSelectedDoc(null)
                setComment('')
                setCommentError('')
              }}
              disabled={actionLoading === selectedDoc?.id}
            >
              Annuler
            </Button>
            <Button
              className={
                actionDialog === 'REJECT'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }
              onClick={submitAction}
              disabled={actionLoading === selectedDoc?.id}
            >
              {actionLoading === selectedDoc?.id ? (
                <span className="flex items-center gap-2">
                  <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Traitement...
                </span>
              ) : actionDialog === 'REJECT' ? (
                'Confirmer le rejet'
              ) : (
                'Envoyer la demande'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Document Preview Dialog ───────────────────────────────────────── */}
      <DocumentPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDoc}
      />
    </motion.div>
  )
}
