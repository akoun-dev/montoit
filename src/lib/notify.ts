import { getSupabaseAdminClient } from '@/lib/supabase/admin'

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

function makeId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function notify(params: NotifyParams) {
  const { userId, type, title, message, actionUrl, entityId } = params

  const admin = getSupabaseAdminClient()
  const { data: notification, error } = await admin
    .from('notifications')
    .insert({
      id: makeId(),
      user_id: userId,
      type,
      title,
      message,
      action_url: actionUrl || null,
      entity_id: entityId || null,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return notification ? mapNotification(notification) : null
}

export async function notifyMany(params: NotifyManyParams) {
  const { userIds, type, title, message, actionUrl, entityId } = params

  const admin = getSupabaseAdminClient()
  const rows = userIds.map((userId) => ({
    id: makeId(),
    user_id: userId,
    type,
    title,
    message,
    action_url: actionUrl || null,
    entity_id: entityId || null,
  }))

  const { data: notifications, error } = await admin
    .from('notifications')
    .insert(rows)
    .select()

  if (error) {
    throw error
  }

  return (notifications ?? []).map(mapNotification)
}

type NotifRow = {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  action_url: string | null
  entity_id: string | null
  created_at: string
  user_id: string
}

function mapNotification(n: NotifRow) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    isRead: n.is_read,
    actionUrl: n.action_url,
    entityId: n.entity_id,
    createdAt: n.created_at,
    userId: n.user_id,
  }
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

// ─── Visit-specific notification helpers ───────────────────────────────────

export async function notifyNewVisitRequest(ownerId: string, tenantName: string, propertyTitle: string, visitId: string) {
  await notify({
    userId: ownerId,
    type: 'VISIT_REMINDER',
    title: 'Nouvelle demande de visite',
    message: `${tenantName} souhaite visiter "${propertyTitle}".`,
    actionUrl: 'visit-requests',
    entityId: visitId,
  })
}

export async function notifyVisitStatusUpdate(tenantId: string, status: string, propertyTitle: string, visitId: string) {
  const statusLabels: Record<string, string> = {
    ACCEPTED: 'acceptée',
    REJECTED: 'refusée',
    COUNTER_PROPOSED: 'contre-proposée',
    CANCELLED: 'annulée',
  }
  await notify({
    userId: tenantId,
    type: 'VISIT_REMINDER',
    title: 'Demande de visite ' + (statusLabels[status] || 'mise à jour'),
    message: `Votre visite pour "${propertyTitle}" a été ${statusLabels[status] || 'mise à jour'}.`,
    actionUrl: 'my-visits',
    entityId: visitId,
  })
}

// ─── Lease-specific notification helpers ────────────────────────────────────

export async function notifyNewLease(tenantId: string, propertyTitle: string, leaseId: string) {
  await notify({
    userId: tenantId,
    type: 'LEASE_UPDATE',
    title: 'Nouveau bail en attente de signature',
    message: `Un nouveau bail pour "${propertyTitle}" a été créé. Veuillez le consulter pour le signer.`,
    actionUrl: 'my-leases',
    entityId: leaseId,
  })
}

export async function notifyLeaseSigned(recipientId: string, signerName: string, propertyTitle: string, leaseId: string, bothSigned: boolean) {
  await notify({
    userId: recipientId,
    type: 'LEASE_UPDATE',
    title: bothSigned ? 'Bail signé et activé ✅' : 'Bail signé',
    message: bothSigned
      ? `Le bail pour "${propertyTitle}" est maintenant actif. Les deux parties ont signé.`
      : `${signerName} a signé le bail pour "${propertyTitle}".`,
    actionUrl: 'my-leases',
    entityId: leaseId,
  })
}

export async function notifyLeaseActivated(tenantId: string, ownerId: string, propertyTitle: string, leaseId: string) {
  await Promise.all([
    notify({
      userId: tenantId,
      type: 'LEASE_UPDATE',
      title: 'Bail activé ✅',
      message: `Le bail pour "${propertyTitle}" est maintenant actif. Les deux parties ont signé électroniquement.`,
      actionUrl: 'my-leases',
      entityId: leaseId,
    }),
    notify({
      userId: ownerId,
      type: 'LEASE_UPDATE',
      title: 'Bail activé ✅',
      message: `Le bail pour "${propertyTitle}" est maintenant actif. Les deux parties ont signé électroniquement.`,
      actionUrl: 'my-leases',
      entityId: leaseId,
    }),
  ])
}

// ─── Rental file-specific notification helpers ──────────────────────────────

export async function notifyRentalFileValidated(tenantId: string, propertyTitle: string, fileId: string) {
  await notify({
    userId: tenantId,
    type: 'DOSSIER_UPDATE',
    title: 'Dossier validé ✅',
    message: `Votre dossier locatif pour "${propertyTitle}" a été validé par le Tiers de Confiance.`,
    actionUrl: 'rental-file',
    entityId: fileId,
  })
}

export async function notifyRentalFileRejected(tenantId: string, reason: string, fileId: string) {
  await notify({
    userId: tenantId,
    type: 'DOSSIER_UPDATE',
    title: 'Dossier rejeté ❌',
    message: `Votre dossier locatif a été rejeté. Raison : ${reason}`,
    actionUrl: 'rental-file',
    entityId: fileId,
  })
}

// ─── Maintenance-specific notification helpers ──────────────────────────────

export async function notifyNewMaintenanceRequest(ownerId: string, tenantName: string, propertyTitle: string, requestTitle: string, requestId: string) {
  await notify({
    userId: ownerId,
    type: 'MAINTENANCE',
    title: 'Nouvelle demande de maintenance 🔧',
    message: `${tenantName} a soumis une demande pour "${propertyTitle}": ${requestTitle}`,
    actionUrl: 'maintenance',
    entityId: requestId,
  })
}

export async function notifyMaintenanceUpdate(tenantId: string, requestTitle: string, status: string, requestId: string) {
  const statusLabels: Record<string, string> = {
    IN_PROGRESS: 'en cours',
    RESOLVED: 'résolue',
    CLOSED: 'clôturée',
  }
  await notify({
    userId: tenantId,
    type: 'MAINTENANCE',
    title: 'Mise à jour de votre demande de maintenance',
    message: `Votre demande "${requestTitle}" est maintenant ${statusLabels[status] || 'mise à jour'}.`,
    actionUrl: 'maintenance',
    entityId: requestId,
  })
}

// ─── Message-specific notification helper ───────────────────────────────────

export async function notifyNewMessage(recipientId: string, senderName: string, conversationId: string) {
  await notify({
    userId: recipientId,
    type: 'MESSAGE',
    title: 'Nouveau message',
    message: `${senderName} vous a envoyé un message`,
    actionUrl: 'messages',
    entityId: conversationId,
  })
}

// ─── Dispute notification helpers ──────────────────────────────────────────

export async function notifyDisputeUpdate(reportedById: string, disputeId: string, status: string, comment?: string) {
  const statusLabels: Record<string, string> = {
    OPEN: 'réouvert',
    IN_REVIEW: 'en cours de traitement',
    RESOLVED: 'résolu',
    CLOSED: 'clôturé',
  }
  await notify({
    userId: reportedById,
    type: 'DISPUTE_UPDATE',
    title: 'Mise à jour de votre litige',
    message: `Votre litige a été ${statusLabels[status] || 'mis à jour'}.${comment ? ` Commentaire : ${comment}` : ''}`,
    actionUrl: 'litiges',
    entityId: disputeId,
  })
}

export async function notifyDisputeEscalated(reportedById: string, disputeId: string, reason?: string) {
  await notify({
    userId: reportedById,
    type: 'DISPUTE_UPDATE',
    title: 'Litige escaladé ⚠️',
    message: `Votre litige a été escaladé.${reason ? ` Raison : ${reason}` : ''}`,
    actionUrl: 'litiges',
    entityId: disputeId,
  })
}

// ─── Application notification helper ────────────────────────────────────────

export async function notifyNewApplication(ownerId: string, tenantName: string, propertyTitle: string, applicationId: string) {
  await notify({
    userId: ownerId,
    type: 'APPLICATION',
    title: 'Nouvelle candidature',
    message: `${tenantName} a postulé pour "${propertyTitle}".`,
    actionUrl: 'rental-files',
    entityId: applicationId,
  })
}

// ─── Review notification helper ─────────────────────────────────────────────

export async function notifyNewReview(toUserId: string, fromUserName: string, propertyTitle: string, rating: number, reviewId: string) {
  await notify({
    userId: toUserId,
    type: 'REVIEW',
    title: 'Nouvel avis',
    message: `${fromUserName} a laissé un avis (${rating}/5) sur "${propertyTitle}".`,
    actionUrl: 'reviews',
    entityId: reviewId,
  })
}

// ─── Mission assigned notification ──────────────────────────────────────────

export async function notifyMissionAssigned(agentTcId: string, missionType: string, propertyTitle: string, missionId: string) {
  const typeLabels: Record<string, string> = {
    PROPERTY_VERIFICATION: 'Vérification de propriété',
    INVENTORY_REPORT: 'État des lieux',
  }
  await notify({
    userId: agentTcId,
    type: 'MISSION_ASSIGNED',
    title: 'Nouvelle mission assignée',
    message: `Vous avez été assigné à une mission de ${typeLabels[missionType] || missionType} pour "${propertyTitle}".`,
    actionUrl: 'missions',
    entityId: missionId,
  })
}

// ─── Certification notification ─────────────────────────────────────────────

export async function notifyCertificationGranted(userId: string, certType: string, certId: string) {
  await notify({
    userId,
    type: 'CERTIFICATION',
    title: 'Certification accordée ✅',
    message: `Votre certification de type "${certType}" a été accordée.`,
    actionUrl: 'certifications',
    entityId: certId,
  })
}

// ─── Fraud alert notification ───────────────────────────────────────────────

export async function notifyFraudAlert(tcId: string, suspectName: string, alertId: string) {
  await notify({
    userId: tcId,
    type: 'FRAUD_ALERT',
    title: 'Alerte de fraude 🚨',
    message: `Une alerte de fraude a été signalée concernant ${suspectName}.`,
    actionUrl: 'fraud-alerts',
    entityId: alertId,
  })
}

// ─── New property notification (for admin moderation) ───────────────────────

export async function notifyNewPropertyForModeration(adminId: string, propertyTitle: string, ownerName: string, propertyId: string) {
  await notify({
    userId: adminId,
    type: 'PROPERTY_VERIFICATION',
    title: 'Nouveau bien à vérifier',
    message: `Le bien "${propertyTitle}" publié par ${ownerName} nécessite une vérification.`,
    actionUrl: 'properties-moderation',
    entityId: propertyId,
  })
}

// ─── Mandat notification ────────────────────────────────────────────────────

export async function notifyMandatStatusUpdate(ownerId: string, status: string, propertyTitle: string, mandatId: string) {
  const statusLabels: Record<string, string> = {
    PENDING_SIGNATURE: 'en attente de signature',
    ACTIVE: 'actif',
    TERMINATED: 'terminé',
    EXPIRED: 'expiré',
  }
  await notify({
    userId: ownerId,
    type: 'LEASE_UPDATE',
    title: 'Mise à jour de mandat',
    message: `Le mandat pour "${propertyTitle}" est maintenant ${statusLabels[status] || status}.`,
    actionUrl: 'mandats',
    entityId: mandatId,
  })
}

export async function notifyMandatSigned(
  userId: string,
  signedByLabel: string,
  propertyTitle: string,
  mandatId: string,
  bothSigned: boolean
) {
  await notify({
    userId,
    type: 'LEASE_UPDATE',
    title: bothSigned ? 'Mandat signé et activé' : 'Mandat signé',
    message: bothSigned
      ? `Le mandat pour "${propertyTitle}" est maintenant actif. Les deux parties ont signé.`
      : `${signedByLabel} a signé le mandat pour "${propertyTitle}". En attente de votre signature.`,
    actionUrl: 'mandats',
    entityId: mandatId,
  })
}

export async function notifyMandatActivated(
  ownerId: string,
  agencyId: string,
  propertyTitle: string,
  mandatId: string
) {
  await notify({
    userId: ownerId,
    type: 'LEASE_UPDATE',
    title: 'Mandat activé',
    message: `Le mandat pour "${propertyTitle}" est maintenant actif.`,
    actionUrl: 'mandats',
    entityId: mandatId,
  })
  await notify({
    userId: agencyId,
    type: 'LEASE_UPDATE',
    title: 'Mandat activé',
    message: `Le mandat pour "${propertyTitle}" est maintenant actif.`,
    actionUrl: 'mandats',
    entityId: mandatId,
  })
}

// ─── Owner file review notification ─────────────────────────────────────────

export async function notifyOwnerFileValidated(ownerId: string, fileId: string) {
  await notify({
    userId: ownerId,
    type: 'DOSSIER_UPDATE',
    title: 'Dossier propriétaire validé ✅',
    message: 'Votre dossier propriétaire a été validé par le Tiers de Confiance.',
    actionUrl: 'owner-file',
    entityId: fileId,
  })
}

export async function notifyOwnerFileRejected(ownerId: string, reason: string, fileId: string) {
  await notify({
    userId: ownerId,
    type: 'DOSSIER_UPDATE',
    title: 'Dossier propriétaire rejeté ❌',
    message: `Votre dossier propriétaire a été rejeté. Raison : ${reason}`,
    actionUrl: 'owner-file',
    entityId: fileId,
  })
}

// ─── Security alert notification ────────────────────────────────────────────

export async function notifySecurityAlert(userId: string, title: string, message: string) {
  await notify({
    userId,
    type: 'SECURITY',
    title,
    message,
  })
}
