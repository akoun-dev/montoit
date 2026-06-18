import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { BUCKETS, deleteFromStorage, extractBucketAndPath, uploadFromBase64 } from '@/lib/supabase/storage'

export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const body = await req.json()
    const { rentalFileId, type, name, content } = body as {
      rentalFileId: string
      type: string
      name: string
      content: string
    }

    if (!rentalFileId || !type || !name) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const { data: rentalFile, error: fileError } = await supabase
      .from('rental_files')
      .select('id, tenant_id, status')
      .eq('id', rentalFileId)
      .eq('tenant_id', userId)
      .single()

    if (fileError || !rentalFile) {
      return NextResponse.json({ error: 'Dossier locatif non trouvé' }, { status: 404 })
    }

    // Statuts autorisés pour ajouter/remplacer un document :
    // - DRAFT : édition normale
    // - TC_REVIEW : le TC a demandé un complément, le locataire répond
    // - REJECTED : re-soumission après refus
    // - SUBMITTED : BLOQUÉ (le locataire doit d'abord retirer sa soumission)
    // - VALIDATED / EXPIRED : figé
    if (rentalFile.status === 'SUBMITTED') {
      return NextResponse.json({
        error: 'Votre dossier est en cours de validation. Pour le modifier, retirez d\'abord votre soumission depuis la page du dossier.',
        code: 'PENDING_REVIEW',
      }, { status: 409 })
    }
    if (rentalFile.status !== 'DRAFT' && rentalFile.status !== 'TC_REVIEW' && rentalFile.status !== 'REJECTED') {
      return NextResponse.json({ error: 'Le dossier n\'est plus modifiable' }, { status: 400 })
    }

    const validTypes = [
      'ID_CARD', 'PASSPORT', 'PAY_SLIP', 'EMPLOYMENT_CONTRACT',
      'WORK_CERTIFICATE', 'BANK_STATEMENT', 'GUARANTOR_ID',
      'GUARANTOR_INCOME_PROOF', 'PROOF_OF_ADDRESS', 'PARENT_ADDRESS_PROOF',
      'RCCM_REGISTRATION', 'TAX_DECLARATION', 'SCHOOL_CERTIFICATE',
      'SCHOLARSHIP_CERTIFICATE', 'PROPERTY_TITLE', 'UTILITY_BILL',
      'BANK_ACCOUNT_DETAILS', 'OTHER',
    ]

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Type de document invalide' }, { status: 400 })
    }

    const { data: existingDoc } = await (supabase
      .from('rental_file_documents')
      .select('id, url')
      .eq('rental_file_id', rentalFileId)
      .eq('type', type)
      .maybeSingle() as any)

    let url = existingDoc?.url || ''
    if (content) {
      const ext = guessFileExt(name)
      const filePath = `${userId}/${rentalFileId}/${type}_${Date.now()}.${ext}`
      url = await uploadFromBase64(BUCKETS.RENTAL_DOCUMENTS, content, filePath)

      if (existingDoc?.url && isStorageUrl(existingDoc.url)) {
        const parsed = extractBucketAndPath(existingDoc.url)
        if (parsed) {
          await deleteFromStorage(parsed.bucket, parsed.path).catch(() => {})
        }
      }
    }

    let document: any
    if (existingDoc) {
      const { data: updated, error: updateError } = await (supabase
        .from('rental_file_documents')
        .update({ name, url, status: 'PENDING', tc_comment: null } as any)
        .eq('id', existingDoc.id)
        .select()
        .single() as any)
      if (updateError) {
        console.error('Rental file document update error:', updateError)
        return NextResponse.json({ error: 'Erreur lors de la mise à jour du document' }, { status: 500 })
      }
      document = updated
    } else {
      const { data: created, error: insertError } = await (supabase
        .from('rental_file_documents')
        .insert({ id: generateId(), rental_file_id: rentalFileId, type, name, url, status: 'PENDING' } as any)
        .select()
        .single() as any)
      if (insertError) {
        console.error('Rental file document insert error:', insertError)
        return NextResponse.json({ error: "Erreur lors de la création du document" }, { status: 500 })
      }
      document = created
    }

    const mapped = {
      id: document.id,
      rentalFileId: document.rental_file_id,
      type: document.type,
      name: document.name,
      url: document.url,
      status: document.status,
      tcComment: document.tc_comment,
      createdAt: document.created_at,
      updatedAt: document.updated_at,
    }

    const response = NextResponse.json({ data: mapped })
    return applyCookies(response)
  } catch (error) {
    console.error('Rental file document upload error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { searchParams } = new URL(req.url)
    const docId = searchParams.get('docId')

    if (!docId) {
      return NextResponse.json({ error: 'ID du document manquant' }, { status: 400 })
    }

    const { data: doc, error: docError } = await (supabase
      .from('rental_file_documents')
      .select('id, url, rental_file:rental_files!rental_file_documents_rental_file_id_fkey(tenant_id, status)')
      .eq('id', docId)
      .single() as any)

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    const rentalFile = (doc as any).rental_file
    if (rentalFile?.tenant_id !== userId) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    // Suppression d'un document : autorisée uniquement en DRAFT ou REJECTED
    // (en TC_REVIEW, le locataire doit RÉPONDRE à la demande du TC, pas supprimer la trace)
    if (rentalFile?.status === 'SUBMITTED') {
      return NextResponse.json({
        error: 'Votre dossier est en cours de validation. Retirez d\'abord votre soumission pour modifier vos documents.',
        code: 'PENDING_REVIEW',
      }, { status: 409 })
    }
    if (rentalFile?.status !== 'DRAFT' && rentalFile?.status !== 'REJECTED') {
      return NextResponse.json({ error: 'Le dossier n\'est plus modifiable' }, { status: 400 })
    }

    if (doc.url && isStorageUrl(doc.url)) {
      const parsed = extractBucketAndPath(doc.url)
      if (parsed) {
        await deleteFromStorage(parsed.bucket, parsed.path).catch(() => {})
      }
    }

    await (supabase.from('rental_file_documents').delete().eq('id', docId) as any)

    const response = NextResponse.json({ success: true })
    return applyCookies(response)
  } catch (error) {
    console.error('Rental file document delete error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function guessFileExt(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot !== -1) return name.slice(dot + 1)
  return 'bin'
}

function isStorageUrl(url: string): boolean {
  return url.startsWith('http') && url.includes('/storage/v1/object/public/')
}
