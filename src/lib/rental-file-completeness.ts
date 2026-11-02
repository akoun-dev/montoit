import type { SupabaseClient } from '@supabase/supabase-js'

export const REQUIRED_RENTAL_FILE_DOCUMENT_TYPES = ['ID_CARD'] as const

export type RentalFileCompleteness = {
  complete: boolean
  missingTypes: string[]
  documentCount: number
}

/**
 * The rental file status and its required documents must be evaluated together.
 * A stale VALIDATED row without its required document must never unlock an application.
 */
export async function getRentalFileCompleteness(
  admin: SupabaseClient,
  rentalFileId: string,
): Promise<RentalFileCompleteness> {
  const { data: documents, error } = await admin
    .from('rental_file_documents')
    .select('type')
    .eq('rental_file_id', rentalFileId)

  if (error) throw error

  const uploadedTypes = new Set((documents ?? []).map((document) => document.type))
  const missingTypes = REQUIRED_RENTAL_FILE_DOCUMENT_TYPES.filter((type) => !uploadedTypes.has(type))

  return {
    complete: missingTypes.length === 0,
    missingTypes: [...missingTypes],
    documentCount: documents?.length ?? 0,
  }
}

export async function findCurrentCompleteValidatedRentalFile(
  admin: SupabaseClient,
  tenantId: string,
  // FUN-002 (dossiers multiples) : préférence de type pour le fallback de
  // candidature. `STANDARD` (défaut historique) est examiné en premier, puis
  // les autres types du plus récent au plus ancien — documenté dans la spec
  // FUN-002 §4.2. Sans option, comportement inchangé (plus récent d'abord).
  opts?: { preferFileType?: string },
) {
  const { data: files, error } = await admin
    .from('rental_files')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('status', ['VALIDATED', 'ACCEPTED'])
    .order('updated_at', { ascending: false })

  if (error) throw error

  let candidates = files ?? []
  const preferredType = opts?.preferFileType
  if (preferredType) {
    // Tri stable : les dossiers du type préféré d'abord (l'ordre updated_at
    // DESC est conservé à l'intérieur de chaque groupe).
    candidates = [
      ...candidates.filter((file: any) => (file.file_type ?? 'STANDARD') === preferredType),
      ...candidates.filter((file: any) => (file.file_type ?? 'STANDARD') !== preferredType),
    ]
  }

  for (const file of candidates) {
    const completeness = await getRentalFileCompleteness(admin, file.id)
    if (completeness.complete && (!file.valid_until || new Date(file.valid_until).getTime() > Date.now())) {
      return { file, completeness }
    }
  }

  return { file: null, completeness: { complete: false, missingTypes: [...REQUIRED_RENTAL_FILE_DOCUMENT_TYPES], documentCount: 0 } }
}
