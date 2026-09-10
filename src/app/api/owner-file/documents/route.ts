import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notifyMany } from '@/lib/notify'
import { BUCKETS, deleteFromStorage, extractBucketAndPath, uploadFromBase64 } from '@/lib/supabase/storage'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function GET(req: NextRequest) {
  const auth = await resolveRequestUser(req)
  const { userId, applyCookies } = auth
  try {
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const { searchParams } = new URL(req.url)
    const ownerId = searchParams.get('ownerId')

    if (!ownerId) {
      return NextResponse.json({ error: 'ownerId requis' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: caller } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (caller?.role === 'PROPRIETAIRE' && userId !== ownerId) {
      const resp = NextResponse.json({ error: 'Vous ne pouvez consulter que vos propres documents' }, { status: 403 })
      return applyCookies(resp)
    }

    if (caller && !['ADMIN', 'TIERS_CONFIANCE', 'PROPRIETAIRE', 'AGENCE'].includes(caller.role)) {
      const resp = NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
      return applyCookies(resp)
    }

    // Récupérer les documents du propriétaire via owner_file
    const { data: ownerFiles } = await (supabase as any)
      .from('owner_files')
      .select('id')
      .eq('owner_id', ownerId)

    if (!ownerFiles || ownerFiles.length === 0) {
      const resp = NextResponse.json({ documents: [] })
      return applyCookies(resp)
    }

    const ownerFileIds = ownerFiles.map(of => of.id)

    // Récupérer les documents associés
    const { data: documents } = await (supabase as any)
      .from('owner_file_documents')
      .select('id, name, type, url, status, property_id')
      .in('owner_file_id', ownerFileIds)

    const mappedDocs = documents?.map(doc => ({
      id: doc.id,
      name: doc.name || '',
      type: doc.type || 'OTHER',
      url: doc.url,
      status: doc.status,
      propertyId: doc.property_id,
    })) || []

    const resp = NextResponse.json({ documents: mappedDocs })
    return applyCookies(resp)
  } catch (error) {
    console.error('[API /owner-file/documents GET] Error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return applyCookies ? applyCookies(resp) : resp
  }
}

export async function POST(req: NextRequest) {
  const auth2 = await resolveRequestUser(req)
  const { userId, applyCookies } = auth2
  try {
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const body = await req.json()
    const { ownerFileId, type, name, content, url: externalUrl, propertyId } = body as {
      ownerFileId: string
      type: string
      name: string
      content?: string
      url?: string
      propertyId?: string
    }

    if (!ownerFileId || !type || !name) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    // Un titre de propriété peut être rattaché à un bien précis, pour que sa
    // validation TC ne couvre pas silencieusement tous les biens du propriétaire.
    if (type === 'PROPERTY_TITLE' && propertyId) {
      const { data: targetProperty } = await supabase
        .from('properties')
        .select('id')
        .eq('id', propertyId)
        .eq('owner_id', userId)
        .maybeSingle()
      if (!targetProperty) {
        return NextResponse.json({ error: 'Bien introuvable ou non rattaché à votre compte' }, { status: 404 })
      }
    }

    const { data: ownerFile, error: fileError } = await supabase
      .from('owner_files')
      .select('id, owner_id, status')
      .eq('id', ownerFileId)
      .eq('owner_id', userId)
      .single()

    if (fileError || !ownerFile) {
      return NextResponse.json({ error: 'Dossier propriétaire non trouvé' }, { status: 404 })
    }

    if (ownerFile.status === 'TC_REVIEW') {
      await supabase
        .from('owner_files')
        .update({ status: 'DRAFT', reviewed_by_id: null, reviewed_at: null })
        .eq('id', ownerFile.id)

      await supabase
        .from('owner_file_documents')
        .update({ status: 'PENDING' })
        .eq('owner_file_id', ownerFile.id)

      ownerFile.status = 'DRAFT'
    } else if (ownerFile.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Le dossier n\'est plus modifiable' }, { status: 400 })
    }

    const validTypes = [
      'ID_CARD', 'PASSPORT', 'PROPERTY_TITLE', 'UTILITY_BILL',
      'BANK_ACCOUNT_DETAILS', 'OTHER',
    ]

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Type de document invalide' }, { status: 400 })
    }

    // Un titre de propriété est rattaché à un bien précis, chaque bien peut
    // donc avoir le sien ; les autres types de documents restent uniques
    // par dossier propriétaire.
    let existingDocQuery = (supabase
      .from('owner_file_documents') as any)
      .select('id, url')
      .eq('owner_file_id', ownerFileId)
      .eq('type', type)
    existingDocQuery = type === 'PROPERTY_TITLE'
      ? (propertyId ? existingDocQuery.eq('property_id', propertyId) : existingDocQuery.is('property_id', null))
      : existingDocQuery
    const { data: existingDoc } = await (existingDocQuery.maybeSingle() as any)

    let url = existingDoc?.url || ''
    if (content) {
      const ext = guessFileExt(name)
      const filePath = `${userId}/${ownerFileId}/${type}_${Date.now()}.${ext}`
      url = await uploadFromBase64(BUCKETS.OWNER_DOCUMENTS, content, filePath)
    } else if (externalUrl) {
      url = externalUrl
    }

    if (existingDoc?.url && isStorageUrl(existingDoc.url) && url !== existingDoc.url) {
      const parsed = extractBucketAndPath(existingDoc.url)
      if (parsed) {
        await deleteFromStorage(parsed.bucket, parsed.path).catch(() => {})
      }
    }

    let document: any
    if (existingDoc) {
      const { data: updated, error: updateError } = await ((supabase
        .from('owner_file_documents') as any)
        .update({ name, url, status: 'PENDING', tc_comment: null })
        .eq('id', existingDoc.id)
        .select()
        .single())
      if (updateError || !updated) {
        console.error('Owner file document update error:', updateError)
        return NextResponse.json({ error: 'Erreur lors de la mise à jour du document' }, { status: 500 })
      }
      document = updated
    } else {
      const { data: created, error: insertError } = await (supabase
        .from('owner_file_documents')
        .insert({ id: generateId(), owner_file_id: ownerFileId, type, name, url, status: 'PENDING', property_id: type === 'PROPERTY_TITLE' ? (propertyId ?? null) : null } as any)
        .select()
        .single() as any)
      if (insertError || !created) {
        console.error('Owner file document insert error:', insertError)
        return NextResponse.json({ error: "Erreur lors de la création du document" }, { status: 500 })
      }
      document = created
    }

    const { data: tcUsers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'TIERS_CONFIANCE')
      .eq('is_active', true)

    if (tcUsers && tcUsers.length > 0) {
      await notifyMany({
        userIds: tcUsers.map((tc: any) => tc.id),
        type: 'DOSSIER_UPDATE',
        title: 'Nouveau document de propriété soumis',
        message: 'Un nouveau document de propriété a été soumis et nécessite votre validation.',
        actionUrl: 'owner-dossiers',
        entityId: document.id,
      })
    }

    const mapped = {
      id: document.id,
      ownerFileId: document.owner_file_id,
      type: document.type,
      name: document.name,
      url: document.url,
      status: document.status,
      tcComment: document.tc_comment,
      propertyId: document.property_id,
      createdAt: document.created_at,
      updatedAt: document.updated_at,
    }

    const response = NextResponse.json({ data: mapped })
    return applyCookies(response)
  } catch (error) {
    console.error('Owner file document upload error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth3 = await resolveRequestUser(req)
  const { userId, applyCookies } = auth3
  try {
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
      .from('owner_file_documents')
      .select('id, url, owner_file:owner_files!owner_file_documents_owner_file_id_fkey(owner_id, status)')
      .eq('id', docId)
      .single() as any)

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    const ownerFile = (doc as any).owner_file
    if (ownerFile?.owner_id !== userId) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    if (ownerFile?.status === 'TC_REVIEW') {
      await supabase
        .from('owner_files')
        .update({ status: 'DRAFT', reviewed_by_id: null, reviewed_at: null })
        .eq('id', ownerFile.id)

      await supabase
        .from('owner_file_documents')
        .update({ status: 'PENDING' })
        .eq('owner_file_id', ownerFile.id)

      await supabase.from('audit_logs').insert({
        id: generateId(),
        action: 'UPDATE',
        entity: 'OwnerFile',
        entity_id: ownerFile.id,
        details: 'Dossier propriétaire (complément TC) rouvert en brouillon via suppression de document',
        user_id: userId,
      })
    } else if (ownerFile?.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Le dossier n\'est plus modifiable' }, { status: 400 })
    }

    if (doc.url && isStorageUrl(doc.url)) {
      const parsed = extractBucketAndPath(doc.url)
      if (parsed) {
        await deleteFromStorage(parsed.bucket, parsed.path).catch(() => {})
      }
    }

    await (supabase.from('owner_file_documents').delete().eq('id', docId) as any)

    const response = NextResponse.json({ success: true })
    return applyCookies(response)
  } catch (error) {
    console.error('Owner file document delete error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function guessFileExt(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot !== -1) return name.slice(dot + 1)
  return 'bin'
}

function isStorageUrl(url: string): boolean {
  return url.startsWith('http') && url.includes('/storage/v1/object/public/')
}
