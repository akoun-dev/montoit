import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyPaymentSuccess, notifyPaymentFailed } from '@/lib/notify'
import { getOperatorLabel } from '@/lib/intouch'

// ─── Types ──────────────────────────────────────────────────────────────────────

/**
 * Expected callback payload from Intouch API.
 * The exact shape depends on Intouch documentation; we handle common fields.
 */
interface IntouchCallbackPayload {
  partner_transaction_id?: string
  transactionId?: string
  id?: string
  status?: string
  message?: string
  amount?: number
  recipient_phone_number?: string
  service_id?: string
  error_code?: string
  error_message?: string
  [key: string]: unknown
}

// Intouch status values that indicate success
const SUCCESS_STATUSES = ['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'complete', 'success', '0']
// Intouch status values that indicate failure
const FAILURE_STATUSES = ['FAILED', 'FAILURE', 'REJECTED', 'CANCELLED', 'EXPIRED', 'failed', 'error', '-1', '-2']

// ─── POST /api/payments/callback ────────────────────────────────────────────────
// Receives callback notifications from Intouch after a payment is processed.

export async function POST(req: NextRequest) {
  try {
    // 1. Parse callback body
    const payload: IntouchCallbackPayload = await req.json().catch(() => null)

    if (!payload) {
      console.error('Payment callback: invalid JSON payload')
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    console.log('Payment callback received:', JSON.stringify(payload, null, 2))

    // 2. Identify the payment by partner_transaction_id
    const partnerTransactionId =
      payload.partner_transaction_id ||
      payload.transactionId ||
      payload.id

    if (!partnerTransactionId) {
      console.error('Payment callback: missing transaction identifier')
      return NextResponse.json(
        { error: 'Missing transaction identifier' },
        { status: 400 }
      )
    }

    // 3. Find the payment by operatorTransactionId
    const payment = await db.payment.findFirst({
      where: { operatorTransactionId: String(partnerTransactionId) },
      include: {
        lease: {
          select: {
            ownerId: true,
          },
        },
      },
    })

    if (!payment) {
      console.error('Payment callback: payment not found for transaction:', partnerTransactionId)
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // 4. Skip if payment is already in a final state
    if (payment.status === 'PAID' || payment.status === 'CANCELLED') {
      console.log('Payment callback: payment already in final state:', payment.status)
      return NextResponse.json({ message: 'Payment already processed' })
    }

    // 5. Determine the result from the callback
    const callbackStatus = String(payload.status || '').toUpperCase()
    const isSuccess =
      SUCCESS_STATUSES.includes(callbackStatus) ||
      SUCCESS_STATUSES.includes(String(payload.error_code || ''))

    const isFailure =
      FAILURE_STATUSES.includes(callbackStatus) ||
      FAILURE_STATUSES.includes(String(payload.error_code || '')) ||
      (payload.error_message && !isSuccess)

    const method = payment.method || 'ORANGE_MONEY'
    const methodLabel = getOperatorLabel(method)
    const ownerId = payment.lease.ownerId

    // 6. Update payment based on callback result
    if (isSuccess) {
      // Payment succeeded
      const reference =
        payload.transactionId ||
        payload.id ||
        payload.partner_transaction_id ||
        payment.operatorTransactionId ||
        ''

      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          reference: String(reference),
          paymentOperatorData: payload as Record<string, unknown>,
        },
      })

      // Notify both tenant and owner
      await notifyPaymentSuccess(
        payment.tenantId,
        ownerId,
        payment.amount,
        methodLabel,
        String(reference)
      )

      console.log('Payment callback: payment marked as PAID:', payment.id)
    } else if (isFailure) {
      // Payment failed — revert to PENDING so tenant can retry
      const failureReason = payload.error_message || payload.message || callbackStatus

      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PENDING',
          method: null,
          operatorTransactionId: null,
          operatorPhoneNumber: null,
          paymentOperatorData: payload as Record<string, unknown>,
        },
      })

      // Notify tenant of failure
      await notifyPaymentFailed(
        payment.tenantId,
        payment.amount,
        methodLabel,
        String(failureReason)
      )

      console.log('Payment callback: payment reverted to PENDING:', payment.id, 'Reason:', failureReason)
    } else {
      // Unknown status — just store the callback data but keep PROCESSING
      await db.payment.update({
        where: { id: payment.id },
        data: {
          paymentOperatorData: payload as Record<string, unknown>,
        },
      })

      console.log('Payment callback: unknown status received:', callbackStatus, 'for payment:', payment.id)
    }

    // 7. Always return 200 to acknowledge receipt (Intouch expects this)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Payment callback error:', error)
    // Still return 200 to prevent Intouch from retrying unnecessarily
    return NextResponse.json({ received: true, error: 'Internal processing error' })
  }
}

// Also support GET for Intouch status queries (some integrations use GET callbacks)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const partnerTransactionId = searchParams.get('partner_transaction_id')
  const status = searchParams.get('status')

  if (!partnerTransactionId) {
    return NextResponse.json({ error: 'Missing partner_transaction_id' }, { status: 400 })
  }

  // Reuse the same logic by constructing a payload
  const payload: IntouchCallbackPayload = {
    partner_transaction_id: partnerTransactionId,
    status: status || undefined,
    transactionId: searchParams.get('transactionId') || undefined,
    message: searchParams.get('message') || undefined,
    error_code: searchParams.get('error_code') || undefined,
    error_message: searchParams.get('error_message') || undefined,
  }

  // Convert GET params to a fake Request and call POST logic
  // For simplicity, we process directly here
  const payment = await db.payment.findFirst({
    where: { operatorTransactionId: partnerTransactionId },
    include: {
      lease: { select: { ownerId: true } },
    },
  })

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  }

  if (payment.status === 'PAID' || payment.status === 'CANCELLED') {
    return NextResponse.json({ message: 'Payment already processed' })
  }

  const callbackStatus = String(payload.status || '').toUpperCase()
  const isSuccess = SUCCESS_STATUSES.includes(callbackStatus)
  const isFailure = FAILURE_STATUSES.includes(callbackStatus)
  const method = payment.method || 'ORANGE_MONEY'
  const methodLabel = getOperatorLabel(method)

  if (isSuccess) {
    const reference = payload.transactionId || partnerTransactionId
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        reference: String(reference),
        paymentOperatorData: payload as Record<string, unknown>,
      },
    })
    await notifyPaymentSuccess(payment.tenantId, payment.lease.ownerId, payment.amount, methodLabel, String(reference))
  } else if (isFailure) {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PENDING',
        method: null,
        operatorTransactionId: null,
        operatorPhoneNumber: null,
        paymentOperatorData: payload as Record<string, unknown>,
      },
    })
    await notifyPaymentFailed(payment.tenantId, payment.amount, methodLabel, payload.error_message || undefined)
  }

  return NextResponse.json({ received: true })
}
