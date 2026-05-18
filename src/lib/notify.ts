/**
 * Notification utility for Mon Toit.
 *
 * Creates a notification record in the database AND pushes it in real-time
 * via the WebSocket notification service.
 *
 * Usage (server-side only):
 *   import { notify } from '@/lib/notify'
 *   await notify({ userId: 'abc', type: 'PAYMENT_ALERT', title: 'Rappel', message: 'Loyer en retard' })
 */

import { db } from '@/lib/db'

export interface NotifyParams {
  userId: string
  type: string
  title: string
  message: string
  actionUrl?: string
  entityId?: string
}

export interface NotifyManyParams {
  userIds: string[]
  type: string
  title: string
  message: string
  actionUrl?: string
  entityId?: string
}

/**
 * Push a notification to the WebSocket service (best-effort, non-blocking).
 * The WebSocket service runs on port 3003.
 */
async function pushToWebSocket(userId: string, data: Omit<NotifyParams, 'userId'>) {
  try {
    await fetch('http://localhost:3003/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...data }),
    })
  } catch (e) {
    // WebSocket push is best-effort — don't fail the main operation
    console.error('[notify] WebSocket push failed:', e)
  }
}

/**
 * Push a notification to multiple users via the WebSocket service (best-effort, non-blocking).
 */
async function pushToWebSocketMany(userIds: string[], data: Omit<NotifyManyParams, 'userIds'>) {
  try {
    await fetch('http://localhost:3003/notify-many', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds, ...data }),
    })
  } catch (e) {
    console.error('[notify] WebSocket push-many failed:', e)
  }
}

/**
 * Create a notification for a single user:
 *  1. Persist in the database
 *  2. Push via WebSocket for real-time delivery
 */
export async function notify(params: NotifyParams) {
  const { userId, type, title, message, actionUrl, entityId } = params

  // 1. Persist to database
  const notification = await db.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      actionUrl: actionUrl || null,
      entityId: entityId || null,
    },
  })

  // 2. Push via WebSocket (non-blocking, best-effort)
  pushToWebSocket(userId, { type, title, message, actionUrl, entityId }).catch(() => {})

  return notification
}

/**
 * Create a notification for multiple users:
 *  1. Persist each one in the database
 *  2. Push via WebSocket for real-time delivery
 */
export async function notifyMany(params: NotifyManyParams) {
  const { userIds, type, title, message, actionUrl, entityId } = params

  // 1. Persist all to database
  const notifications = await Promise.all(
    userIds.map((userId) =>
      db.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          actionUrl: actionUrl || null,
          entityId: entityId || null,
        },
      })
    )
  )

  // 2. Push via WebSocket (non-blocking, best-effort)
  pushToWebSocketMany(userIds, { type, title, message, actionUrl, entityId }).catch(() => {})

  return notifications
}

// ─── Payment-specific notification helpers ────────────────────────────────

const fmtAmount = (amount: number) => amount.toLocaleString('fr-FR')

export async function notifyPaymentInitiated(tenantId: string, ownerId: string, amount: number, method: string) {
  await Promise.all([
    notify({
      userId: tenantId,
      type: 'PAYMENT_ALERT',
      title: 'Paiement initié',
      message: `Votre paiement de ${fmtAmount(amount)} FCFA via ${method} a été initié. Vous recevrez une confirmation sous peu.`,
      actionUrl: 'payments',
    }),
    notify({
      userId: ownerId,
      type: 'PAYMENT_ALERT',
      title: 'Paiement en cours',
      message: `Un locataire a initié un paiement de ${fmtAmount(amount)} FCFA via ${method} pour votre bien.`,
      actionUrl: 'payments',
    }),
  ])
}

export async function notifyPaymentSuccess(tenantId: string, ownerId: string, amount: number, method: string, reference: string) {
  await Promise.all([
    notify({
      userId: tenantId,
      type: 'PAYMENT_ALERT',
      title: 'Paiement confirmé ✅',
      message: `Votre paiement de ${fmtAmount(amount)} FCFA via ${method} a été confirmé. Réf: ${reference}`,
      actionUrl: 'payments',
    }),
    notify({
      userId: ownerId,
      type: 'PAYMENT_ALERT',
      title: 'Paiement reçu ✅',
      message: `Vous avez reçu un paiement de ${fmtAmount(amount)} FCFA via ${method}. Réf: ${reference}`,
      actionUrl: 'payments',
    }),
  ])
}

export async function notifyPaymentFailed(tenantId: string, amount: number, method: string, reason?: string) {
  await notify({
    userId: tenantId,
    type: 'PAYMENT_ALERT',
    title: 'Paiement échoué ❌',
    message: `Votre paiement de ${fmtAmount(amount)} FCFA via ${method} a échoué. ${reason || 'Veuillez réessayer.'}`,
    actionUrl: 'payments',
  })
}

export async function notifyLatePayment(tenantId: string, ownerId: string, amount: number, dueDate: string) {
  const dateStr = new Date(dueDate).toLocaleDateString('fr-FR')
  await Promise.all([
    notify({
      userId: tenantId,
      type: 'PAYMENT_ALERT',
      title: 'Paiement en retard ⚠️',
      message: `Votre paiement de ${fmtAmount(amount)} FCFA prévu le ${dateStr} est en retard. Merci de régler rapidement.`,
      actionUrl: 'payments',
    }),
    notify({
      userId: ownerId,
      type: 'PAYMENT_ALERT',
      title: 'Loyer en retard',
      message: `Le loyer de ${fmtAmount(amount)} FCFA dû le ${dateStr} est en retard de paiement.`,
      actionUrl: 'payments',
    }),
  ])
}
