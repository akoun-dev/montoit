import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// POST /api/mandats/[id]/sign — Sign a mandat
// Owner signing: sets ownerSignedAt, changes status to ACTIVE if both signed, else PENDING_SIGNATURE
// Agency signing: sets agencySignedAt, changes status to ACTIVE if both signed, else PENDING_SIGNATURE
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult
    const { id } = await params

    const mandat = await db.mandat.findUnique({
      where: { id },
    })

    if (!mandat) {
      return NextResponse.json({ error: 'Mandat introuvable' }, { status: 404 })
    }

    // Only DRAFT or PENDING_SIGNATURE can be signed
    if (mandat.status !== 'DRAFT' && mandat.status !== 'PENDING_SIGNATURE') {
      return NextResponse.json(
        { error: 'Ce mandat ne peut plus être signé' },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { role } = body // Optional: 'owner' or 'agency', auto-detected if not provided

    const isOwner = mandat.ownerId === userId
    const isAgency = mandat.agencyId === userId

    if (!isOwner && !isAgency) {
      return NextResponse.json({ error: 'Vous n\'êtes pas partie à ce mandat' }, { status: 403 })
    }

    // Determine which role is signing
    let signingAsOwner = isOwner
    if (role === 'agency' && isAgency) {
      signingAsOwner = false
    } else if (role === 'owner' && isOwner) {
      signingAsOwner = true
    } else if (isOwner && isAgency) {
      // User is both owner and agency (edge case) — default to owner
      signingAsOwner = true
    }

    const now = new Date()

    if (signingAsOwner) {
      if (mandat.ownerSignedAt) {
        return NextResponse.json({ error: 'Le propriétaire a déjà signé ce mandat' }, { status: 400 })
      }

      const bothSigned = mandat.agencySignedAt !== null
      const newStatus = bothSigned ? 'ACTIVE' : 'PENDING_SIGNATURE'

      const updated = await db.mandat.update({
        where: { id },
        data: {
          ownerSignedAt: now,
          status: newStatus,
        },
        include: {
          property: { select: { id: true, title: true, city: true, address: true } },
          agency: { select: { id: true, firstName: true, lastName: true, email: true } },
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      })

      return NextResponse.json({
        mandat: updated,
        signedAs: 'owner',
        bothSigned,
      })
    } else {
      // Agency signing
      if (mandat.agencySignedAt) {
        return NextResponse.json({ error: 'L\'agence a déjà signé ce mandat' }, { status: 400 })
      }

      const bothSigned = mandat.ownerSignedAt !== null
      const newStatus = bothSigned ? 'ACTIVE' : 'PENDING_SIGNATURE'

      const updated = await db.mandat.update({
        where: { id },
        data: {
          agencySignedAt: now,
          status: newStatus,
        },
        include: {
          property: { select: { id: true, title: true, city: true, address: true } },
          agency: { select: { id: true, firstName: true, lastName: true, email: true } },
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      })

      return NextResponse.json({
        mandat: updated,
        signedAs: 'agency',
        bothSigned,
      })
    }
  } catch (error) {
    console.error('Sign mandat error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
