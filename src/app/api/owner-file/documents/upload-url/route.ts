import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { BUCKETS, ensureBucketExists, getSignedUrl, SIGNED_URL_EXPIRES_IN_SECONDS } from '@/lib/supabase/storage'
import { isAllowedFileName } from '@/lib/file-validation'

export async function POST(req: NextRequest) {
  const auth = await resolveRequestUser(req)
  const { userId, applyCookies } = auth
  try {
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const body = await req.json()
    const { ownerFileId, type, name } = body as {
      ownerFileId: string
      type: string
      name: string
    }

    if (!ownerFileId || !type || !name) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    // SEC-009 — Whitelist d'extensions : avant, l'extension du `name` client
    // était reprise telle quelle dans le chemin de stockage.
    if (!isAllowedFileName(name)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé (extensions acceptées : jpg, jpeg, png, webp, pdf, doc, docx, xls, xlsx, txt, zip)' },
        { status: 415 },
      )
    }

    const validTypes = [
      'ID_CARD', 'PASSPORT', 'PROPERTY_TITLE', 'UTILITY_BILL',
      'BANK_ACCOUNT_DETAILS', 'OTHER',
    ]
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Type de document invalide' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

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
      return NextResponse.json({ error: "Le dossier n'est plus modifiable" }, { status: 400 })
    }

    const ext = name.split('.').pop() || 'bin'
    const filePath = `${userId}/${ownerFileId}/${type}_${Date.now()}.${ext}`

    await ensureBucketExists(BUCKETS.OWNER_DOCUMENTS)

    const { data, error } = await supabase.storage
      .from(BUCKETS.OWNER_DOCUMENTS)
      .createSignedUploadUrl(filePath, { upsert: true })

    if (error || !data) {
      console.error('Error creating signed upload URL:', error)
      return NextResponse.json({ error: "Erreur de création du lien de téléchargement" }, { status: 500 })
    }

    // SEC-006 : le bucket owner-documents est privé — on renvoie une URL
    // signée de lecture (1 h) au lieu de l'URL publique (désormais morte).
    const readUrl = await getSignedUrl(BUCKETS.OWNER_DOCUMENTS, filePath, SIGNED_URL_EXPIRES_IN_SECONDS)

    const response = NextResponse.json({
      uploadUrl: data.signedUrl,
      publicUrl: readUrl,
      token: data.token,
      filePath,
    })
    return applyCookies(response)
  } catch (error) {
    console.error('[API /owner-file/documents/upload-url] Error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return applyCookies ? applyCookies(resp) : resp
  }
}
