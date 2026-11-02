'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { normalizeRentalFileType, type RentalFileType } from '@/lib/rental-file-types'

/**
 * FUN-002 — Store dédié au « dossier actif » du LOCATAIRE.
 *
 * ⚠️ Store VOLONTAIREMENT séparé de `auth-store.ts` (spec FUN-002 §5.2) :
 * son persist global est couplé à l'authentification et ne doit pas être
 * migré pour une simple préférence d'UI.
 *
 * Le dossier actif est une préférence CLIENT (jamais persistée serveur) :
 * il pré-sélectionne le formulaire de dossier, la carte d'aperçu et la
 * candidature (`rentalFileId` explicite dans le POST /api/applications).
 * Le choix est conservé PAR UTILISATEUR (map userId → dossier) pour survivre
 * au changement de rôle / de compte sur un même navigateur.
 */
export interface ActiveDossierRef {
  id: string
  fileType: RentalFileType
  /** Statut du dossier au moment du choix (informatif — le serveur revalide toujours). */
  status: string
  /** Date (ISO) à laquelle le choix a été fait. */
  chosenAt: string
}

interface ActiveDossierState {
  /** Map userId → dossier actif (persistée en localStorage). */
  activeByUser: Record<string, ActiveDossierRef | undefined>
  setActiveDossier: (userId: string, ref: Omit<ActiveDossierRef, 'chosenAt'>) => void
  clearActiveDossier: (userId: string) => void
}

export const useActiveDossierStore = create<ActiveDossierState>()(
  persist(
    (set) => ({
      activeByUser: {},
      setActiveDossier: (userId, ref) =>
        set((state) => ({
          activeByUser: {
            ...state.activeByUser,
            [userId]: { ...ref, fileType: normalizeRentalFileType(ref.fileType), chosenAt: new Date().toISOString() },
          },
        })),
      clearActiveDossier: (userId) =>
        set((state) => {
          const next = { ...state.activeByUser }
          delete next[userId]
          return { activeByUser: next }
        }),
    }),
    {
      name: 'montoit-active-dossier',
      version: 1,
    },
  ),
)

/** Hook utilitaire : dossier actif d'un utilisateur (ou undefined). */
export function useActiveDossier(userId: string | null | undefined): ActiveDossierRef | undefined {
  return useActiveDossierStore((state) => (userId ? state.activeByUser[userId] : undefined))
}
