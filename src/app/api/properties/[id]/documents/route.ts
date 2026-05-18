import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { BUCKETS, uploadFromBase64 } from '@/lib/supabase/storage'

const VALID_DOC_TYPES = [
  'DIAGNOSTIC_DPE',
  'DIAGNOSTIC_AMIANTE',
  'DIAGNOSTIC_PLOMB',
  'DIAGNOSTIC_GAZ',
  'DIAGNOSTIC_ELECTRICITE',
  'DIAGNOSTIC_ERP',
  'ASSURANCE_HABITATION',
  'ASSURANCE_RC',
  'PERMIS_CONSTRUIRE',
  'ATTESTATION_CONFORMITE',
  'PLAN_BATIMENT',
  'AUTRE',
] as const

const OWNER_ROLES = ['PROPRIETAIRE', 'AGENCE']

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .single()

    if (propError || !property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    const { data: documents, error: docsError } = await supabase
      .from('property_documents')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })

    const mapped = (documents || []).map((d: any) => ({
      id: d.id,
      propertyId: d.property_id,
      name: d.name,
      type: d.type,
      url: d.url,
      description: d.description,
      expiryDate: d.expiry_date,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))

    const response = NextResponse.json({ data: mapped })
    return applyCookies(response)
  } catch (error) {
    console.error('Property documents list error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .single()

    if (propError || !property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const role = user?.active_role || user?.role
    if (!role || !OWNER_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (property.owner_id !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { name, type, content, description, expiryDate } = body as {
      name: string
      type: string
      content: string
      description?: string
      expiryDate?: string
    }

    if (!name || !type || !content) {
      return NextResponse.json(
        { error: 'Nom, type et contenu du document requis' },
        { status: 400 }
      )
    }

    if (!VALID_DOC_TYPES.includes(type as (typeof VALID_DOC_TYPES)[number])) {
      return NextResponse.json(
        { error: `Type de document invalide. Types valides : ${VALID_DOC_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    let parsedExpiryDate: Date | null = null
    if (expiryDate) {
      parsedExpiryDate = new Date(expiryDate)
      if (isNaN(parsedExpiryDate.getTime())) {
        return NextResponse.json(
          { error: "Date d'expiration invalide" },
          { status: 400 }
        )
      }
    }

    const ext = guessFileExt(name)
    const filePath = `${userId}/${propertyId}/${type}_${Date.now()}.${ext}`
    const url = await uploadFromBase64(BUCKETS.PROPERTY_DOCUMENTS, content, filePath)

    const { data: document, error: createError } = await supabase
      .from('property_documents')
      .insert({
        property_id: propertyId,
        name: name.trim(),
        type,
        url,
        description: description?.trim() || null,
        expiry_date: parsedExpiryDate?.toISOString() || null,
      })
      .select()
      .single()

    if (createError || !document) {
      throw createError || new Error('Failed to create document')
    }

    const mapped = {
      id: document.id,
      propertyId: document.property_id,
      name: document.name,
      type: document.type,
      url: document.url,
      description: document.description,
      expiryDate: document.expiry_date,
      createdAt: document.created_at,
      updatedAt: document.updated_at,
    }

    const response = NextResponse.json({ data: mapped }, { status: 201 })
    return applyCookies(response)
  } catch (error) {
    console.error('Property document upload error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function guessFileExt(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot !== -1) return name.slice(dot + 1)
  return 'bin'
}
