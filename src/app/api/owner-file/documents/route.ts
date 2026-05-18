import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'
import { notifyMany } from '@/lib/notify'

// POST /api/owner-file/documents — Upload a document to an owner file
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { ownerFileId, type, name, content } = body as {
      ownerFileId: string
      type: string
      name: string
      content: string // base64 encoded file content
    }

    if (!ownerFileId || !type || !name) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    // Verify the owner file belongs to this user
    const ownerFile = await db.ownerFile.findFirst({
      where: { id: ownerFileId, ownerId: userId },
    })

    if (!ownerFile) {
      return NextResponse.json({ error: 'Dossier propriétaire non trouvé' }, { status: 404 })
    }

    if (ownerFile.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Le dossier n\'est plus modifiable' }, { status: 400 })
    }

    // Validate document type
    const validTypes = [
      'ID_CARD', 'PASSPORT', 'PROPERTY_TITLE', 'UTILITY_BILL',
      'BANK_ACCOUNT_DETAILS', 'OTHER',
    ]

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Type de document invalide' }, { status: 400 })
    }

    // Check if a document of this type already exists (replace it)
    const existingDoc = await db.ownerFileDocument.findFirst({
      where: { ownerFileId, type: type as never },
    })

    let document
    if (existingDoc) {
      // Replace existing document
      document = await db.ownerFileDocument.update({
        where: { id: existingDoc.id },
        data: {
          name,
          url: content || existingDoc.url,
          status: 'PENDING',
          tcComment: null,
        },
      })
    } else {
      // Create new document
      document = await db.ownerFileDocument.create({
        data: {
          ownerFileId,
          type: type as never,
          name,
          url: content || '',
          status: 'PENDING',
        },
      })
    }

    // Notify all TC users about the new document
    const tcUsers = await db.user.findMany({
      where: { role: 'TIERS_CONFIANCE', isActive: true },
      select: { id: true },
    })
    if (tcUsers.length > 0) {
      await notifyMany({
        userIds: tcUsers.map((tc) => tc.id),
        type: 'DOSSIER_UPDATE',
        title: 'Nouveau document de propriété soumis',
        message: `Un nouveau document de propriété a été soumis et nécessite votre validation.`,
        actionUrl: 'owner-validations',
        entityId: document.id,
      })
    }

    return NextResponse.json({ data: document })
  } catch (error) {
    console.error('Owner file document upload error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/owner-file/documents — Delete a document from an owner file
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const docId = searchParams.get('docId')

    if (!docId) {
      return NextResponse.json({ error: 'ID du document manquant' }, { status: 400 })
    }

    // Verify the document belongs to an owner file of this user
    const doc = await db.ownerFileDocument.findFirst({
      where: { id: docId },
      include: { ownerFile: { select: { ownerId: true, status: true } } },
    })

    if (!doc || doc.ownerFile.ownerId !== userId) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    if (doc.ownerFile.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Le dossier n\'est plus modifiable' }, { status: 400 })
    }

    await db.ownerFileDocument.delete({ where: { id: docId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Owner file document delete error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
