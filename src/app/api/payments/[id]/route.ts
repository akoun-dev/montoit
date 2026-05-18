import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/payments/[id] — Get a single payment detail
// LOCATAIRE sees their own payments; PROPRIETAIRE sees payments for their properties; AGENCE sees payments for their mandat properties
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'LOCATAIRE' && effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params

    // Build the where clause based on role with proper Prisma typing
    let where: Prisma.PaymentWhereInput
    if (effectiveRole === 'PROPRIETAIRE') {
      where = { id, lease: { ownerId: userId } }
    } else if (effectiveRole === 'AGENCE') {
      where = {
        id,
        lease: {
          property: {
            mandats: {
              some: { agencyId: userId, status: 'ACTIVE' }
            }
          }
        }
      }
    } else {
      where = { id, tenantId: userId }
    }

    const payment = await db.payment.findFirst({
      where,
      include: {
        lease: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            monthlyRent: true,
            charges: true,
            deposit: true,
            specialConditions: true,
            ownerSignedAt: true,
            tenantSignedAt: true,
            status: true,
            property: {
              select: {
                id: true,
                title: true,
                address: true,
                city: true,
                images: {
                  orderBy: { order: 'asc' },
                  take: 1,
                  select: { url: true },
                },
              },
            },
            owner: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 })
    }

    return NextResponse.json({ data: payment })
  } catch (error) {
    console.error('Payment detail GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT /api/payments/[id] — Update payment (owner can mark as received / confirm)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    // Only PROPRIETAIRE can update payment status (confirm receipt)
    if (effectiveRole !== 'PROPRIETAIRE') {
      return NextResponse.json(
        { error: 'Seuls les propriétaires peuvent confirmer la réception d\'un paiement' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { action } = body as { action?: string }

    // Find the payment belonging to the owner's property
    const payment = await db.payment.findFirst({
      where: { id, lease: { ownerId: userId } },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 })
    }

    // Handle different actions
    if (action === 'confirm_receipt') {
      // Owner confirms they received the payment
      if (payment.status !== 'PAID' && payment.status !== 'PROCESSING') {
        return NextResponse.json(
          { error: `Impossible de confirmer un paiement avec le statut: ${payment.status}` },
          { status: 400 }
        )
      }

      // Payment is already confirmed by the system — owner acknowledgment
      const updatedPayment = await db.payment.update({
        where: { id },
        data: {
          paymentOperatorData: {
            ...(payment.paymentOperatorData as Record<string, unknown> || {}),
            ownerConfirmedAt: new Date().toISOString(),
            ownerConfirmedBy: userId,
          },
        },
      })

      return NextResponse.json({
        data: updatedPayment,
        message: 'Réception du paiement confirmée',
      })
    }

    return NextResponse.json(
      { error: 'Action non reconnue. Actions disponibles: confirm_receipt' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Payment PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
