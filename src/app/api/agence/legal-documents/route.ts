import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notifyMany } from '@/lib/notify'
import { openValidationSla } from '@/lib/validation-sla'
import { BUCKETS, deleteFromStorage, extractBucketAndPath, uploadFromBase64 } from '@/lib/supabase/storage'

// Agency legal documents (AGREMENT, RCCM) validated by the Tiers de Confiance.
// Until this route existed, ownership_documents had no writer at all for
// agencies — the TC "Validations agences" screen (agency-validations.tsx)
// read from it, but no agency could ever submit anything there.

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const LEGAL_DOC_TYPES = ['AGREMENT', 'RCCM'] as const

async function requireAgency(req: NextRequest) {
  const auth = await resolveRequestUser(req)
  if (!auth.userId) {
    return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  }
  const supabase = getSupabaseAdminClient()
  const { data: user } = await supabase.from('users').select('role, active_role').eq('id', auth.userId).single()
  const effectiveRole = user?.active_role || user?.role
  if (effectiveRole !== 'AGENCE') {
    return { error: NextResponse.json({ error: 'Accès réservé aux agences' }, { status: 403 }) }
  }
  return { userId: auth.userId, applyCookies: auth.applyCookies }
}

export async function GET(req: NextRequest) {
  const auth = await requireAgency(req)
  if (auth.error) return auth.error
  try {
    const supabase = getSupabaseAdminClient()
    const { data } = await (supabase as any)
      .from('ownership_documents')
      .select('id, type, name, url, status, tc_comment, created_at')
      .eq('owner_id', auth.userId)
      .in('type', LEGAL_DOC_TYPES)
      .order('created_at', { ascending: false })

    const documents = (data ?? []).map((d: any) => ({
      id: d.id,
      type: d.type,
      name: d.name,
      url: d.url,
      status: d.status,
      tcComment: d.tc_comment,
      createdAt: d.created_at,
    }))

    return auth.applyCookies(NextResponse.json({ documents }))
  } catch (error) {
    console.error('Agence legal-documents GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAgency(req)
  if (auth.error) return auth.error
  try {
    const body = await req.json()
    const { type, name, content, url: externalUrl } = body as {
      type: string
      name: string
      content?: string
      url?: string
    }

    if (!type || !name || (!content && !externalUrl)) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }
    if (!LEGAL_DOC_TYPES.includes(type as any)) {
      return NextResponse.json({ error: 'Type de document invalide' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: existingDoc } = await (supabase as any)
      .from('ownership_documents')
      .select('id, url')
      .eq('owner_id', auth.userId)
      .eq('type', type)
      .maybeSingle()

    let url = existingDoc?.url || ''
    if (content) {
      const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : 'pdf'
      const filePath = `${auth.userId}/agency/${type}_${Date.now()}.${ext}`
      url = await uploadFromBase64(BUCKETS.OWNER_DOCUMENTS, content, filePath)
    } else if (externalUrl) {
      url = externalUrl
    }

    if (existingDoc?.url && existingDoc.url.includes('/storage/v1/object/public/') && url !== existingDoc.url) {
      const parsed = extractBucketAndPath(existingDoc.url)
      if (parsed) await deleteFromStorage(parsed.bucket, parsed.path).catch(() => {})
    }

    let document: any
    if (existingDoc) {
      const { data: updated, error: updateError } = await (supabase as any)
        .from('ownership_documents')
        .update({ name, url, status: 'PENDING', tc_comment: null, reviewed_by_id: null })
        .eq('id', existingDoc.id)
        .select()
        .single()
      if (updateError || !updated) {
        console.error('Agence legal document update error:', updateError)
        return NextResponse.json({ error: 'Erreur lors de la mise à jour du document' }, { status: 500 })
      }
      document = updated
    } else {
      const { data: created, error: insertError } = await (supabase as any)
        .from('ownership_documents')
        .insert({ id: generateId(), owner_id: auth.userId, type, name, url, status: 'PENDING' })
        .select()
        .single()
      if (insertError || !created) {
        console.error('Agence legal document insert error:', insertError)
        return NextResponse.json({ error: 'Erreur lors de la création du document' }, { status: 500 })
      }
      document = created
    }

    await openValidationSla(supabase, 'AGENCY', auth.userId!)

    const { data: tcUsers } = await supabase.from('users').select('id').eq('role', 'TIERS_CONFIANCE').eq('is_active', true)
    if (tcUsers && tcUsers.length > 0) {
      await notifyMany({
        userIds: tcUsers.map((tc: any) => tc.id),
        type: 'DOSSIER_UPDATE',
        title: 'Document agence soumis',
        message: `Un document ${type === 'AGREMENT' ? "d'agrément" : 'RCCM'} a été soumis et nécessite votre validation.`,
        actionUrl: 'agency-validations',
        entityId: document.id,
      })
    }

    const mapped = {
      id: document.id,
      type: document.type,
      name: document.name,
      url: document.url,
      status: document.status,
      tcComment: document.tc_comment,
      createdAt: document.created_at,
    }

    return auth.applyCookies(NextResponse.json({ data: mapped }))
  } catch (error) {
    console.error('Agence legal-documents POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAgency(req)
  if (auth.error) return auth.error
  try {
    const { searchParams } = new URL(req.url)
    const docId = searchParams.get('docId')
    if (!docId) {
      return NextResponse.json({ error: 'ID du document manquant' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const { data: doc } = await (supabase as any)
      .from('ownership_documents')
      .select('id, url, owner_id')
      .eq('id', docId)
      .single()

    if (!doc || doc.owner_id !== auth.userId) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    if (doc.url && doc.url.includes('/storage/v1/object/public/')) {
      const parsed = extractBucketAndPath(doc.url)
      if (parsed) await deleteFromStorage(parsed.bucket, parsed.path).catch(() => {})
    }

    await (supabase as any).from('ownership_documents').delete().eq('id', docId)

    return auth.applyCookies(NextResponse.json({ success: true }))
  } catch (error) {
    console.error('Agence legal-documents DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
