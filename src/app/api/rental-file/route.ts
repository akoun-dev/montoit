import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getRentalFileCompleteness, REQUIRED_RENTAL_FILE_DOCUMENT_TYPES } from '@/lib/rental-file-completeness'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notifyMany } from '@/lib/notify'
import { openValidationSla } from '@/lib/validation-sla'
import { signDocUrls } from '@/lib/supabase/storage'
import {
  DEFAULT_RENTAL_FILE_TYPE,
  parseRentalFileType,
  normalizeRentalFileType,
  RENTAL_FILE_TYPES,
} from '@/lib/rental-file-types'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** Expire les fichiers VALIDATED dont la validité est dépassée */
async function expireOverdueFiles(admin: ReturnType<typeof getSupabaseAdminClient>) {
  try {
    const now = new Date().toISOString()
    const { data: overdue } = await admin
      .from('rental_files')
      .select('id')
      .eq('status', 'VALIDATED')
      .lt('valid_until', now)
    if (!overdue || overdue.length === 0) return
    const ids = overdue.map(r => r.id)
    await admin.from('rental_files').update({ status: 'EXPIRED' } as any).in('id', ids)
    // Never overwrite a candidature the owner already decided on (final).
    await admin.from('applications' as any).update({ status: 'EXPIRED' } as any)
      .in('rental_file_id', ids)
      .not('status', 'in', '("ACCEPTED","REJECTED")')
  } catch (error) {
    // Expiration is maintenance work and must not block a user operation.
    console.error('Rental file expiration error:', error)
  }
}

/** Synchronise le statut des candidatures liées à un dossier locatif */
async function syncApplicationsStatus(admin: ReturnType<typeof getSupabaseAdminClient>, rentalFileId: string, status: string) {
  await admin.from('applications' as any).update({ status } as any).eq('rental_file_id', rentalFileId)
}

/**
 * FUN-002 — Compare le type de dossier d'une ligne rental_files.
 * Les lignes créées avant la migration 20261027000020 n'ont pas de file_type
 * en base mémoire de test : elles sont traitées comme STANDARD (défaut SQL).
 */
function rowMatchesFileType(row: { file_type?: string | null } | null | undefined, fileType: string): boolean {
  return (row?.file_type ?? DEFAULT_RENTAL_FILE_TYPE) === fileType
}

/**
 * FUN-002 — Recherche le dossier réutilisable (REJECTED ou EXPIRED) d'un type
 * donné. On rapatrie les derniers candidats puis on filtre par type côté
 * application : la colonne est NOT NULL DEFAULT 'STANDARD' en base, ce filtre
 * est donc équivalent à un `.eq('file_type', …)` tout en tolérant les lignes
 * historiques sans type.
 */
async function findReusableFileByType(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  status: 'REJECTED' | 'EXPIRED',
  fileType: string,
) {
  const { data: candidates } = await admin
    .from('rental_files')
    .select('*')
    .eq('tenant_id', userId)
    .eq('status', status)
    .order('updated_at', { ascending: false })
    .limit(20)
  return (candidates ?? []).find((row: any) => rowMatchesFileType(row, fileType)) ?? null
}

/**
 * FUN-002 — Liste des DRAFT d'un locataire filtrée par type de dossier.
 * Plusieurs DRAFT peuvent désormais coexister (un par type) : on trie côté
 * application plutôt qu'un `.maybeSingle()` qui échouerait avec 2 lignes.
 */
async function findDraftsByType(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  fileType: string,
): Promise<any[]> {
  const { data: drafts } = await admin
    .from('rental_files')
    .select('*')
    .eq('tenant_id', userId)
    .eq('status', 'DRAFT')
    .order('updated_at', { ascending: false })
  return (drafts ?? []).filter((row: any) => rowMatchesFileType(row, fileType))
}

