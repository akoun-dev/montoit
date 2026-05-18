import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

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

// GET /api/properties/[id]/documents — List documents for a property (owner only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params
    const auth = await getUserIdAndRole(req)
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { userId, effectiveRole } = auth

    // Verify property exists
    const property = await db.property.findUnique({
      where: { id: propertyId },
      select: { id: true, ownerId: true },
    })

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    // Only the owner (PROPRIETAIRE/AGENCE) can list documents
    if (property.ownerId !== userId || !OWNER_ROLES.includes(effectiveRole)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const documents = await db.propertyDocument.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: documents })
  } catch (error) {
    console.error('Property documents list error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/properties/[id]/documents — Upload a document to a property (owner only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params
    const auth = await getUserIdAndRole(req)
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { userId, effectiveRole } = auth

    // Verify property exists and belongs to this owner
    const property = await db.property.findUnique({
      where: { id: propertyId },
      select: { id: true, ownerId: true },
    })

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    if (property.ownerId !== userId || !OWNER_ROLES.includes(effectiveRole)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { name, type, content, description, expiryDate } = body as {
      name: string
      type: string
      content: string // base64 data URL
      description?: string
      expiryDate?: string
    }

    // Validate required fields
    if (!name || !type || !content) {
      return NextResponse.json(
        { error: 'Nom, type et contenu du document requis' },
        { status: 400 }
      )
    }

    // Validate document type
    if (!VALID_DOC_TYPES.includes(type as (typeof VALID_DOC_TYPES)[number])) {
      return NextResponse.json(
        { error: `Type de document invalide. Types valides : ${VALID_DOC_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate content is a data URL
    if (!content.startsWith('data:')) {
      return NextResponse.json(
        { error: 'Le contenu doit être une data URL (base64)' },
        { status: 400 }
      )
    }

    // Parse and validate expiry date if provided
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

    const document = await db.propertyDocument.create({
      data: {
        propertyId,
        name: name.trim(),
        type: type as (typeof VALID_DOC_TYPES)[number],
        url: content,
        description: description?.trim() || null,
        expiryDate: parsedExpiryDate,
      },
    })

    return NextResponse.json({ data: document }, { status: 201 })
  } catch (error) {
    console.error('Property document upload error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
