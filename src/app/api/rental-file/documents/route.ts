import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

// POST /api/rental-file/documents — Upload a document to a rental file
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { rentalFileId, type, name, content } = body as {
      rentalFileId: string
      type: string
      name: string
      content: string // base64 encoded file content
    }

    if (!rentalFileId || !type || !name) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    // Verify the rental file belongs to this user
    const rentalFile = await db.rentalFile.findFirst({
      where: { id: rentalFileId, tenantId: userId },
    })

    if (!rentalFile) {
      return NextResponse.json({ error: 'Dossier locatif non trouvé' }, { status: 404 })
    }

    if (rentalFile.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Le dossier n\'est plus modifiable' }, { status: 400 })
    }

    // Validate document type
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

    // Check if a document of this type already exists (replace it)
    const existingDoc = await db.rentalFileDocument.findFirst({
      where: { rentalFileId, type: type as never },
    })

    let document
    if (existingDoc) {
      // Replace existing document
      document = await db.rentalFileDocument.update({
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
      document = await db.rentalFileDocument.create({
        data: {
          rentalFileId,
          type: type as never,
          name,
          url: content || '',
          status: 'PENDING',
        },
      })
    }

    return NextResponse.json({ data: document })
  } catch (error) {
    console.error('Rental file document upload error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/rental-file/documents — Delete a document from a rental file
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

    // Verify the document belongs to a rental file of this user
    const doc = await db.rentalFileDocument.findFirst({
      where: { id: docId },
      include: { rentalFile: { select: { tenantId: true, status: true } } },
    })

    if (!doc || doc.rentalFile.tenantId !== userId) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    if (doc.rentalFile.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Le dossier n\'est plus modifiable' }, { status: 400 })
    }

    await db.rentalFileDocument.delete({ where: { id: docId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Rental file document delete error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