// GET /api/rental-file — List rental files for current tenant with documents
export async function GET(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req)
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.userId

    const admin = getSupabaseAdminClient()

    const { data: user } = await admin
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const role = user?.active_role || user?.role
    if (role !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Expire les fichiers VALIDATED dépassés avant de retourner
    await expireOverdueFiles(admin)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined

    // FUN-002 : filtre optionnel par type de dossier (?fileType=FAMILLE|COLOCATION|STANDARD)
    const fileTypeParam = searchParams.get('fileType') || undefined
    if (fileTypeParam) {
      const parsedFileType = parseRentalFileType(fileTypeParam)
      if (!parsedFileType) {
        return NextResponse.json(
          { error: `Type de dossier invalide. Valeurs acceptées : ${RENTAL_FILE_TYPES.join(', ')}` },
          { status: 400 },
        )
      }
    }

    let query = admin
      .from('rental_files')
      .select('*')
      .eq('tenant_id', userId)
      .order('updated_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }
    if (fileTypeParam) {
      query = query.eq('file_type', fileTypeParam)
    }

    const { data: rentalFiles, error } = await query

    if (error) {
      console.error('Rental file GET error:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    const enriched = await enrichRentalFiles(admin, rentalFiles ?? [])

    const statusCounts: Record<string, number> = {}
    for (const rf of rentalFiles ?? []) {
      statusCounts[rf.status] = (statusCounts[rf.status] || 0) + 1
    }

    return NextResponse.json({
      data: enriched,
      stats: statusCounts,
    })
  } catch (error) {
    console.error('Rental file GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/rental-file — Create or update a rental file (upsert draft)
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req)
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.userId

    const admin = getSupabaseAdminClient()

    const { data: user } = await admin
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const role = user?.active_role || user?.role
    if (role !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Expire les fichiers VALIDATED dépassés avant toute opération
    await expireOverdueFiles(admin)

    const body = await req.json()
    const {
      tenantCategory,
      monthlyIncome,
      employer,
      employmentType,
      guarantorName,
      guarantorPhone,
      guarantorRelation,
      submit,
      fileType,
      rentalFileId,
    } = body as {
      tenantCategory?: string
      monthlyIncome?: number
      employer?: string
      employmentType?: string
      guarantorName?: string
      guarantorPhone?: string
      guarantorRelation?: string
      submit?: boolean
      fileType?: string
      rentalFileId?: string
    }

    // FUN-002 : type de dossier (STANDARD par défaut, 400 si valeur invalide)
    const resolvedFileType = parseRentalFileType(fileType)
    if (fileType !== undefined && fileType !== null && fileType !== '' && !resolvedFileType) {
      return NextResponse.json(
        { error: `Type de dossier invalide. Valeurs acceptées : ${RENTAL_FILE_TYPES.join(', ')}` },
        { status: 400 },
      )
    }
    const fileTypeValue = resolvedFileType ?? DEFAULT_RENTAL_FILE_TYPE

    // Validate tenant category if provided
    const validTenantCategories = ['SALARIE', 'ENTREPRENEUR', 'ETUDIANT']
    const resolvedTenantCategory =
      tenantCategory && validTenantCategories.includes(tenantCategory)
        ? tenantCategory
        : undefined

    // Validate employment type if provided
    const validEmploymentTypes = ['CDI', 'CDD', 'FREELANCE', 'RETIRED', 'OTHER']
    const resolvedEmploymentType =
      employmentType && validEmploymentTypes.includes(employmentType)
        ? employmentType
        : undefined

    const status = submit ? 'SUBMITTED' : 'DRAFT'

    // FUN-002 : champs métier communs à toutes les branches (création, mise à
    // jour, réutilisation d'un dossier REJECTED/EXPIRED)
    const fieldUpdates: Record<string, unknown> = {}
    if (resolvedTenantCategory) fieldUpdates.tenant_category = resolvedTenantCategory
    if (monthlyIncome !== undefined) fieldUpdates.monthly_income = monthlyIncome
    if (employer !== undefined) fieldUpdates.employer = employer
    if (resolvedEmploymentType) fieldUpdates.employment_type = resolvedEmploymentType
    if (guarantorName !== undefined) fieldUpdates.guarantor_name = guarantorName
    if (guarantorPhone !== undefined) fieldUpdates.guarantor_phone = guarantorPhone
    if (guarantorRelation !== undefined) fieldUpdates.guarantor_relation = guarantorRelation

    let rentalFile: any

    if (rentalFileId) {
      // ─── Mode ciblé (FUN-002) : le locataire édite/soumet UN dossier précis ───
      const { data: target } = await admin
        .from('rental_files')
        .select('*')
        .eq('id', rentalFileId)
        .maybeSingle()

      if (!target || target.tenant_id !== userId) {
        return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
      }

      const targetStatus: string = target.status
      // DRAFT : édition libre — REJECTED/EXPIRED : réouverture — le reste est verrouillé
      const draftEditableStatuses = ['DRAFT', 'REJECTED', 'EXPIRED']
      const submitEditableStatuses = ['DRAFT', 'REJECTED', 'EXPIRED', 'TC_REVIEW']
      const editableStatuses = submit ? submitEditableStatuses : draftEditableStatuses

      if (!editableStatuses.includes(targetStatus)) {
        const lockMessage =
          targetStatus === 'SUBMITTED'
            ? "Votre dossier est en cours de validation. Retirez-le d'abord si vous souhaitez le modifier."
            : targetStatus === 'TC_REVIEW'
              ? "Le Tiers de Confiance examine votre dossier : soumettez-le à nouveau plutôt que de le modifier."
              : 'Ce dossier est déjà validé et ne peut plus être modifié.'
        return NextResponse.json({ error: lockMessage }, { status: 409 })
      }

      // Changement de type : seulement sur un dossier (re)passant en DRAFT,
      // et seulement si aucun autre DRAFT du même type n'existe (index unique).
      const willBeDraft = !submit
      const typeChangeAllowed = willBeDraft && ['DRAFT', 'REJECTED', 'EXPIRED'].includes(targetStatus)
      if (typeChangeAllowed) {
        const sameTypeDrafts = (await findDraftsByType(admin, userId, fileTypeValue))
          .filter((d: any) => d.id !== target.id)
        if (sameTypeDrafts.length > 0) {
          return NextResponse.json(
            { error: 'Vous avez déjà un dossier en brouillon pour ce type' },
            { status: 409 },
          )
        }
      }

      // Validation des documents obligatoires avant soumission (dossier ciblé)
      if (submit) {
        const completeness = await getRentalFileCompleteness(admin, target.id)
        if (!completeness.complete) {
          return NextResponse.json(
            { error: 'Veuillez télécharger tous les documents obligatoires avant de soumettre', missingDocuments: completeness.missingTypes },
            { status: 400 },
          )
        }
      }

      const wasDraft = targetStatus === 'DRAFT'
      const updateData: Record<string, unknown> = { status, ...fieldUpdates }
      if (willBeDraft) {
        updateData.file_type = fileTypeValue
      }
      if (!wasDraft) {
        // Réouverture / resoumission : on efface la décision TC précédente
        updateData.rejection_reason = null
        updateData.tc_comment = null
        updateData.reviewed_by_id = null
        updateData.reviewed_at = null
      }

      const { data: updated, error: updateError } = await admin
        .from('rental_files')
        .update(updateData as any)
        .eq('id', target.id)
        .select()
        .single()

      if (updateError) {
        if ((updateError as any).code === '23505') {
          return NextResponse.json(
            { error: 'Vous avez déjà un dossier en brouillon pour ce type' },
            { status: 409 },
          )
        }
        throw updateError
      }
      rentalFile = updated

      if (!wasDraft) {
        // Réutilisation d'un dossier non-DRAFT : remettre les documents en PENDING
        await admin
          .from('rental_file_documents')
          .update({ status: 'PENDING', tc_comment: null })
          .eq('rental_file_id', target.id)
      }
      if (submit || !wasDraft) {
        // Resynchronise les candidatures liées (comportement historique des deux branches)
        await syncApplicationsStatus(admin, target.id, status)
      }

      const auditDetails = !wasDraft && !submit
        ? `Dossier locatif (rejeté/expiré) rouvert en brouillon — type ${fileTypeValue}`
        : wasDraft && !submit
          ? `Dossier locatif (brouillon) mis à jour — type ${fileTypeValue}`
          : wasDraft && submit
            ? `Dossier locatif soumis pour validation — type ${fileTypeValue}`
            : `Dossier locatif soumis à nouveau pour validation — type ${fileTypeValue}`

      await admin.from('audit_logs').insert({
        id: generateId(),
        action: submit ? 'SUBMIT' : 'UPDATE',
        entity: 'RentalFile',
        entity_id: target.id,
        details: auditDetails,
        user_id: userId,
      })

      if (submit) {
        await openValidationSla(admin, 'RENTAL_FILE', rentalFile.id)
        await notifyTcUsers(admin, 'Nouveau dossier locatif soumis', 'Un nouveau dossier locatif a été soumis et nécessite votre validation.', rentalFile.id)
      }
    } else if (status === 'DRAFT') {
      // ─── Mode création (sans id) : un seul DRAFT par (locataire, type) — FUN-002 ───
      const sameTypeDrafts = await findDraftsByType(admin, userId, fileTypeValue)
      if (sameTypeDrafts.length > 0) {
        return NextResponse.json(
          { error: 'Vous avez déjà un dossier en brouillon pour ce type' },
          { status: 409 },
        )
      }

      // Aucun DRAFT du même type — réutiliser un dossier REJECTED du même type
      const rejectedFile = await findReusableFileByType(admin, userId, 'REJECTED', fileTypeValue)

      if (rejectedFile) {
        // Réutiliser le fichier REJECTED : le repasser en DRAFT (conserve le même ID)
        const updateData: any = {
          status: 'DRAFT',
          file_type: fileTypeValue,
          rejection_reason: null,
          tc_comment: null,
          reviewed_by_id: null,
          reviewed_at: null,
          ...fieldUpdates,
        }

        const { data: updated } = await admin
          .from('rental_files')
          .update(updateData as any)
          .eq('id', rejectedFile.id)
          .select()
          .single()

        rentalFile = updated

        // Sync les candidatures liées
        await syncApplicationsStatus(admin, rejectedFile.id, 'DRAFT')

        // Remettre les documents en PENDING pour re-examen
        await admin
          .from('rental_file_documents')
          .update({ status: 'PENDING', tc_comment: null })
          .eq('rental_file_id', rejectedFile.id)

        await admin.from('audit_logs').insert({
          id: generateId(),
          action: 'UPDATE',
          entity: 'RentalFile',
          entity_id: rejectedFile.id,
          details: `Dossier locatif (rejeté) rouvert en brouillon — type ${fileTypeValue}`,
          user_id: userId,
        })
      } else {
        // Aucun REJECTED du même type — réutiliser un dossier EXPIRED du même type
        const activeFile = await findReusableFileByType(admin, userId, 'EXPIRED', fileTypeValue)

        if (activeFile) {
          // Réutiliser le fichier EXPIRED : le repasser en DRAFT (conserve le même ID)
          const updateData: any = {
            status: 'DRAFT',
            file_type: fileTypeValue,
            rejection_reason: null,
            tc_comment: null,
            reviewed_by_id: null,
            reviewed_at: null,
            ...fieldUpdates,
          }

          const { data: updated } = await admin
            .from('rental_files')
            .update(updateData as any)
            .eq('id', activeFile.id)
            .select()
            .single()

          rentalFile = updated

          // Sync les candidatures liées
          await syncApplicationsStatus(admin, activeFile.id, 'DRAFT')

          // Remettre les documents en PENDING
          await admin
            .from('rental_file_documents')
            .update({ status: 'PENDING', tc_comment: null })
            .eq('rental_file_id', activeFile.id)

          await admin.from('audit_logs').insert({
            id: generateId(),
            action: 'UPDATE',
            entity: 'RentalFile',
            entity_id: activeFile.id,
            details: `Dossier locatif rouvert en brouillon (était expiré) — type ${fileTypeValue}`,
            user_id: userId,
          })
        } else {
          // Aucun dossier réutilisable du même type — créer un nouveau DRAFT
          const insertData: any = {
            id: generateId(),
            tenant_id: userId,
            status: 'DRAFT',
            file_type: fileTypeValue,
            ...fieldUpdates,
          }

          const { data: created, error: insertError } = await admin
            .from('rental_files')
            .insert(insertData as any)
            .select()
            .maybeSingle()

          if (insertError && insertError.code === '23505') {
            // Race condition : un autre appel a créé un DRAFT du même type entre-temps
            const concurrent = (await findDraftsByType(admin, userId, fileTypeValue))[0]
            if (concurrent) {
              rentalFile = concurrent
            } else {
              throw insertError
            }
          } else if (created) {
            rentalFile = created

            await admin.from('audit_logs').insert({
              id: generateId(),
              action: 'CREATE',
              entity: 'RentalFile',
              entity_id: rentalFile.id,
              details: `Nouveau dossier locatif (brouillon) créé — type ${fileTypeValue}`,
              user_id: userId,
            })
          } else if (insertError) {
            throw insertError
          }
        }
      }
    } else {
      // ─── Mode soumission (sans id) : DRAFT du type demandé prioritaire (FUN-002) ───
      const draftForType = (await findDraftsByType(admin, userId, fileTypeValue))[0] ?? null
      const rejectedForType = draftForType ? null : await findReusableFileByType(admin, userId, 'REJECTED', fileTypeValue)
      const expiredForType = draftForType || rejectedForType ? null : await findReusableFileByType(admin, userId, 'EXPIRED', fileTypeValue)

      // Server-side document validation : le dossier à soumettre doit être complet
      const fileForDocs = draftForType ?? rejectedForType ?? expiredForType
      if (!fileForDocs) {
        return NextResponse.json({ error: 'Aucun dossier modifiable à soumettre', missingDocuments: [...REQUIRED_RENTAL_FILE_DOCUMENT_TYPES] }, { status: 400 })
      }
      const completeness = await getRentalFileCompleteness(admin, fileForDocs.id)
      if (!completeness.complete) {
        return NextResponse.json({ error: 'Veuillez télécharger tous les documents obligatoires avant de soumettre', missingDocuments: completeness.missingTypes }, { status: 400 })
      }

      if (draftForType) {
        // Mettre à jour le DRAFT en SUBMITTED en place (conserve le même ID)
        const updateData: any = { status: 'SUBMITTED', ...fieldUpdates }

        const { data: updated } = await admin
          .from('rental_files')
          .update(updateData as any)
          .eq('id', draftForType.id)
          .select()
          .single()

        rentalFile = updated

        // Sync les candidatures liées
        await syncApplicationsStatus(admin, draftForType.id, 'SUBMITTED')

        await admin.from('audit_logs').insert({
          id: generateId(),
          action: 'SUBMIT',
          entity: 'RentalFile',
          entity_id: draftForType.id,
          details: `Dossier locatif soumis pour validation — type ${fileTypeValue}`,
          user_id: userId,
        })
      } else {
        // Resoumettre un dossier existant non-validé du même type (REJECTED, EXPIRED)
        const existingFile = rejectedForType ?? expiredForType

        if (existingFile) {
          const updateData: any = { status: 'SUBMITTED', ...fieldUpdates }
          updateData.rejection_reason = null
          updateData.tc_comment = null
          updateData.reviewed_by_id = null
          updateData.reviewed_at = null

          const { data: updated } = await admin
            .from('rental_files')
            .update(updateData as any)
            .eq('id', existingFile.id)
            .select()
            .single()

          rentalFile = updated

          // Sync les candidatures liées
          await syncApplicationsStatus(admin, existingFile.id, 'SUBMITTED')

          // Reset all documents to PENDING so the TC can review them again
          await admin
            .from('rental_file_documents')
            .update({ status: 'PENDING', tc_comment: null })
            .eq('rental_file_id', existingFile.id)

          await admin.from('audit_logs').insert({
            id: generateId(),
            action: 'SUBMIT',
            entity: 'RentalFile',
            entity_id: existingFile.id,
            details: `Dossier locatif soumis à nouveau pour validation — type ${fileTypeValue}`,
            user_id: userId,
          })
        } else {
          // Aucun dossier existant du même type — créer un nouveau SUBMITTED
          const { data: created } = await admin
            .from('rental_files')
            .insert({
              id: generateId(),
              tenant_id: userId,
              status: 'SUBMITTED',
              file_type: fileTypeValue,
              ...fieldUpdates,
            } as any)
            .select()
            .single()

          rentalFile = created

          await admin.from('audit_logs').insert({
            id: generateId(),
            action: 'SUBMIT',
            entity: 'RentalFile',
            entity_id: rentalFile.id,
            details: `Nouveau dossier locatif créé et soumis — type ${fileTypeValue}`,
            user_id: userId,
          })
        }
      }

      if (rentalFile) {
        await openValidationSla(admin, 'RENTAL_FILE', rentalFile.id)
        await notifyTcUsers(admin, 'Nouveau dossier locatif soumis', 'Un nouveau dossier locatif a été soumis et nécessite votre validation.', rentalFile.id)
      }
    }

    if (!rentalFile) {
      return NextResponse.json({ error: 'Erreur lors de la création/mise à jour' }, { status: 500 })
    }

    const enriched = await enrichRentalFile(admin, rentalFile)

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('Rental file POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function notifyTcUsers(admin: ReturnType<typeof getSupabaseAdminClient>, title: string, message: string, entityId: string) {
  const { data: tcUsers } = await admin
    .from('users')
    .select('id')
    .eq('role', 'TIERS_CONFIANCE')
    .eq('is_active', true)

  if (tcUsers && tcUsers.length > 0) {
    await notifyMany({
      userIds: tcUsers.map((tc) => tc.id),
      type: 'DOSSIER_UPDATE',
      title,
      message,
      actionUrl: 'dossier-validations',
      entityId,
    })
  }
}

async function enrichRentalFiles(admin: ReturnType<typeof getSupabaseAdminClient>, files: any[]) {
  const fileIds = files.map((f) => f.id)

  // Fallback : récupère aussi les documents des DRAFT des mêmes locataires
  const tenantIds = [...new Set(files.map((f: any) => f.tenant_id).filter(Boolean))]
  let draftFileIds: string[] = []
  if (tenantIds.length > 0) {
    const { data: draftFiles } = await admin
      .from('rental_files')
      .select('id')
      .eq('status', 'DRAFT')
      .in('tenant_id', tenantIds)
    draftFileIds = (draftFiles ?? []).map((d: any) => d.id)
  }

  const allFileIds = [...new Set([...fileIds, ...draftFileIds])]

  const { data: documents } = await admin
    .from('rental_file_documents')
    .select('*')
    .in('rental_file_id', allFileIds)
    .order('created_at', { ascending: false })

  const { data: leases } = await admin
    .from('leases')
    .select('id, status, start_date, end_date, monthly_rent, property_id')
    .in('rental_file_id', fileIds)

  const propertyIds = [...new Set((leases ?? []).map((l) => l.property_id))]
  const { data: leaseProperties } = propertyIds.length > 0 ? await admin
    .from('properties')
    .select('id, title, address, city')
    .in('id', propertyIds) : { data: [] }

  const { data: leasePropertyImages } = propertyIds.length > 0 ? await admin
    .from('property_images')
    .select('property_id, url')
    .in('property_id', propertyIds)
    .order('order', { ascending: true }) : { data: [] }

  const reviewerIds = [...new Set(files.map((f) => f.reviewed_by_id).filter(Boolean))]
  const { data: reviewers } = reviewerIds.length > 0 ? await admin
    .from('users')
    .select('id, first_name, last_name')
    .in('id', reviewerIds) : { data: [] }

  const docMap = groupBy(documents ?? [], 'rental_file_id')
  const leaseMap = groupBy(leases ?? [], 'rental_file_id')
  const propMap = new Map((leaseProperties ?? []).map((p) => [p.id, p]))
  const imgMap = groupBy(leasePropertyImages ?? [], 'property_id')
  const reviewerMap = new Map((reviewers ?? []).map((r) => [r.id, r]))

  // Build tenantId → draftFileId map for document fallback
  const draftFileByTenant = new Map<string, string>()
  for (const f of files) {
    if (f.status === 'DRAFT') {
      draftFileByTenant.set(f.tenant_id, f.id)
    }
  }

  return Promise.all(files.map(async (f) => ({
    id: f.id,
    status: f.status,
    // FUN-002 : type de dossier (STANDARD pour les lignes antérieures à la migration)
    fileType: normalizeRentalFileType(f.file_type),
    priority: f.priority,
    onHold: f.on_hold,
    onHoldReason: f.on_hold_reason,
    tenantCategory: f.tenant_category,
    monthlyIncome: f.monthly_income,
    employer: f.employer,
    employmentType: f.employment_type,
    guarantorName: f.guarantor_name,
    guarantorPhone: f.guarantor_phone,
    guarantorRelation: f.guarantor_relation,
    validUntil: f.valid_until,
    rejectionReason: f.rejection_reason,
    tcComment: f.tc_comment,
    reviewedAt: f.reviewed_at,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
    isComplete: REQUIRED_RENTAL_FILE_DOCUMENT_TYPES.every((requiredType) =>
      (docMap.get(f.id) ?? []).some((document: any) => document.type === requiredType),
    ),
    missingTypes: REQUIRED_RENTAL_FILE_DOCUMENT_TYPES.filter((requiredType) =>
      !(docMap.get(f.id) ?? []).some((document: any) => document.type === requiredType),
    ),
    tenantId: f.tenant_id,
    reviewedById: f.reviewed_by_id,
    documents: await (async () => {
      const fileDocs = docMap.get(f.id)
      if (fileDocs?.length) return signDocUrls(fileDocs.map(mapRentalFileDoc))
      const fallbackDraftId = draftFileByTenant.get(f.tenant_id)
      if (fallbackDraftId) {
        const fallbackDocs = docMap.get(fallbackDraftId)
        if (fallbackDocs?.length) return signDocUrls(fallbackDocs.map(mapRentalFileDoc))
      }
      return []
    })(),
    leases: (leaseMap.get(f.id) ?? []).map((l: any) => {
      const prop = propMap.get(l.property_id)
      const propImages = imgMap.get(l.property_id) ?? []
      return {
        id: l.id,
        status: l.status,
        startDate: l.start_date,
        endDate: l.end_date,
        monthlyRent: l.monthly_rent,
        property: prop ? {
          id: prop.id,
          title: prop.title,
          address: prop.address,
          city: prop.city,
          images: propImages.slice(0, 1).map((img: any) => ({ url: img.url })),
        } : undefined,
      }
    }),
    reviewedBy: (() => {
      const r = reviewerMap.get(f.reviewed_by_id)
      if (!r) return undefined
      return { id: r.id, firstName: r.first_name, lastName: r.last_name }
    })(),
  })))
}

async function enrichRentalFile(admin: ReturnType<typeof getSupabaseAdminClient>, file: any) {
  const enriched = await enrichRentalFiles(admin, [file])
  return enriched[0] ?? file
}

function mapRentalFileDoc(d: any) {
  return {
    id: d.id,
    type: d.type,
    url: d.url,
    name: d.name,
    status: d.status,
    tcComment: d.tc_comment,
    createdAt: d.created_at,
    rentalFileId: d.rental_file_id,
  }
}

function groupBy(arr: any[], key: string) {
  const map = new Map<string, any[]>()
  for (const item of arr) {
    const k = item[key]
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(item)
  }
  return map
}
