import type { Database } from '@/lib/supabase/types'

/**
 * FUN-002 — Types de dossier locatif multiples.
 *
 * Source de vérité : enum PostgreSQL `rental_file_type`
 * (migration 20261027000020_rental_file_type.sql).
 * Libellés UI français partagés par : le sélecteur du header, le formulaire
 * de dossier, la liste des dossiers et le badge de la file de validation TC.
 */
export type RentalFileType = Database['public']['Enums']['rental_file_type']

export const RENTAL_FILE_TYPES = ['STANDARD', 'FAMILLE', 'COLOCATION'] as const

/** Libellés français affichés (spec FUN-002 §5.3 : Personnel / Familial / Colocation). */
export const RENTAL_FILE_TYPE_LABELS: Record<RentalFileType, string> = {
  STANDARD: 'Personnel',
  FAMILLE: 'Familial',
  COLOCATION: 'Colocation',
}

/** Courte explication affichée sous chaque type dans le formulaire. */
export const RENTAL_FILE_TYPE_DESCRIPTIONS: Record<RentalFileType, string> = {
  STANDARD: 'Dossier personnel pour une location classique',
  FAMILLE: 'Configuration familiale (conjoint, enfants à charge)',
  COLOCATION: 'Dossier dédié à une colocation',
}

/** Valeur par défaut (dossiers créés avant la migration FUN-002 = STANDARD). */
export const DEFAULT_RENTAL_FILE_TYPE: RentalFileType = 'STANDARD'

/**
 * Normalise une valeur de `file_type` venant de la base ou d'un payload :
 * toute valeur absente/inconnue retombe sur STANDARD (compatibilité avec les
 * lignes créées avant la migration).
 */
export function normalizeRentalFileType(value: unknown): RentalFileType {
  if (typeof value === 'string' && (RENTAL_FILE_TYPES as readonly string[]).includes(value)) {
    return value as RentalFileType
  }
  return DEFAULT_RENTAL_FILE_TYPE
}

/** Label français d'un type de dossier (tolérant aux valeurs brutes). */
export function rentalFileTypeLabel(value: unknown): string {
  return RENTAL_FILE_TYPE_LABELS[normalizeRentalFileType(value)]
}

/** Valide le champ `fileType` d'un payload API. Renvoie null si invalide. */
export function parseRentalFileType(value: unknown): RentalFileType | null {
  if (value === undefined || value === null || value === '') return DEFAULT_RENTAL_FILE_TYPE
  if (typeof value === 'string' && (RENTAL_FILE_TYPES as readonly string[]).includes(value)) {
    return value as RentalFileType
  }
  return null
}
