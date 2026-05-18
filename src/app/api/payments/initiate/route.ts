import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { initiateCashin, generatePartnerTransactionId, getOperatorLabel } from '@/lib/intouch'
import { notifyPaymentInitiated, notifyPaymentFailed } from '@/lib/notify'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface InitiatePaymentBody {
  paymentId: string
  method: 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'WAVE'
  phoneNumber: string
}

// ─── POST /api/payments/initiate ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate & authorize
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'LOCATAIRE') {
      return NextResponse.json(
        { error: 'Seuls les locataires peuvent initier un paiement' },
        { status: 403 }
      )
    }

    // 2. Parse and validate request body
    const body: InitiatePaymentBody = await req.json()
    const { paymentId, method, phoneNumber } = body

    if (!paymentId || !method || !phoneNumber) {
      return NextResponse.json(
        { error: 'Champs requis manquants: paymentId, method, phoneNumber' },
        { status: 400 }
      )
    }

    const validMethods = ['ORANGE_MONEY', 'MTN_MOMO', 'MOOV_MONEY', 'WAVE']
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { error: `Méthode de paiement invalide. Méthodes acceptées: ${validMethods.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate phone number format (basic validation for CI numbers)
    const phoneRegex = /^(?:\+225|0)?\d{8,10}$/
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: 'Numéro de téléphone invalide' },
        { status: 400 }
      )
    }

    // 3. Find the payment and verify ownership
    const payment = await db.payment.findFirst({
      where: { id: paymentId, tenantId: userId },
      include: {
        lease: {
          select: {
            id: true,
            ownerId: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            property: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Paiement introuvable' },
        { status: 404 }
      )
    }

    // 4. Validate payment status — only PENDING payments can be initiated
    if (payment.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Ce paiement ne peut pas être initié. Statut actuel: ${payment.status}` },
        { status: 400 }
      )
    }

    // 5. Check for duplicate: if a PROCESSING payment already exists for this, reject
    if (payment.status === 'PROCESSING') {
      return NextResponse.json(
        { error: 'Un paiement est déjà en cours de traitement pour cette échéance' },
        { status: 400 }
      )
    }

    // 6. Get owner info for the recipient phone number
    const owner = payment.lease.owner
    const recipientPhone = owner.phone

    if (!recipientPhone) {
      return NextResponse.json(
        { error: 'Le propriétaire n\'a pas de numéro de téléphone enregistré pour recevoir le paiement' },
        { status: 400 }
      )
    }

    // 7. Generate unique partner_transaction_id
    const partnerTransactionId = generatePartnerTransactionId()

    // 8. Call Intouch CASHIN API
    const cashinResult = await initiateCashin({
      operator: method,
      recipientPhoneNumber: recipientPhone,
      amount: payment.amount,
      partnerTransactionId,
    })

    if (!cashinResult.success) {
      // Payment initiation failed — notify tenant
      await notifyPaymentFailed(userId, payment.amount, method, cashinResult.error)

      return NextResponse.json(
        {
          error: 'Échec de l\'initiation du paiement',
          details: cashinResult.error,
        },
        { status: 502 }
      )
    }

    // 9. Update payment status to PROCESSING and store operator data
    const operatorData = cashinResult.data || cashinResult.raw
    const operatorRaw = cashinResult.data as Record<string, unknown> | null
    const operatorTransactionId =
      (operatorRaw?.transactionId as string) ||
      (operatorRaw?.id as string) ||
      partnerTransactionId

    const updatedPayment = await db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PROCESSING',
        method,
        operatorTransactionId,
        operatorPhoneNumber: phoneNumber,
        paymentOperatorData: operatorData as Record<string, unknown>,
      },
    })

    // 10. Send notifications to both tenant and owner
    const methodLabel = getOperatorLabel(method)
    await notifyPaymentInitiated(userId, owner.id, payment.amount, methodLabel)

    // 11. Return the transaction details
    return NextResponse.json({
      data: {
        paymentId: updatedPayment.id,
        status: updatedPayment.status,
        method: updatedPayment.method,
        partnerTransactionId,
        operatorTransactionId,
        amount: updatedPayment.amount,
        operator: methodLabel,
        message: 'Paiement initié avec succès. Vous recevrez une confirmation sous peu.',
      },
    })
  } catch (error) {
    console.error('Payment initiate error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'initiation du paiement' },
      { status: 500 }
    )
  }
}
