'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronDown, FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useActiveDossierStore } from '@/lib/active-dossier-store'
import { normalizeRentalFileType, rentalFileTypeLabel } from '@/lib/rental-file-types'
import { cn } from '@/lib/utils'

/**
 * FUN-002 — Sélecteur du « dossier actif » dans l'entête du dashboard LOCATAIRE.
 *
 * - Visible UNIQUEMENT pour un LOCATAIRE possédant au moins 2 dossiers
 *   (zéro bruit pour le cas mono-dossier — spec FUN-002 §5.1).
 * - Le choix est persisté par utilisateur via le store Zustand dédié
 *   (`active-dossier-store`, pas le auth-store).
 * - Invalidation : si le dossier mémorisé n'existe plus (supprimé/expiré),
 *   fallback sur le dossier STANDARD le plus récent (SC-9).
 * - Erreur de chargement : le sélecteur disparaît silencieusement (l'entête
 *   ne doit jamais casser le dashboard) ; les états vides/erreurs complets
 *   restent dans l'écran « Mes dossiers » (EmptyState/ErrorState mutualisés).
 */

interface DossierOption {
  id: string
  status: string
  fileType?: string
  updatedAt: string
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  TC_REVIEW: 'En revue',
  VALIDATED: 'Validé',
  ACCEPTED: 'Accepté',
  REJECTED: 'Rejeté',
  EXPIRED: 'Expiré',
}

export function ActiveDossierSelect() {
  const { user } = useAuthStore()
  const { setDashboardSection } = useAuthStore()
  const activeRef = useActiveDossierStore((s) => (user ? s.activeByUser[user.id] : undefined))
  const setActiveDossier = useActiveDossierStore((s) => s.setActiveDossier)

  const [files, setFiles] = useState<DossierOption[] | null>(null)

  const effectiveRole = user ? (user.activeRole || user.role) : null
  const visible = effectiveRole === 'LOCATAIRE' && (files?.length ?? 0) >= 2
  const userId = user?.id ?? null

  const fetchFiles = useCallback(async () => {
    // Sélecteur réservé au mode LOCATAIRE (aucun appel API pour les autres rôles)
    if (!userId || effectiveRole !== 'LOCATAIRE') return
    try {
      const result = await authFetch<{ data: DossierOption[] }>('/api/rental-file')
      setFiles(result.data ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      // Le sélecteur est un confort : en cas d'erreur on le masque, sans bruit
      console.error('Chargement des dossiers (sélecteur) échoué:', err)
      setFiles([])
    }
  }, [userId, effectiveRole])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFiles()
  }, [fetchFiles])

  // Invalidation du choix persisté (dossier supprimé) → fallback STANDARD récent
  useEffect(() => {
    if (!files || !user?.id) return
    if (activeRef && files.some((f) => f.id === activeRef.id)) return
    const sorted = [...files].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    const fallback =
      sorted.find((f) => normalizeRentalFileType(f.fileType) === 'STANDARD') ?? sorted[0]
    if (fallback) {
      setActiveDossier(user.id, {
        id: fallback.id,
        fileType: normalizeRentalFileType(fallback.fileType),
        status: fallback.status,
      })
    }
  }, [files, user?.id, activeRef, setActiveDossier])

  if (!visible || !user) return null

  const sortedFiles = [...(files ?? [])].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
  const activeId = activeRef && files?.some((f) => f.id === activeRef.id) ? activeRef.id : null
  const activeFile = sortedFiles.find((f) => f.id === activeId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 text-xs max-w-[220px]"
          aria-label="Choisir le dossier actif"
        >
          <FileText className="size-3.5 text-brand-500 shrink-0" />
          <span className="truncate">
            Dossier : {activeFile ? rentalFileTypeLabel(activeFile.fileType) : '—'}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Vos dossiers locatifs
        </DropdownMenuLabel>
        {sortedFiles.map((file) => {
          const isActive = file.id === activeId
          return (
            <DropdownMenuItem
              key={file.id}
              onClick={() =>
                setActiveDossier(user.id, {
                  id: file.id,
                  fileType: normalizeRentalFileType(file.fileType),
                  status: file.status,
                })
              }
              className="cursor-pointer items-center gap-2"
              aria-label={`Dossier ${rentalFileTypeLabel(file.fileType)}${file.status ? `, ${statusLabels[file.status] ?? file.status}` : ''}`}
            >
              <Check
                className={cn('size-3.5 shrink-0', isActive ? 'text-brand-500 opacity-100' : 'opacity-0')}
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-foreground">
                {rentalFileTypeLabel(file.fileType)}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {statusLabels[file.status] ?? file.status}
              </span>
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setDashboardSection('rental-files-list')}
          className="cursor-pointer text-brand-600 focus:text-brand-700"
        >
          <Plus className="size-4 mr-2" />
          Créer un dossier
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
