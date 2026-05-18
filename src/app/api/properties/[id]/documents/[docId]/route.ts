import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

const OWNER_ROLES = ['PROPRIETAIRE', 'AGENCE']

// DELETE /api/properties/[id]/documents/[docId] — Delete a document from a property (owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: propertyId, docId } = await params
    const auth = await getUserIdAndRole(req)
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { userId, effectiveRole } = auth

    // Verify the document exists and belongs to the specified property
    const document = await db.propertyDocument.findUnique({
      where: { id: docId },
      include: {
        property: {
          select: { id: true, ownerId: true },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    // Ensure the document belongs to the specified property
    if (document.propertyId !== propertyId) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    // Verify the property belongs to this owner
    if (document.property.ownerId !== userId || !OWNER_ROLES.includes(effectiveRole)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await db.propertyDocument.delete({ where: { id: docId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Property document delete error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
