'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileText, Plus, CheckCircle2, AlertCircle, Clock, ArrowRight, Loader2, Send } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/states'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useActiveDossierStore } from '@/lib/active-dossier-store'
import {
  normalizeRentalFileType,
  RENTAL_FILE_TYPES,
  RENTAL_FILE_TYPE_DESCRIPTIONS,
  rentalFileTypeLabel,
} from '@/lib/rental-file-types'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { RentalFileTypeBadge } from './rental-file-type-badge'

import type { RentalFileItem } from './rental-file'

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-muted text-muted-foreground border-border' },
  SUBMITTED: { label: 'Soumis', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  TC_REVIEW: { label: 'En examen TC', color: 'bg-brand-50 text-brand-600 border-brand-200' },
  VALIDATED: { label: 'Validé', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Rejeté', color: 'bg-red-50 text-red-700 border-red-200' },
  EXPIRED: { label: 'Expiré', color: 'bg-neutral-100 text-neutral-600 border-neutral-200' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface RentalFilesResponse {
  data: RentalFileItem[]
  stats: Record<string, number>
}

export function RentalFilesList() {
  const { user, isAuthenticated, setDashboardSection } = useAuthStore()
  const [files, setFiles] = useState<RentalFileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)

  const fetchFiles = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      // Fetch ALL files including non-DRAFT ones (no status filter)
      const result = await authFetch<RentalFilesResponse>('/api/rental-file')
      setFiles(result.data ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  const openCreateDialog = () => setShowCreateDialog(true)

  /**
   * FUN-002 : création d'un dossier d'un type précis.
   * Le serveur renvoie 409 « Vous avez déjà un dossier en brouillon pour ce
   * type » si un DRAFT du même type existe (double protection : le bouton du
   * type concerné est aussi désactivé dans la boîte de dialogue).
   */
  const handleCreateNewDraft = async (fileType: string) => {
    setCreating(true)
    try {
      const raw: any = await authFetch('/api/rental-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileType }),
      })
      if (raw?.data?.id) {
        toast.success(`Nouveau dossier ${rentalFileTypeLabel(raw.data.fileType ?? fileType)} créé`)
        setShowCreateDialog(false)
        if (user?.id) {
          useActiveDossierStore.getState().setActiveDossier(user.id, {
            id: raw.data.id,
            fileType: normalizeRentalFileType(raw.data.fileType ?? fileType),
            status: raw.data.status ?? 'DRAFT',
          })
        }
        // Ouvre directement le formulaire sur le dossier créé
        setDashboardSection('rental-file')
        fetchFiles()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  const handleResubmit = async (file: RentalFileItem) => {
    try {
      // FUN-002 : resoumission ciblée (le bon dossier, même en multi-dossiers)
      await authFetch('/api/rental-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rentalFileId: file.id,
          fileType: normalizeRentalFileType(file.fileType),
          submit: true,
        }),
      })
      toast.success('Dossier soumis à nouveau')
      fetchFiles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la soumission')
    }
  }

  const sortedFiles = [...files].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  const statusOrder = ['DRAFT', 'SUBMITTED', 'TC_REVIEW', 'VALIDATED', 'REJECTED', 'EXPIRED']
  const groupedFiles = statusOrder
    .map((status) => ({
      status,
      label: statusConfig[status]?.label || status,
      color: statusConfig[status]?.color || '',
      files: sortedFiles.filter((f) => f.status === status),
    }))
    .filter((g) => g.files.length > 0)

  const docCountByStatus = (file: RentalFileItem) => {
    const total = file.documents?.length || 0
    const validated = file.documents?.filter((d) => d.status === 'VALIDATED').length || 0
    return { total, validated }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-500/10 to-transparent rounded-xl p-4 sm:p-6 -mx-4 sm:-mx-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand-100 shrink-0">
            <FileText className="size-6 text-brand-500" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mes dossiers locatifs</h1>
            <p className="text-muted-foreground mt-0.5">
              Créez et gérez plusieurs dossiers pour postuler à différentes annonces
            </p>
          </div>
          {/* FUN-002 : création toujours accessible — le choix du type est fait
              dans la boîte de dialogue (blocage explicite si DRAFT du même type) */}
          <Button
            className="bg-brand-500 hover:bg-brand-600 text-white gap-2 shrink-0"
            onClick={openCreateDialog}
            disabled={creating}
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            <span className="hidden sm:inline">Nouveau dossier</span>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="secondary" className="bg-brand-50 text-brand-700">
            {files.length} dossier{files.length > 1 ? 's' : ''}
          </Badge>
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
            {files.filter((f) => f.status === 'VALIDATED').length} validé{files.filter((f) => f.status === 'VALIDATED').length > 1 ? 's' : ''}
          </Badge>
          <Badge variant="secondary" className="bg-amber-50 text-amber-700">
            {files.filter((f) => f.status === 'DRAFT').length} brouillon{files.filter((f) => f.status === 'DRAFT').length > 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Files list */}
      {sortedFiles.length === 0 ? (
        <EmptyState
          title="Aucun dossier locatif"
          description="Créez votre premier dossier pour commencer à postuler aux annonces"
          icon={FileText}
          action={{ label: 'Créer un dossier', onClick: openCreateDialog }}
        />
      ) : (
        <div className="space-y-3">
          {groupedFiles.map((group) => (
            <div key={group.status}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-block size-2 rounded-full ${
                  group.status === 'DRAFT' ? 'bg-neutral-400' :
                  group.status === 'REJECTED' ? 'bg-red-400' :
                  group.status === 'VALIDATED' ? 'bg-emerald-400' :
                  group.status === 'EXPIRED' ? 'bg-neutral-400' :
                  'bg-amber-400'
                }`} />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </span>
                <span className="text-[10px] text-muted-foreground">({group.files.length})</span>
              </div>
              {group.files.map((file) => {
                const config = statusConfig[file.status]
                const docs = docCountByStatus(file)
                return (
                  <Card key={file.id} className={`border ${config?.color.split(' ').slice(-1)[0] || 'border-border'} mb-2`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {file.status === 'VALIDATED' ? (
                              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                            ) : file.status === 'REJECTED' ? (
                              <AlertCircle className="size-4 text-red-500 shrink-0" />
                            ) : file.status === 'EXPIRED' ? (
                              <Clock className="size-4 text-neutral-500 shrink-0" />
                            ) : (
                              <FileText className="size-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-sm font-semibold text-foreground">
                              Dossier {rentalFileTypeLabel(file.fileType)} du {formatDate(file.createdAt)}
                            </span>
                            {/* FUN-002 : badge type de dossier (composant partagé locataire,
                                même style que candidatures + overview) */}
                            <RentalFileTypeBadge fileType={file.fileType} />
                            <Badge variant="outline" className={`text-[10px] ${config?.color}`}>
                              {config?.label}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-xs">
                            {file.tenantCategory && (
                              <div>
                                <span className="text-muted-foreground">Catégorie</span>
                                <p className="font-medium text-foreground">{file.tenantCategory}</p>
                              </div>
                            )}
                            {file.monthlyIncome && (
                              <div>
                                <span className="text-muted-foreground">Revenus</span>
                                <p className="font-medium text-foreground">
                                  {file.monthlyIncome.toLocaleString('fr-FR')} FCFA/mois
                                </p>
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">Documents</span>
                              <p className="font-medium text-foreground">
                                {docs.validated}/{docs.total} validé{docs.total > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>

                          {/* Leases linked to this file */}
                          {file.leases && file.leases.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {file.leases.map((lease) => (
                                <Badge key={lease.id} variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700">
                                  Bail : {lease.property?.title || '—'}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Rejection / TC comment */}
                          {file.rejectionReason && (
                            <div className="mt-2 p-2 rounded bg-red-50 border border-red-100">
                              <p className="text-[10px] font-semibold text-red-700">Motif du rejet</p>
                              <p className="text-[10px] text-red-600 mt-0.5">{file.rejectionReason}</p>
                            </div>
                          )}
                          {file.tcComment && !file.rejectionReason && (
                            <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-100">
                              <p className="text-[10px] font-semibold text-amber-700">Commentaire TC</p>
                              <p className="text-[10px] text-amber-600 mt-0.5">{file.tcComment}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 shrink-0">
                          {/* Resubmit button for rejected/expired */}
                          {(file.status === 'REJECTED' || file.status === 'EXPIRED') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs gap-1 border-brand-200 text-brand-600 hover:bg-brand-50"
                              onClick={() => handleResubmit(file)}
                            >
                              <Send className="size-3" />
                              Resoumettre
                            </Button>
                          )}
                          {/* Continue editing draft */}
                          {file.status === 'DRAFT' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs gap-1"
                              onClick={() => {
                                // FUN-002 : ce DRAFT devient le dossier actif avant d'ouvrir le formulaire
                                if (user?.id) {
                                  useActiveDossierStore.getState().setActiveDossier(user.id, {
                                    id: file.id,
                                    fileType: normalizeRentalFileType(file.fileType),
                                    status: file.status,
                                  })
                                }
                                setDashboardSection('rental-file')
                              }}
                            >
                              <ArrowRight className="size-3" />
                              Continuer
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* ─── FUN-002 : boîte de dialogue de création par type ─────────── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-brand-500" />
              Créer un dossier locatif
            </DialogTitle>
            <DialogDescription>
              Choisissez le type de dossier à créer. Un seul brouillon par type est
              autorisé — les autres dossiers ne sont pas affectés.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {RENTAL_FILE_TYPES.map((type) => {
              const draftExists = files.some(
                (f) => f.status === 'DRAFT' && normalizeRentalFileType(f.fileType) === type,
              )
              return (
                <button
                  key={type}
                  type="button"
                  disabled={creating || draftExists}
                  title={draftExists ? 'Vous avez déjà un dossier en brouillon pour ce type' : undefined}
                  onClick={() => handleCreateNewDraft(type)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all active:scale-[0.98] ${
                    draftExists
                      ? 'border-border bg-muted/50 opacity-60 cursor-not-allowed'
                      : 'border-border bg-card hover:border-brand-300 hover:bg-brand-50/50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{rentalFileTypeLabel(type)}</p>
                    {draftExists && (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                        Brouillon existant
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{RENTAL_FILE_TYPE_DESCRIPTIONS[type]}</p>
                </button>
              )
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
