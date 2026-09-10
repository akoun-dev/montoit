import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getRentalFileCompleteness, REQUIRED_RENTAL_FILE_DOCUMENT_TYPES } from '@/lib/rental-file-completeness'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notifyMany } from '@/lib/notify'
import { openValidationSla } from '@/lib/validation-sla'

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
    await admin.from('applications' as any).update({ status: 'EXPIRED' } as any).in('rental_file_id', ids)
  } catch (error) {
    // Expiration is maintenance work and must not block a user operation.
    console.error('Rental file expiration error:', error)
  }
}

/** Synchronise le statut des candidatures liées à un dossier locatif */
async function syncApplicationsStatus(admin: ReturnType<typeof getSupabaseAdminClient>, rentalFileId: string, status: string) {
  await admin.from('applications' as any).update({ status } as any).eq('rental_file_id', rentalFileId)
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

    let query = admin
      .from('rental_files')
      .select('*')
      .eq('tenant_id', userId)
      .order('updated_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
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
    } = body as {
      tenantCategory?: string
      monthlyIncome?: number
      employer?: string
      employmentType?: string
      guarantorName?: string
      guarantorPhone?: string
      guarantorRelation?: string
      submit?: boolean
    }

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

    // Atomic upsert : utilise l'index unique partiel idx_rental_files_one_draft_per_tenant
    // pour garantir qu'un seul DRAFT existe par locataire, même en concurrence
    const id = generateId()
    const status = submit ? 'SUBMITTED' : 'DRAFT'

    // Server-side document validation : vérifier que les documents obligatoires sont présents avant soumission
    if (submit) {
      const { data: fileForDocs } = await admin
        .from('rental_files')
        .select('id, status')
        .eq('tenant_id', userId)
        .in('status', ['DRAFT', 'REJECTED', 'EXPIRED'])
        .order('updated_at', { ascending: false })
        .maybeSingle()

      if (!fileForDocs) {
        return NextResponse.json({ error: 'Aucun dossier modifiable à soumettre', missingDocuments: [...REQUIRED_RENTAL_FILE_DOCUMENT_TYPES] }, { status: 400 })
      }
      const completeness = await getRentalFileCompleteness(admin, fileForDocs.id)
      if (!completeness.complete) {
        return NextResponse.json({ error: 'Veuillez télécharger tous les documents obligatoires avant de soumettre', missingDocuments: completeness.missingTypes }, { status: 400 })
      }
    }

    const insertData: any = {
      id,
      tenant_id: userId,
      status,
    }
    if (resolvedTenantCategory) insertData.tenant_category = resolvedTenantCategory
    if (monthlyIncome !== undefined) insertData.monthly_income = monthlyIncome
    if (employer !== undefined) insertData.employer = employer
    if (resolvedEmploymentType) insertData.employment_type = resolvedEmploymentType
    if (guarantorName !== undefined) insertData.guarantor_name = guarantorName
    if (guarantorPhone !== undefined) insertData.guarantor_phone = guarantorPhone
    if (guarantorRelation !== undefined) insertData.guarantor_relation = guarantorRelation

    let rentalFile: any

    if (status === 'DRAFT') {
      // Vérifier d'abord si un DRAFT existe déjà (évite les doublons même sans index unique)
      const { data: existingDraft } = await admin
        .from('rental_files')
        .select('*')
        .eq('tenant_id', userId)
        .eq('status', 'DRAFT')
        .maybeSingle()

      if (existingDraft) {
        // Mettre à jour l'existant
        const updateData: any = {}
        if (resolvedTenantCategory) updateData.tenant_category = resolvedTenantCategory
        if (monthlyIncome !== undefined) updateData.monthly_income = monthlyIncome
        if (employer !== undefined) updateData.employer = employer
        if (resolvedEmploymentType) updateData.employment_type = resolvedEmploymentType
        if (guarantorName !== undefined) updateData.guarantor_name = guarantorName
        if (guarantorPhone !== undefined) updateData.guarantor_phone = guarantorPhone
        if (guarantorRelation !== undefined) updateData.guarantor_relation = guarantorRelation
        if (existingDraft.rejection_reason) updateData.rejection_reason = null

        const { data: updated } = await admin
          .from('rental_files')
          .update(updateData as any)
          .eq('id', existingDraft.id)
          .select()
          .single()

        rentalFile = updated

        await admin.from('audit_logs').insert({
          id: generateId(),
          action: 'UPDATE',
          entity: 'RentalFile',
          entity_id: existingDraft.id,
          details: 'Dossier locatif (brouillon) mis à jour',
          user_id: userId,
        })
      } else {
        // Aucun DRAFT existant — vérifier si l'utilisateur a un fichier REJECTED à réutiliser
        const { data: rejectedFile } = await admin
          .from('rental_files')
          .select('*')
          .eq('tenant_id', userId)
          .eq('status', 'REJECTED')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (rejectedFile) {
          // Réutiliser le fichier REJECTED : le repasser en DRAFT (conserve le même ID)
          const updateData: any = {
            status: 'DRAFT',
            rejection_reason: null,
            tc_comment: null,
            reviewed_by_id: null,
            reviewed_at: null,
          }
          if (resolvedTenantCategory) updateData.tenant_category = resolvedTenantCategory
          if (monthlyIncome !== undefined) updateData.monthly_income = monthlyIncome
          if (employer !== undefined) updateData.employer = employer
          if (resolvedEmploymentType) updateData.employment_type = resolvedEmploymentType
          if (guarantorName !== undefined) updateData.guarantor_name = guarantorName
          if (guarantorPhone !== undefined) updateData.guarantor_phone = guarantorPhone
          if (guarantorRelation !== undefined) updateData.guarantor_relation = guarantorRelation

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
            details: 'Dossier locatif (rejeté) rouvert en brouillon',
            user_id: userId,
          })
        } else {
          // Aucun REJECTED — vérifier si un dossier SUBMITTED/TC_REVIEW existe (évite les doublons)
          const { data: activeFile } = await admin
            .from('rental_files')
            .select('*')
            .eq('tenant_id', userId)
            .in('status', ['EXPIRED'])
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (activeFile) {
            // Réutiliser le fichier actif : le repasser en DRAFT (conserve le même ID)
            const updateData: any = {
              status: 'DRAFT',
              rejection_reason: null,
              tc_comment: null,
              reviewed_by_id: null,
              reviewed_at: null,
            }
            if (resolvedTenantCategory) updateData.tenant_category = resolvedTenantCategory
            if (monthlyIncome !== undefined) updateData.monthly_income = monthlyIncome
            if (employer !== undefined) updateData.employer = employer
            if (resolvedEmploymentType) updateData.employment_type = resolvedEmploymentType
            if (guarantorName !== undefined) updateData.guarantor_name = guarantorName
            if (guarantorPhone !== undefined) updateData.guarantor_phone = guarantorPhone
            if (guarantorRelation !== undefined) updateData.guarantor_relation = guarantorRelation

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
              details: 'Dossier locatif rouvert en brouillon (était en soumis/relecture)',
              user_id: userId,
            })
          } else {
            // Aucun fichier existant — créer un nouveau DRAFT
            const { data: created, error: insertError } = await admin
              .from('rental_files')
              .insert(insertData as any)
              .select()
              .maybeSingle()

            if (insertError && insertError.code === '23505') {
              // Race condition : un autre appel a créé un DRAFT entre-temps
              const { data: concurrent } = await admin
                .from('rental_files')
                .select('*')
                .eq('tenant_id', userId)
                .eq('status', 'DRAFT')
                .maybeSingle()

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
                details: 'Nouveau dossier locatif (brouillon) créé',
                user_id: userId,
              })
            } else if (insertError) {
              throw insertError
            }
          }
        }
      }
    } else {
      // SUBMITTED — chercher un DRAFT existant, ou resoumettre un dossier non-validé
      const { data: existingDraft } = await admin
        .from('rental_files')
        .select('id')
        .eq('tenant_id', userId)
        .eq('status', 'DRAFT')
        .maybeSingle()

      if (existingDraft) {
        // Mettre à jour le DRAFT en SUBMITTED en place (conserve le même ID)
        const updateData: any = { status: 'SUBMITTED' }
        if (resolvedTenantCategory) updateData.tenant_category = resolvedTenantCategory
        if (monthlyIncome !== undefined) updateData.monthly_income = monthlyIncome
        if (employer !== undefined) updateData.employer = employer
        if (resolvedEmploymentType) updateData.employment_type = resolvedEmploymentType
        if (guarantorName !== undefined) updateData.guarantor_name = guarantorName
        if (guarantorPhone !== undefined) updateData.guarantor_phone = guarantorPhone
        if (guarantorRelation !== undefined) updateData.guarantor_relation = guarantorRelation

        const { data: updated } = await admin
          .from('rental_files')
          .update(updateData as any)
          .eq('id', existingDraft.id)
          .select()
          .single()

        rentalFile = updated

        // Sync les candidatures liées
        await syncApplicationsStatus(admin, existingDraft.id, 'SUBMITTED')

        await admin.from('audit_logs').insert({
          id: generateId(),
          action: 'SUBMIT',
          entity: 'RentalFile',
          entity_id: existingDraft.id,
          details: 'Dossier locatif soumis pour validation',
          user_id: userId,
        })
      } else {
        // Resoumettre un dossier existant non-validé (REJECTED, EXPIRED, TC_REVIEW, SUBMITTED…)
        const { data: existingFile } = await admin
          .from('rental_files')
          .select('*')
          .eq('tenant_id', userId)
        .in('status', ['REJECTED', 'EXPIRED'])
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existingFile) {
          const updateData: any = { status: 'SUBMITTED' }
          if (existingFile.status === 'REJECTED' || existingFile.status === 'EXPIRED') {
            updateData.rejection_reason = null
            updateData.tc_comment = null
            updateData.reviewed_by_id = null
            updateData.reviewed_at = null
          }

          const { data: updated } = await admin
            .from('rental_files')
            .update(updateData)
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
            details: 'Dossier locatif soumis à nouveau pour validation',
            user_id: userId,
          })
        } else {
          // Aucun fichier existant — créer un nouveau SUBMITTED
          const { data: created } = await admin
            .from('rental_files')
            .insert(insertData as any)
            .select()
            .single()

          rentalFile = created

          await admin.from('audit_logs').insert({
            id: generateId(),
            action: 'SUBMIT',
            entity: 'RentalFile',
            entity_id: rentalFile.id,
            details: 'Nouveau dossier locatif créé et soumis',
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

  return files.map((f) => ({
    id: f.id,
    status: f.status,
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
    documents: (() => {
      const fileDocs = docMap.get(f.id)
      if (fileDocs?.length) return fileDocs.map(mapRentalFileDoc)
      const fallbackDraftId = draftFileByTenant.get(f.tenant_id)
      if (fallbackDraftId) {
        const fallbackDocs = docMap.get(fallbackDraftId)
        if (fallbackDocs?.length) return fallbackDocs.map(mapRentalFileDoc)
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
  }))
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
